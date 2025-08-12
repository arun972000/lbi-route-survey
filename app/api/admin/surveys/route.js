// File: app/api/admin/surveys/route.ts (GET all)
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.execute(`SELECT * FROM survey_reports ORDER BY created_at DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching surveys:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}