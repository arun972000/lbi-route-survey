// app/api/admin/upload-survey/route.js
import { NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import s3Client from "@/lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Config
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isWordFile(f) {
  if (!f) return false;
  const name = f.name?.toLowerCase() || "";
  const extOk = name.endsWith(".doc") || name.endsWith(".docx");
  const typeOk = ALLOWED_MIME.has(f.type);
  return extOk || typeOk;
}

async function uploadToS3(file, folder) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) throw new Error("Missing AWS_S3_BUCKET_NAME");

  const ext = path.extname(file.name) || ".docx";
  const key = `uploads/lbi/survey-reports/${folder}/${uuidv4()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    })
  );

  // Return the key you can store in DB (or construct a CDN URL if you prefer)
  return key;
}

function safeJson(str, fallback) {
  try {
    return JSON.parse(str ?? "");
  } catch {
    return fallback;
  }
}

function buildKeywords({ startKeyword, endKeyword, routePath }) {
  const tokens = [
    ...(startKeyword || "").split(","),
    ...(endKeyword || "").split(","),
    ...(Array.isArray(routePath) ? routePath : []),
  ]
    .map((k) => (k || "").toString().trim().toLowerCase())
    .filter(Boolean);

  // Make unique and join
  return Array.from(new Set(tokens)).join(", ");
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    // Basic fields
    const title = formData.get("title") || "";

    // Keyword inputs & helpers
    const startKeyword = formData.get("startKeyword") || "";
    const endKeyword = formData.get("endKeyword") || "";
    const routePath = safeJson(formData.get("routePath"), []);
    const routeKeywordsPreview = formData.get("routeKeywordsPreview"); // optional (from frontend preview)

    // Content lists
    const points = safeJson(formData.get("points"), []); // [{text, category}]
    const pricingRows = safeJson(formData.get("pricingRows"), []); // [{height,length,width,weight,pricePerKm}]

    // Files (now two)
    const summaryReport = formData.get("summaryReport");
    const detailedReport = formData.get("detailedReport");

    // Validate files (optional but recommended)
    let summaryPath = null;
    let detailedPath = null;

    if (summaryReport) {
      if (!isWordFile(summaryReport)) {
        return NextResponse.json({ error: "Summary report must be .doc/.docx" }, { status: 400 });
      }
      if (summaryReport.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "Summary report exceeds 10MB" }, { status: 400 });
      }
      summaryPath = await uploadToS3(summaryReport, "summary");
    }

    if (detailedReport) {
      if (!isWordFile(detailedReport)) {
        return NextResponse.json({ error: "Detailed report must be .doc/.docx" }, { status: 400 });
      }
      if (detailedReport.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "Detailed report exceeds 10MB" }, { status: 400 });
      }
      detailedPath = await uploadToS3(detailedReport, "detailed");
    }

    // Build keywords (prefer the live preview from UI if present)
    const route_keywords =
      (routeKeywordsPreview || "").toString().trim() ||
      buildKeywords({ startKeyword, endKeyword, routePath });

    // Insert survey_reports row
    const [result] = await db.execute(
      `
      INSERT INTO survey_reports 
        (title, summary_file_path, detailed_file_path, start_keyword, end_keyword, route_keywords)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [title, summaryPath, detailedPath, startKeyword, endKeyword, route_keywords]
    );

    const surveyId = result.insertId;

    // Insert constraints/points
    if (Array.isArray(points)) {
      for (const p of points) {
        const txt = (p?.text || "").toString().trim();
        const cat = (p?.category || "A").toString().trim().toUpperCase();
        if (!txt) continue;
        await db.execute(
          `INSERT INTO survey_constraints (survey_id, point, category) VALUES (?, ?, ?)`,
          [surveyId, txt, ["A", "B", "C"].includes(cat) ? cat : "A"]
        );
      }
    }

    // Insert pricing
    if (Array.isArray(pricingRows)) {
      for (const row of pricingRows) {
        const { height, length, width, weight, pricePerKm } = row || {};
        const price = parseFloat(pricePerKm);
        if (!Number.isFinite(price)) continue;
        await db.execute(
          `INSERT INTO survey_pricing (survey_id, height, length, width, weight, price_per_km)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [surveyId, height || "", length || "", width || "", weight || "", price]
        );
      }
    }

    return NextResponse.json({ message: "Survey uploaded successfully", survey_id: surveyId }, { status: 200 });
  } catch (err) {
    console.error("Error uploading survey:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
