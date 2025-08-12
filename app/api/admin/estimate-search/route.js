// app/api/admin/estimate-search/route.js
import { NextResponse } from "next/server";
import db from "@/lib/db";
import axios from "axios";

/* ----------------- Config / Aliases ----------------- */
const CITY_ALIASES = {
  mumbai: ["mumbai", "bombay"],
  chennai: ["chennai", "madras"],
  bengaluru: ["bengaluru", "bangalore"],
  kolkata: ["kolkata", "calcutta"],
  delhi: ["delhi", "new delhi", "ncr"],
  puducherry: ["puducherry", "pondicherry"],
  coimbatore: ["coimbatore", "kovai"],
  tiruchirappalli: ["tiruchirappalli", "trichy"],
  thiruvananthapuram: ["thiruvananthapuram", "trivandrum"],

  // Karnataka + Goa useful alternates
  mysuru: ["mysuru", "mysore"],
  mangaluru: ["mangaluru", "mangalore"],
  belagavi: ["belagavi", "belgaum"],
  shivamogga: ["shivamogga", "shimoga"],
  ballari: ["ballari", "bellary"],
  tumakuru: ["tumakuru", "tumkur"],

  // Goa cities
  panaji: ["panaji", "panjim", "ponje"],
  madgaon: ["madgaon", "margao"],
  vasco: ["vasco da gama", "vasco"],
  mapusa: ["mapusa", "mapuca"],
  canacona: ["canacona", "cancona"],
};

const DISTRICT_ALIASES = {
  tiruchirappalli: ["tiruchirappalli", "trichy"],
  kanyakumari: ["kanyakumari", "kanniyakumari", "cape comorin"],
  thane: ["thane"],
};

/** State-level canonical cities to bridge state-only queries to city-based rows. */
const STATE_CANONICAL_CITIES = {
  goa: ["panaji", "madgaon", "margao", "vasco da gama", "mapusa", "ponda", "canacona"],
  karnataka: [
    "bengaluru", "bangalore",
    "mysuru", "mysore",
    "mangaluru", "mangalore",
    "hubballi", "hubli", "dharwad",
    "belagavi", "belgaum",
    "shivamogga", "shimoga",
    "ballari", "bellary",
    "tumakuru", "tumkur",
  ],
  "tamil nadu": ["chennai", "madras", "coimbatore", "kovai", "tiruchirappalli", "trichy", "madurai", "salem"],
  maharashtra: ["mumbai", "bombay", "thane", "pune", "nagpur", "nashik"],
  kerala: ["thiruvananthapuram", "trivandrum", "kochi", "ernakulam", "kozhikode", "calicut"],
  telangana: ["hyderabad", "warangal", "karimnagar"],
  "andhra pradesh": ["visakhapatnam", "vishakhapatnam", "vijayawada", "tirupati", "guntur"],
  "west bengal": ["kolkata", "calcutta", "siliguri", "durgapur"],
  delhi: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida", "ghaziabad", "faridabad"],
};

/* ----------------- Utils ----------------- */
const lc = (s) => (s || "").toString().trim().toLowerCase();
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
const strip = (s) => lc(s).replace(/[()&.]/g, "").replace(/\s+/g, " ").trim();

/* ----------------- Address parsing ----------------- */
function extractAdmin(components = []) {
  const hasType = (c, type) => (c.types || []).includes(type);
  const getOne = (type) =>
    components.find((c) => hasType(c, type))?.long_name || "";

  const getManyStartsWith = (prefix) =>
    components
      .filter((c) => (c.types || []).some((t) => t.startsWith(prefix)))
      .map((c) => c.long_name);

  const sublocalities = [
    ...getManyStartsWith("sublocality_level_1"),
    ...getManyStartsWith("sublocality_level_2"),
    ...getManyStartsWith("sublocality_level_3"),
    ...getManyStartsWith("sublocality"),
    ...getManyStartsWith("neighborhood"),
  ];

  const city =
    getOne("locality") ||
    getOne("postal_town") ||
    getOne("administrative_area_level_3") ||
    getOne("administrative_area_level_2");

  const district = getOne("administrative_area_level_2");
  const state = getOne("administrative_area_level_1");
  const country = getOne("country");
  const country_code =
    components.find((c) => hasType(c, "country"))?.short_name || "";

  return { sublocalities, city, district, state, country, country_code };
}

async function normalizePlace({ text, place_id }, mapsApiKey) {
  // Prefer Place Details when place_id given
  if (place_id) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      place_id
    )}&fields=formatted_address,geometry,address_components,name,types&key=${mapsApiKey}`;
    const r = await axios.get(url);
    const res = r?.data?.result;
    if (res) {
      const admin = extractAdmin(res.address_components || []);
      const loc = res.geometry?.location || {};
      return {
        label: res.formatted_address || text || "",
        name: res.name || "",
        admin,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
      };
    }
  }

  // Fallback geocode by text
  if (text) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      text
    )}&key=${mapsApiKey}`;
    const r = await axios.get(url);
    const res = r?.data?.results?.[0];
    if (res) {
      const admin = extractAdmin(res.address_components || []);
      const loc = res.geometry?.location || {};
      return {
        label: res.formatted_address || text || "",
        name: res.name || "",
        admin,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
      };
    }
  }

  return {
    label: text || "",
    name: "",
    admin: { sublocalities: [], city: "", district: "", state: "", country: "" },
    lat: null,
    lng: null,
  };
}

/* ----------------- Keyword builders ----------------- */
function cityWithAliases(city) {
  const c = strip(city);
  if (!c) return [];
  for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.includes(c) || key === c) {
      return uniq([c, ...aliases]);
    }
  }
  return [c];
}

function districtWithAliases(district) {
  const d = strip(district);
  if (!d) return [];
  for (const [key, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (aliases.includes(d) || key === d) {
      return uniq([d, ...aliases]);
    }
  }
  return [d];
}

function stateCanonicalCities(state) {
  const s = strip(state);
  if (!s) return [];
  const base = STATE_CANONICAL_CITIES[s] || [];
  const expanded = base.flatMap((city) => cityWithAliases(city));
  return uniq([...base, ...expanded]);
}

/** Rich keywords: sublocalities + city(+aliases) + district(+aliases) + state + stateCities + country + tokens */
function buildRichKeywords(place) {
  const label = strip(place?.label || place?.name || "");
  const subs = (place?.admin?.sublocalities || []).map(strip).filter(Boolean);
  const city = strip(place?.admin?.city);
  const district = strip(place?.admin?.district);
  const state = strip(place?.admin?.state);
  const country = strip(place?.admin?.country);

  const tokens = uniq([
    label,
    ...label.split(/[,\-]/g).map(strip),
    ...subs,
    ...cityWithAliases(city),
    ...districtWithAliases(district),
    state,
    ...stateCanonicalCities(state), // bridges state-only inputs to city rows
    country,
  ]).filter((t) => t && t.length >= 3);

  return tokens;
}

/** City-core: city(+aliases) & district(+aliases); if none, use state's canonical cities. */
function buildCityCoreKeywords(place) {
  const city = strip(place?.admin?.city);
  const district = strip(place?.admin?.district);
  const state = strip(place?.admin?.state);
  let core = uniq([...cityWithAliases(city), ...districtWithAliases(district)]);
  if (!core.length) core = stateCanonicalCities(state);
  return core.filter((t) => t && t.length >= 3);
}

/* ----------------- SQL helpers ----------------- */
function buildKeywordWhere(startKeywords, endKeywords) {
  const startConds = startKeywords.map(() => `LOWER(route_keywords) LIKE ?`).join(" OR ");
  const endConds = endKeywords.map(() => `LOWER(route_keywords) LIKE ?`).join(" OR ");
  const where = `(${startConds}) AND (${endConds})`;
  const params = [
    ...startKeywords.map((k) => `%${k}%`),
    ...endKeywords.map((k) => `%${k}%`),
  ];
  return { where, params };
}

function buildLikeGroup(column, keywords) {
  if (!keywords?.length) return { clause: "1=0", params: [] };
  const ors = keywords.map(() => `LOWER(${column}) LIKE ?`).join(" OR ");
  return { clause: `(${ors})`, params: keywords.map((k) => `%${k}%`) };
}

function hitCount(haystack, needles) {
  const s = (haystack || "").toLowerCase();
  let c = 0;
  for (const n of needles || []) {
    if (!n) continue;
    if (s.includes(n.toLowerCase())) c += 1;
  }
  return c;
}

function parseNumberMaybe(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function fetchDistanceKm({ startLabel, endLabel, start, end }, mapsApiKey) {
  const origin = start?.lat != null && start?.lng != null ? `${start.lat},${start.lng}` : startLabel;
  const dest   = end?.lat   != null && end?.lng   != null ? `${end.lat},${end.lng}`   : endLabel;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    origin
  )}&destinations=${encodeURIComponent(dest)}&key=${mapsApiKey}`;
  const r = await axios.get(url);
  const meters = r?.data?.rows?.[0]?.elements?.[0]?.distance?.value || 0;
  return Math.ceil(meters / 1000);
}

/* ----------------- Handler ----------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // Inputs (string & place_id both supported)
    const startRaw = searchParams.get("start") || "";
    const endRaw = searchParams.get("end") || "";
    const startPlaceId = searchParams.get("start_place_id");
    const endPlaceId = searchParams.get("end_place_id");

    const heightStr = searchParams.get("height");
    const lengthStr = searchParams.get("length");
    const widthStr  = searchParams.get("width");
    const weightStr = searchParams.get("weight");

    const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const startNorm = await normalizePlace({ text: startRaw, place_id: startPlaceId }, mapsApiKey);
    const endNorm   = await normalizePlace({ text: endRaw,   place_id: endPlaceId },   mapsApiKey);

    // Build keywords
    const startRich = buildRichKeywords(startNorm);
    const endRich   = buildRichKeywords(endNorm);
    const startCore = buildCityCoreKeywords(startNorm);
    const endCore   = buildCityCoreKeywords(endNorm);

    let surveyRows = [];
    let reversedUsed = false;

    // A1) strict: start/end columns + RICH
    {
      const a = buildLikeGroup("start_keyword", startRich);
      const b = buildLikeGroup("end_keyword",   endRich);
      const sql = `SELECT * FROM survey_reports WHERE ${a.clause} AND ${b.clause} ORDER BY id DESC LIMIT 10`;
      const [rows] = await db.execute(sql, [...a.params, ...b.params]);
      if (rows?.length) surveyRows = rows;
    }
    // A2) route_keywords forward + RICH
    if (!surveyRows.length && startRich.length && endRich.length) {
      const { where, params } = buildKeywordWhere(startRich, endRich);
      const [rows] = await db.execute(`SELECT * FROM survey_reports WHERE ${where} ORDER BY id DESC LIMIT 10`, params);
      if (rows?.length) surveyRows = rows;
    }
    // B1) reversed columns + RICH
    if (!surveyRows.length) {
      const a = buildLikeGroup("start_keyword", endRich);
      const b = buildLikeGroup("end_keyword",   startRich);
      const sql = `SELECT * FROM survey_reports WHERE ${a.clause} AND ${b.clause} ORDER BY id DESC LIMIT 10`;
      const [rows] = await db.execute(sql, [...a.params, ...b.params]);
      if (rows?.length) { surveyRows = rows; reversedUsed = true; }
    }
    // B2) route_keywords reversed + RICH
    if (!surveyRows.length && startRich.length && endRich.length) {
      const { where, params } = buildKeywordWhere(endRich, startRich);
      const [rows] = await db.execute(`SELECT * FROM survey_reports WHERE ${where} ORDER BY id DESC LIMIT 10`, params);
      if (rows?.length) { surveyRows = rows; reversedUsed = true; }
    }
    // C1) relaxed: start/end columns + CORE (city/district) / state cities
    if (!surveyRows.length && startCore.length && endCore.length) {
      const a = buildLikeGroup("start_keyword", startCore);
      const b = buildLikeGroup("end_keyword",   endCore);
      const sql = `SELECT * FROM survey_reports WHERE ${a.clause} AND ${b.clause} ORDER BY id DESC LIMIT 10`;
      const [rows] = await db.execute(sql, [...a.params, ...b.params]);
      if (rows?.length) surveyRows = rows;
    }
    // C2) route_keywords forward + CORE
    if (!surveyRows.length && startCore.length && endCore.length) {
      const { where, params } = buildKeywordWhere(startCore, endCore);
      const [rows] = await db.execute(`SELECT * FROM survey_reports WHERE ${where} ORDER BY id DESC LIMIT 10`, params);
      if (rows?.length) surveyRows = rows;
    }
    // D1) reversed columns + CORE
    if (!surveyRows.length && startCore.length && endCore.length) {
      const a = buildLikeGroup("start_keyword", endCore);
      const b = buildLikeGroup("end_keyword",   startCore);
      const sql = `SELECT * FROM survey_reports WHERE ${a.clause} AND ${b.clause} ORDER BY id DESC LIMIT 10`;
      const [rows] = await db.execute(sql, [...a.params, ...b.params]);
      if (rows?.length) { surveyRows = rows; reversedUsed = true; }
    }
    // D2) route_keywords reversed + CORE
    if (!surveyRows.length && startCore.length && endCore.length) {
      const { where, params } = buildKeywordWhere(endCore, startCore);
      const [rows] = await db.execute(`SELECT * FROM survey_reports WHERE ${where} ORDER BY id DESC LIMIT 10`, params);
      if (rows?.length) { surveyRows = rows; reversedUsed = true; }
    }

    if (!surveyRows.length) {
      return NextResponse.json({ message: "No matching route found." }, { status: 404 });
    }

    // Rank candidates
    const startCityName = (startNorm.admin.city || startNorm.label || startRaw).toLowerCase();
    const endCityName   = (endNorm.admin.city   || endNorm.label   || endRaw).toLowerCase();
    surveyRows.sort((a, b) => {
      const aStartHits = hitCount(a.start_keyword, startRich);
      const aEndHits   = hitCount(a.end_keyword,   endRich);
      const bStartHits = hitCount(b.start_keyword, startRich);
      const bEndHits   = hitCount(b.end_keyword,   endRich);

      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      const aDirBonus = aTitle.includes(`${startCityName} to ${endCityName}`) ? 2 : 0;
      const bDirBonus = bTitle.includes(`${startCityName} to ${endCityName}`) ? 2 : 0;

      const aScore = aStartHits + aEndHits + aDirBonus;
      const bScore = bStartHits + bEndHits + bDirBonus;

      if (bScore !== aScore) return bScore - aScore;
      return (b.id || 0) - (a.id || 0);
    });

    const survey = surveyRows[0];

    /* -------- Pricing lookup -------- */
    const height = parseNumberMaybe(heightStr);
    const length = parseNumberMaybe(lengthStr);
    const width  = parseNumberMaybe(widthStr);
    const weight = parseNumberMaybe(weightStr);

    const [pricingExactRows] = await db.execute(
      `SELECT * FROM survey_pricing
       WHERE survey_id = ?
         AND height = ?
         AND length = ?
         AND width  = ?
         AND weight = ?
       LIMIT 1`,
      [survey.id, heightStr, lengthStr, widthStr, weightStr]
    );

    let pricing = pricingExactRows?.[0];

    // nearest numeric fallback (requires MySQL 8 for REGEXP_REPLACE)
    if (!pricing && [height, length, width, weight].some((n) => n != null)) {
      const [nearestRows] = await db.execute(
        `SELECT *,
           (ABS(COALESCE(height_num, 0) - ?) +
            ABS(COALESCE(length_num, 0) - ?) +
            ABS(COALESCE(width_num,  0) - ?) +
            ABS(COALESCE(weight_num, 0) - ?)
           ) AS score
         FROM (
           SELECT sp.*,
             CAST(NULLIF(REGEXP_REPLACE(sp.height, '[^0-9.]', ''), '') AS DECIMAL(10,2)) AS height_num,
             CAST(NULLIF(REGEXP_REPLACE(sp.length, '[^0-9.]', ''), '') AS DECIMAL(10,2)) AS length_num,
             CAST(NULLIF(REGEXP_REPLACE(sp.width,  '[^0-9.]', ''), '') AS DECIMAL(10,2)) AS width_num,
             CAST(NULLIF(REGEXP_REPLACE(sp.weight, '[^0-9.]', ''), '') AS DECIMAL(10,2)) AS weight_num
           FROM survey_pricing sp
           WHERE sp.survey_id = ?
         ) t
         ORDER BY score ASC
         LIMIT 1`,
        [height ?? 0, length ?? 0, width ?? 0, weight ?? 0, survey.id]
      );
      pricing = nearestRows?.[0];
    }

    if (!pricing) {
      return NextResponse.json({ message: "No matching pricing found." }, { status: 404 });
    }

    /* -------- Distance + Cost -------- */
    const distanceKm = await fetchDistanceKm(
      {
        startLabel: startNorm.label || startRaw,
        endLabel:   endNorm.label   || endRaw,
        start: { lat: startNorm.lat, lng: startNorm.lng },
        end:   { lat: endNorm.lat,   lng: endNorm.lng },
      },
      mapsApiKey
    );

    const pricePerKm = parseFloat(pricing.price_per_km || 0);
    const estimatedCost = Math.ceil(distanceKm * (Number.isFinite(pricePerKm) ? pricePerKm : 0));

    /* -------- Response -------- */
    return NextResponse.json({
      start: { input: startRaw, normalized: startNorm, keywords: startRich, core: startCore },
      end:   { input: endRaw,   normalized: endNorm,   keywords: endRich,  core: endCore   },
      reversed_route_used: reversedUsed,
      distance_km: distanceKm,
      estimated_cost: estimatedCost,
      pricing,
      survey,
      summary: `${startNorm.label || startRaw} to ${endNorm.label || endRaw} estimated cost is ₹${estimatedCost.toLocaleString()}`,
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
