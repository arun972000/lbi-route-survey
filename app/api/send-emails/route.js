import { sendBulkEmails } from "@/lib/awsEmailClient";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    await sendBulkEmails(body.recipients, body.subject, body.message);
    return NextResponse.json("email sent");
  } catch(err) {
    console.log(err);
    return NextResponse.json("internal server error", { status: 500 });
  }
}
