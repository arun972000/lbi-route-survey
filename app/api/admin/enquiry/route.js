// import { NextResponse } from "next/server";
// import db from "@/lib/db"; // Your database instance
// import { sendBulkEmails } from "@/lib/awsEmailClient";

// export async function POST(req) {
//   try {
//     const body = await req.json();

//     const {
//       startLocation,
//       endLocation,
//       email,
//       phone,
//       length,
//       width,
//       height,
//       weight,
//     } = body;

//     await db.execute(
//       `
//       INSERT INTO transport_enquiries 
//       (start_location, end_location, email, phone, length, width, height, weight)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `,
//       [
//         startLocation,
//         endLocation,
//         email,
//         phone,
//         length,
//         width,
//         height,
//         weight,
//       ]
//     );

//     const subject = `Enquiry for survey route: ${startLocation} to ${endLocation}`;

//     const message = `
//       <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
//         <h2 style="color: #0f172a;">New Transport Enquiry</h2>
//         <p>A new transport enquiry has been submitted with the following details:</p>

//         <h3>Customer Info</h3>
//         <ul>
//           <li><strong>Email:</strong> ${email}</li>
//           <li><strong>Phone:</strong> ${phone}</li>
//         </ul>

//         <h3>Route Details</h3>
//         <ul>
//           <li><strong>Start Location:</strong> ${startLocation}</li>
//           <li><strong>End Location:</strong> ${endLocation}</li>
//         </ul>

//         <h3>Truck Dimensions</h3>
//         <ul>
//           <li><strong>Length:</strong> ${length}</li>
//           <li><strong>Width:</strong> ${width}</li>
//           <li><strong>Height:</strong> ${height}</li>
//           <li><strong>Weight:</strong> ${weight}</li>
//         </ul>

//         <p style="margin-top: 20px;">This is an automated notification from the ODC Estimate system.</p>
//       </div>
//     `;

//     await sendBulkEmails([
//       "arunpandian972000@gmail.com"
//     ], subject, message);

//     return NextResponse.json({ message: "Enquiry submitted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("Enquiry submission error:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }


// app/api/admin/enquiry/route.js
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendBulkEmails } from "@/lib/awsEmailClient";

// Helpers
const isValidEmail = (e) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidIndianMobile = (p) => !!p && /^[6-9]\d{9}$/.test(p);

function summarizePlace(p) {
  if (!p) return null;
  const parts = [];
  if (p.admin?.city) parts.push(p.admin.city);
  if (p.admin?.state) parts.push(p.admin.state);
  if (p.admin?.country) parts.push(p.admin.country);
  const label = p.formatted_address || parts.filter(Boolean).join(", ");
  return {
    label,
    city: p.admin?.city || "",
    state: p.admin?.state || "",
    country: p.admin?.country || "",
    place_id: p.place_id || "",
    lat: p.location?.lat ?? null,
    lng: p.location?.lng ?? null,
  };
}

function coalesce(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    return v;
  }
  return undefined;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Structured (new) fields
    const route = body.route || {};
    const truck = body.truck || {};
    const contact = body.contact || {};

    // Legacy fields (still supported)
    const legacyStart = body.startLocation;
    const legacyEnd = body.endLocation;
    const legacyEmail = body.email;
    const legacyPhone = body.phone;
    const legacyLen = body.length;
    const legacyWid = body.width;
    const legacyHt = body.height;
    const legacyWt = body.weight;

    // Build canonical values
    const fromSummary = summarizePlace(route.from);
    const toSummary = summarizePlace(route.to);

    const startLocation =
      coalesce(fromSummary?.label, fromSummary?.city, legacyStart) || "";
    const endLocation =
      coalesce(toSummary?.label, toSummary?.city, legacyEnd) || "";

    const email = coalesce(contact.email, legacyEmail) || "";
    const phone = coalesce(contact.phone, legacyPhone) || "";

    const length = coalesce(truck.length_label, legacyLen) || "";
    const width = coalesce(truck.width_label, legacyWid) || "";
    const height = coalesce(truck.height_label, legacyHt) || "";
    const weight = coalesce(truck.weight_label, legacyWt) || "";

    // Validate
    const missing = [];
    if (!startLocation) missing.push("startLocation");
    if (!endLocation) missing.push("endLocation");
    if (!email) missing.push("email");
    if (!phone) missing.push("phone");
    if (!length) missing.push("length");
    if (!width) missing.push("width");
    if (!height) missing.push("height");
    if (!weight) missing.push("weight");
    if (!isValidEmail(email)) missing.push("valid email");
    // if (!isValidIndianMobile(phone)) missing.push("valid phone (India)");

    if (missing.length) {
      return NextResponse.json(
        { error: `Missing/invalid: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Persist to existing columns
    await db.execute(
      `
        INSERT INTO transport_enquiries 
        (start_location, end_location, email, phone, length, width, height, weight)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [startLocation, endLocation, email, phone, length, width, height, weight]
    );

    // Build email
    const subject = `Enquiry for survey route: ${startLocation} → ${endLocation}`;

    const fromBlock = fromSummary
      ? `
        <ul>
          <li><strong>Label:</strong> ${fromSummary.label}</li>
          <li><strong>City/State:</strong> ${fromSummary.city || "-"} / ${fromSummary.state || "-"}</li>
          <li><strong>Country:</strong> ${fromSummary.country || "-"}</li>
          <li><strong>Place ID:</strong> ${fromSummary.place_id || "-"}</li>
          <li><strong>Coords:</strong> ${fromSummary.lat ?? "-"}, ${fromSummary.lng ?? "-"}</li>
        </ul>`
      : `<p>${startLocation}</p>`;

    const toBlock = toSummary
      ? `
        <ul>
          <li><strong>Label:</strong> ${toSummary.label}</li>
          <li><strong>City/State:</strong> ${toSummary.city || "-"} / ${toSummary.state || "-"}</li>
          <li><strong>Country:</strong> ${toSummary.country || "-"}</li>
          <li><strong>Place ID:</strong> ${toSummary.place_id || "-"}</li>
          <li><strong>Coords:</strong> ${toSummary.lat ?? "-"}, ${toSummary.lng ?? "-"}</li>
        </ul>`
      : `<p>${endLocation}</p>`;

    const truckBlock = `
      <ul>
        <li><strong>Length:</strong> ${length}</li>
        <li><strong>Width:</strong> ${width}</li>
        <li><strong>Height:</strong> ${height}</li>
        <li><strong>Weight:</strong> ${weight}</li>
        ${truck.volume_m3 != null ? `<li><strong>Approx Volume:</strong> ${truck.volume_m3} m³</li>` : ""}
        ${truck.class ? `<li><strong>Truck Class:</strong> ${truck.class}</li>` : ""}
      </ul>
    `;

    const message = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <h2 style="color: #0f172a;">New Transport Enquiry</h2>
        <p>A new transport enquiry has been submitted with the following details:</p>

        <h3>Customer Info</h3>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
        </ul>

        <h3>Route — From</h3>
        ${fromBlock}

        <h3>Route — To</h3>
        ${toBlock}

        <h3>Truck Dimensions</h3>
        ${truckBlock}

        <p style="margin-top: 20px;">This is an automated notification from the ODC Estimate system.</p>
      </div>
    `;

    await sendBulkEmails(
      ["arunpandian972000@gmail.com"],
      subject,
      message
    );

    return NextResponse.json(
      { message: "Enquiry submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Enquiry submission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
