// pages/api/admin/enquiries.js
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const email = searchParams.get("email") || '';
    const start = searchParams.get("start") || '';
    const end = searchParams.get("end") || '';
    const date = searchParams.get("date") || '';

    let query = `SELECT * FROM transport_enquiries WHERE 1=1`;
    const values = [];

    if (email) {
      query += ` AND email LIKE ?`;
      values.push(`%${email}%`);
    }

    if (start) {
      query += ` AND start_location LIKE ?`;
      values.push(`%${start}%`);
    }

    if (end) {
      query += ` AND end_location LIKE ?`;
      values.push(`%${end}%`);
    }

    if (date) {
      query += ` AND DATE(created_at) = ?`;
      values.push(date);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(query, values);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Failed to fetch enquiries:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
