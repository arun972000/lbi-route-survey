// app/api/admin/surveys/[id]/route.js
import { NextResponse } from "next/server";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import s3Client from "@/lib/s3Client";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ---------- helpers ----------
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const isWordFile = (f) => {
  if (!f) return false;
  const name = (f.name || "").toLowerCase();
  const extOk = name.endsWith(".doc") || name.endsWith(".docx");
  return extOk || ALLOWED_MIME.has(f.type);
};

async function uploadToS3(file, folder) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error("Missing AWS_S3_BUCKET_NAME");
  const ext = path.extname(file.name) || ".docx";
  const key = `uploads/lbi/survey-reports/${folder}/${uuidv4()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    })
  );
  return key;
}

async function deleteFromS3(key) {
  if (!key) return;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    // Soft-fail: don't block API if delete fails
    console.warn("S3 delete failed:", e?.message || e);
  }
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
  return Array.from(new Set(tokens)).join(", ");
}

// ---------- GET ----------
export async function GET(req, { params }) {
  try {
    const surveyId = params.id;

    const [survey] = await db.execute(
      `SELECT * FROM survey_reports WHERE id = ?`,
      [surveyId]
    );
    const [points] = await db.execute(
      `SELECT point, category FROM survey_constraints WHERE survey_id = ?`,
      [surveyId]
    );
    const [pricing] = await db.execute(
      `SELECT height, length, width, weight, price_per_km FROM survey_pricing WHERE survey_id = ?`,
      [surveyId]
    );

    return NextResponse.json({
      ...(survey[0] || {}),
      constraints: points,
      pricing: pricing,
    });
  } catch (err) {
    console.error("Error fetching survey:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ---------- PUT ----------
export async function PUT(req, { params }) {
  try {
    const formData = await req.formData();
    const surveyId = params.id;

    const title = formData.get("title") || "";
    const startKeyword = formData.get("startKeyword") || "";
    const endKeyword = formData.get("endKeyword") || "";
    const points = safeJson(formData.get("points"), []);
    const pricingRows = safeJson(formData.get("pricingRows"), []);

    // NEW from edit UI
    const routePath = safeJson(formData.get("routePath"), []);
    const routeKeywordsPreview = formData.get("routeKeywordsPreview") || "";

    // Files (NEW)
    const summaryReport = formData.get("summaryReport");
    const detailedReport = formData.get("detailedReport");

    // Fetch existing file paths so we can decide whether to overwrite / delete
    const [existingRows] = await db.execute(
      `SELECT summary_file_path, detailed_file_path FROM survey_reports WHERE id = ?`,
      [surveyId]
    );
    const existing = existingRows?.[0] || {};
    let summaryPath = existing.summary_file_path || null;
    let detailedPath = existing.detailed_file_path || null;

    // Upload if new files present
    if (summaryReport) {
      if (!isWordFile(summaryReport)) {
        return NextResponse.json(
          { error: "Summary report must be .doc/.docx" },
          { status: 400 }
        );
      }
      if (summaryReport.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Summary report exceeds 10MB" },
          { status: 400 }
        );
      }
      // Optionally delete old file before replacing
      if (summaryPath) await deleteFromS3(summaryPath);
      summaryPath = await uploadToS3(summaryReport, "summary");
    }

    if (detailedReport) {
      if (!isWordFile(detailedReport)) {
        return NextResponse.json(
          { error: "Detailed report must be .doc/.docx" },
          { status: 400 }
        );
      }
      if (detailedReport.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Detailed report exceeds 10MB" },
          { status: 400 }
        );
      }
      if (detailedPath) await deleteFromS3(detailedPath);
      detailedPath = await uploadToS3(detailedReport, "detailed");
    }

    // Build keywords (prefer preview from UI)
    const route_keywords =
      routeKeywordsPreview.trim() ||
      buildKeywords({ startKeyword, endKeyword, routePath });

    // Update base survey row
    await db.execute(
      `
      UPDATE survey_reports
      SET title = ?, start_keyword = ?, end_keyword = ?, route_keywords = ?,
          summary_file_path = ?, detailed_file_path = ?
      WHERE id = ?
    `,
      [title, startKeyword, endKeyword, route_keywords, summaryPath, detailedPath, surveyId]
    );

    // Replace constraints
    await db.execute(`DELETE FROM survey_constraints WHERE survey_id = ?`, [surveyId]);
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

    // Replace pricing
    await db.execute(`DELETE FROM survey_pricing WHERE survey_id = ?`, [surveyId]);
    if (Array.isArray(pricingRows)) {
      for (const row of pricingRows) {
        const price = parseFloat(row.price_per_km ?? row.pricePerKm);
        if (!Number.isFinite(price)) continue;
        await db.execute(
          `INSERT INTO survey_pricing (survey_id, height, length, width, weight, price_per_km)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [surveyId, row.height || "", row.length || "", row.width || "", row.weight || "", price]
        );
      }
    }

    return NextResponse.json({ message: "Survey updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error updating survey:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(req, { params }) {
  try {
    const surveyId = params.id;

    // Grab file paths to clean up S3
    const [rows] = await db.execute(
      `SELECT summary_file_path, detailed_file_path FROM survey_reports WHERE id = ?`,
      [surveyId]
    );
    const survey = rows?.[0];

    // Delete child rows first (if no ON DELETE CASCADE)
    await db.execute(`DELETE FROM survey_constraints WHERE survey_id = ?`, [surveyId]);
    await db.execute(`DELETE FROM survey_pricing WHERE survey_id = ?`, [surveyId]);

    // Delete survey
    await db.execute(`DELETE FROM survey_reports WHERE id = ?`, [surveyId]);

    // Best‑effort delete of S3 files
    if (survey) {
      await deleteFromS3(survey.summary_file_path);
      await deleteFromS3(survey.detailed_file_path);
    }

    return NextResponse.json({ message: "Survey deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting survey:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
