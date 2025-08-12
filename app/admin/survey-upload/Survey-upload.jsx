// Survey-upload.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CITY_ALIASES = {
  mumbai: ["Mumbai", "Bombay"],
  chennai: ["Chennai", "Madras"],
  bengaluru: ["Bengaluru", "Bangalore"],
  kolkata: ["Kolkata", "Calcutta"],
  delhi: ["Delhi", "New Delhi", "NCR"],
  puducherry: ["Puducherry", "Pondicherry"],
  coimbatore: ["Coimbatore", "Kovai"],
  tiruchirappalli: ["Tiruchirappalli", "Trichy"],
  thiruvananthapuram: ["Thiruvananthapuram", "Trivandrum"],
};

const heightOptions = ["less than 4m", "4 - 4.5m", "4.5 - 5m", "5.5 - 6m", "6 - 6.5m", "6.5 - 7.5m", ">7.5m"];
const lengthOptions = ["12m", "12-15m", "15-18m", "18-25m", "25-30m", "30-40m", "40-60m", "60-80m", ">80m"];
const widthOptions  = ["3m", "3-4m", "4-5m", "5-6m", "6-7m", "7-8m", ">8m"];
const weightOptions = ["<50 tons", "50 - 100 tons", "100 - 200 tons", "200 - 300 tons", "300 - 400 tons", "400 - 500 tons", ">500 tons"];

export default function AdminSurveyUploadForm() {
  const [title, setTitle] = useState("");
  const [summaryReport, setSummaryReport] = useState(null);   // NEW: Summary Word file
  const [detailedReport, setDetailedReport] = useState(null); // NEW: Detailed Word file

  const [points, setPoints] = useState([{ text: "", category: "A" }]);

  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [startKeyword, setStartKeyword] = useState("");
  const [endKeyword, setEndKeyword] = useState("");

  const [routePath, setRoutePath] = useState([""]);
  const [pricingRows, setPricingRows] = useState([{ height: "", length: "", width: "", weight: "", pricePerKm: "" }]);

  // drag & drop refs (optional nicety)
  const drop1 = useRef(null);
  const drop2 = useRef(null);

  // helpers
  const lc = (s) => (s || "").trim().toLowerCase();
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const tokenise = (s) =>
    (s || "")
      .split(/[,\-;|/]+/g)
      .map((t) => t.trim())
      .filter(Boolean);
  const aliasSet = (cityStr) => {
    const key = lc(cityStr);
    const hit = Object.values(CITY_ALIASES).find((list) => list.map(lc).includes(key));
    return hit ? hit : cityStr ? [cityStr] : [];
  };

  // Live route_keywords preview
  const routeKeywordsPreview = useMemo(() => {
    const startTokens = uniq([...aliasSet(startCity), ...tokenise(startKeyword)]);
    const endTokens   = uniq([...aliasSet(endCity), ...tokenise(endKeyword)]);
    const pathTokens  = uniq(routePath.flatMap((p) => tokenise(p)));
    return uniq([...startTokens, ...endTokens, ...pathTokens]).join(", ");
  }, [startCity, endCity, startKeyword, endKeyword, routePath]);

  // file checks
  const isWord = (f) => f && (f.name.endsWith(".doc") || f.name.endsWith(".docx"));
  const sizeOk = (f) => !f || f.size <= 10 * 1024 * 1024; // 10MB

  const handleFileSet = (file, setter) => {
    if (!file) return setter(null);
    if (!isWord(file)) {
      alert("Only .doc or .docx files are allowed");
      return;
    }
    if (!sizeOk(file)) {
      alert("File must be <= 10MB");
      return;
    }
    setter(file);
  };

  // drag n drop wiring
  useEffect(() => {
    const wire = (ref, setter) => {
      const el = ref.current;
      if (!el) return () => {};
      const stop = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      const enter = (e) => {
        stop(e);
        el.classList.add("ring-2", "ring-blue-400");
      };
      const leave = (e) => {
        stop(e);
        el.classList.remove("ring-2", "ring-blue-400");
      };
      const drop = (e) => {
        stop(e);
        el.classList.remove("ring-2", "ring-blue-400");
        const f = e.dataTransfer?.files?.[0];
        handleFileSet(f, setter);
      };
      ["dragenter", "dragover"].forEach((ev) => el.addEventListener(ev, enter));
      ["dragleave", "dragend"].forEach((ev) => el.addEventListener(ev, leave));
      el.addEventListener("drop", drop);
      return () => {
        ["dragenter", "dragover"].forEach((ev) => el.removeEventListener(ev, enter));
        ["dragleave", "dragend"].forEach((ev) => el.removeEventListener(ev, leave));
        el.removeEventListener("drop", drop);
      };
    };
    const off1 = wire(drop1, setSummaryReport);
    const off2 = wire(drop2, setDetailedReport);
    return () => {
      off1 && off1();
      off2 && off2();
    };
  }, []);

  // controls
  const removePointField = (index) => setPoints(points.filter((_, i) => i !== index));
  const handlePointChange = (index, value) => {
    const copy = [...points];
    copy[index].text = value;
    setPoints(copy);
  };
  const handleCategoryChange = (index, value) => {
    const copy = [...points];
    copy[index].category = value;
    setPoints(copy);
  };
  const addPointField = () => setPoints([...points, { text: "", category: "A" }]);

  const handleRoutePathChange = (index, value) => {
    const updated = [...routePath];
    updated[index] = value;
    setRoutePath(updated);
  };
  const addRoutePath = () => setRoutePath([...routePath, ""]);
  const removeRoutePath = (index) => setRoutePath(routePath.filter((_, i) => i !== index));

  const handlePricingRowChange = (index, field, value) => {
    const updated = [...pricingRows];
    updated[index][field] = value;
    setPricingRows(updated);
  };
  const addPricingRow = () =>
    setPricingRows([...pricingRows, { height: "", length: "", width: "", weight: "", pricePerKm: "" }]);
  const removePricingRow = (idx) => setPricingRows(pricingRows.filter((_, i) => i !== idx));

  const generateStartKeywords = () => {
    const key = startCity.trim();
    const withAliases = aliasSet(key).join(", ");
    setStartKeyword((prev) => (prev ? `${prev}, ${withAliases}` : withAliases));
  };
  const generateEndKeywords = () => {
    const key = endCity.trim();
    const withAliases = aliasSet(key).join(", ");
    setEndKeyword((prev) => (prev ? `${prev}, ${withAliases}` : withAliases));
  };

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return alert("Title is required");

    const formData = new FormData();
    formData.append("title", title);

    // two Word files
    if (summaryReport) formData.append("summaryReport", summaryReport);
    if (detailedReport) formData.append("detailedReport", detailedReport);

    // content
    formData.append("points", JSON.stringify(points));
    formData.append("startKeyword", startKeyword);
    formData.append("endKeyword", endKeyword);
    formData.append("routePath", JSON.stringify(routePath));
    formData.append("pricingRows", JSON.stringify(pricingRows));

    // send computed preview so backend can store route_keywords easily
    formData.append("routeKeywordsPreview", routeKeywordsPreview);

    const res = await fetch("/api/admin/upload-survey", { method: "POST", body: formData });
    if (res.ok) alert("Uploaded successfully");
    else alert("Upload failed");
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-8 space-y-8 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800">Survey Report Upload</h1>

      {/* Title */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Survey Title</label>
        <p className="text-xs text-gray-500 mb-2">
          Enter a human‑friendly title. Example: <em>Mumbai to Sriperumbudur Route</em>.
        </p>
        <input
          type="text"
          placeholder="e.g., Mumbai to Sriperumbudur Route"
          className="w-full p-2 border border-gray-300 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Files */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded border border-gray-200">
          <label className="block text-lg font-semibold text-gray-700 mb-1">Summary Report (.doc/.docx)</label>
          <p className="text-xs text-gray-500 mb-3">
            High‑level overview (2–5 pages): route summary, major constraints, recommended timings. Max 10MB.
          </p>
          <div ref={drop1} className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            <input
              type="file"
              accept=".doc,.docx"
              onChange={(e) => handleFileSet(e.target.files?.[0] || null, setSummaryReport)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-2">Drag & drop here or click to choose.</p>
            {summaryReport && <p className="mt-2 text-sm text-green-700">Selected: {summaryReport.name}</p>}
          </div>
        </div>

        <div className="p-6 bg-white rounded border border-gray-200">
          <label className="block text-lg font-semibold text-gray-700 mb-1">Detailed Report (.doc/.docx)</label>
          <p className="text-xs text-gray-500 mb-3">
            Full report including photos, exact clearances, bridge IDs, and permissions. Max 10MB.
          </p>
          <div ref={drop2} className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            <input
              type="file"
              accept=".doc,.docx"
              onChange={(e) => handleFileSet(e.target.files?.[0] || null, setDetailedReport)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-2">Drag & drop here or click to choose.</p>
            {detailedReport && <p className="mt-2 text-sm text-green-700">Selected: {detailedReport.name}</p>}
          </div>
        </div>
      </div>

      {/* Constraints points */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Main Constraints of the Survey Routes</label>
        <p className="text-xs text-gray-500 mb-3">
          Add bullet points like low bridges, narrow turns, night‑only passages. Category:
          <span className="font-semibold"> A</span> (critical), <span className="font-semibold">B</span> (moderate),
          <span className="font-semibold"> C</span> (minor).
        </p>
        <div className="space-y-3">
          {points.map((point, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-center gap-4">
              <input
                type="text"
                placeholder={`Point ${idx + 1}`}
                className="flex-1 p-2 border border-gray-300 rounded w-full"
                value={point.text}
                onChange={(e) => handlePointChange(idx, e.target.value)}
              />
              <select
                value={point.category}
                onChange={(e) => handleCategoryChange(idx, e.target.value)}
                className={`p-2 rounded border text-white font-semibold w-24 ${
                  point.category === "A" ? "bg-red-500" : point.category === "B" ? "bg-yellow-500" : "bg-green-500"
                }`}
              >
                <option value="A" className="text-black">A</option>
                <option value="B" className="text-black">B</option>
                <option value="C" className="text-black">C</option>
              </select>
              <button type="button" onClick={() => removePointField(idx)} className="text-sm text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addPointField} className="mt-3 text-blue-600 hover:underline text-sm font-medium">
          + Add another point
        </button>
      </div>

      {/* Keywords */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-2">Location Keywords</label>
        <p className="text-xs text-gray-500 mb-4">
          <strong>How to enter:</strong> comma‑separated tokens. Include city names, old names (aliases), and localities. <br/>
          Example for Chennai: <code>Chennai, Madras, Perambur, Ambattur</code>. For Mumbai: <code>Mumbai, Bombay, Andheri, Bhiwandi</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Start City</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={startCity}
              onChange={(e) => setStartCity(e.target.value)}
              placeholder="e.g., Chennai"
            />
            <button type="button" onClick={generateStartKeywords} className="text-sm text-blue-600 hover:underline mt-1">
              Add common aliases for Start
            </button>
            <textarea
              className="w-full mt-2 p-2 border border-gray-300 rounded text-sm"
              rows={2}
              value={startKeyword}
              onChange={(e) => setStartKeyword(e.target.value)}
              placeholder="Start keywords (comma separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">End City</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={endCity}
              onChange={(e) => setEndCity(e.target.value)}
              placeholder="e.g., Mumbai"
            />
            <button type="button" onClick={generateEndKeywords} className="text-sm text-blue-600 hover:underline mt-1">
              Add common aliases for End
            </button>
            <textarea
              className="w-full mt-2 p-2 border border-gray-300 rounded text-sm"
              rows={2}
              value={endKeyword}
              onChange={(e) => setEndKeyword(e.target.value)}
              placeholder="End keywords (comma separated)"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <div className="font-semibold mb-1">Live route keywords preview (will be saved):</div>
          <div className="text-gray-700 break-words">{routeKeywordsPreview || "—"}</div>
        </div>
      </div>

      {/* Route path */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Route Path (Intermediate Locations)</label>
        <p className="text-xs text-gray-500 mb-3">Add key waypoints or districts in travel order (e.g., Hubli, Tumkur).</p>
        {routePath.map((loc, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              type="text"
              value={loc}
              onChange={(e) => handleRoutePathChange(idx, e.target.value)}
              placeholder="e.g., Hubli"
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button type="button" onClick={() => removeRoutePath(idx)} className="text-red-500 text-sm">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addRoutePath} className="text-blue-600 hover:underline text-sm font-medium">
          + Add Location
        </button>
      </div>

      {/* Pricing */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Truck Cargo Dimensions Based Price (₹/km)</label>
        <p className="text-xs text-gray-500 mb-3">Choose a range for each dimension. Keep units consistent (m/tons).</p>
        {pricingRows.map((row, idx) => (
          <div key={idx} className="grid md:grid-cols-6 gap-4 mb-4 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Height</label>
              <select value={row.height} onChange={(e) => handlePricingRowChange(idx, "height", e.target.value)} className="w-full border rounded p-2">
                <option value="">Select</option>
                {heightOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Length</label>
              <select value={row.length} onChange={(e) => handlePricingRowChange(idx, "length", e.target.value)} className="w-full border rounded p-2">
                <option value="">Select</option>
                {lengthOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Width</label>
              <select value={row.width} onChange={(e) => handlePricingRowChange(idx, "width", e.target.value)} className="w-full border rounded p-2">
                <option value="">Select</option>
                {widthOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Weight</label>
              <select value={row.weight} onChange={(e) => handlePricingRowChange(idx, "weight", e.target.value)} className="w-full border rounded p-2">
                <option value="">Select</option>
                {weightOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">₹/km</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                className="w-full p-2 border rounded"
                value={row.pricePerKm}
                onChange={(e) => handlePricingRowChange(idx, "pricePerKm", e.target.value)}
              />
            </div>
            <div className="flex items-center">
              <button type="button" onClick={() => removePricingRow(idx)} className="text-red-500 text-xs">
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addPricingRow} className="text-blue-600 hover:underline text-sm font-medium">
          + Add another dimension rule
        </button>
      </div>

      {/* Submit */}
      <div className="text-center">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow-md transition duration-200">
          Submit Survey Data
        </button>
      </div>
    </form>
  );
}
