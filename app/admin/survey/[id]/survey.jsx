'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const CITY_ALIASES = {
  mumbai: ['Mumbai', 'Bombay'],
  chennai: ['Chennai', 'Madras'],
  bengaluru: ['Bengaluru', 'Bangalore'],
  kolkata: ['Kolkata', 'Calcutta'],
  delhi: ['Delhi', 'New Delhi', 'NCR'],
  puducherry: ['Puducherry', 'Pondicherry'],
  coimbatore: ['Coimbatore', 'Kovai'],
  tiruchirappalli: ['Tiruchirappalli', 'Trichy'],
  thiruvananthapuram: ['Thiruvananthapuram', 'Trivandrum'],
};

const heightOptions = ['less than 4m', '4 - 4.5m', '4.5 - 5m', '5.5 - 6m', '6 - 6.5m', '6.5 - 7.5m', '>7.5m'];
const lengthOptions = ['12m', '12-15m', '15-18m', '18-25m', '25-30m', '30-40m', '40-60m', '60-80m', '>80m'];
const widthOptions  = ['3m', '3-4m', '4-5m', '5-6m', '6-7m', '7-8m', '>8m'];
const weightOptions = ['<50 tons', '50 - 100 tons', '100 - 200 tons', '200 - 300 tons', '300 - 400 tons', '400 - 500 tons', '>500 tons'];

const lc = (s) => (s || '').trim().toLowerCase();
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
const tokenise = (s) =>
  (s || '')
    .split(/[,\-;|/]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

const aliasSet = (cityStr) => {
  const key = lc(cityStr);
  const hit = Object.values(CITY_ALIASES).find((list) => list.map(lc).includes(key));
  return hit ? hit : cityStr ? [cityStr] : [];
};

export default function EditSurveyForm() {
  const { id } = useParams();
  const router = useRouter();

  // Base
  const [title, setTitle] = useState('');

  // Files: NEW two file inputs + existing paths
  const [summaryReport, setSummaryReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [existingSummaryPath, setExistingSummaryPath] = useState('');
  const [existingDetailedPath, setExistingDetailedPath] = useState('');

  // Constraints
  const [points, setPoints] = useState([{ text: '', category: 'A' }]);

  // Keywords + helpers
  const [startKeyword, setStartKeyword] = useState('');
  const [endKeyword, setEndKeyword] = useState('');
  const [startCity, setStartCity] = useState(''); // helper for alias button (not stored as-is)
  const [endCity, setEndCity] = useState('');     // helper for alias button

  // Route path (intermediate locations) + preview
  const [routePath, setRoutePath] = useState(['']);
  const routeKeywordsPreview = useMemo(() => {
    const startTokens = uniq([...aliasSet(startCity), ...tokenise(startKeyword)]);
    const endTokens   = uniq([...aliasSet(endCity),   ...tokenise(endKeyword)]);
    const pathTokens  = uniq(routePath.flatMap((p) => tokenise(p)));
    return uniq([...startTokens, ...endTokens, ...pathTokens]).join(', ');
  }, [startCity, endCity, startKeyword, endKeyword, routePath]);

  // Pricing
  const [pricingRows, setPricingRows] = useState([
    { height: '', length: '', width: '', weight: '', price_per_km: '' },
  ]);

  // File drag&drop (optional nicety)
  const drop1 = useRef(null);
  const drop2 = useRef(null);

  // ======== Prefill from API ========
  useEffect(() => {
    const fetchSurvey = async () => {
      const res = await fetch(`/api/admin/surveys/${id}`);
      const data = await res.json();

      setTitle(data.title || '');
      setStartKeyword(data.start_keyword || '');
      setEndKeyword(data.end_keyword || '');
      setPoints(
        data.constraints?.map((c) => ({ text: c.point, category: c.category })) || [{ text: '', category: 'A' }]
      );
      setPricingRows(
        data.pricing?.length
          ? data.pricing.map((p) => ({
              height: p.height || '',
              length: p.length || '',
              width:  p.width  || '',
              weight: p.weight || '',
              price_per_km: p.price_per_km || '',
            }))
          : [{ height: '', length: '', width: '', weight: '', price_per_km: '' }]
      );

      // Existing file paths (new columns)
      setExistingSummaryPath(data.summary_file_path || '');
      setExistingDetailedPath(data.detailed_file_path || '');

      // Best-effort route path from route_keywords (if your GET returns it)
      const rk = (data.route_keywords || '').trim();
      if (rk) {
        // Show only tokens that are not already in start/end keyword lists
        const startSet = new Set(tokenise(data.start_keyword));
        const endSet   = new Set(tokenise(data.end_keyword));
        const guessPath = tokenise(rk).filter((t) => !startSet.has(t) && !endSet.has(t));
        setRoutePath(guessPath.length ? guessPath : ['']);
      } else {
        setRoutePath(['']);
      }

      // Optional: prefill helper cities from first tokens of start/end
      const sTokens = tokenise(data.start_keyword);
      const eTokens = tokenise(data.end_keyword);
      setStartCity(sTokens[0] || '');
      setEndCity(eTokens[0] || '');
    };
    fetchSurvey();
  }, [id]);

  // ======== Helpers: DnD + file validation ========
  const isWord = (f) => f && (f.name?.toLowerCase().endsWith('.doc') || f.name?.toLowerCase().endsWith('.docx'));
  const sizeOk = (f) => !f || f.size <= 10 * 1024 * 1024;

  const handleFileSet = (file, setter) => {
    if (!file) return setter(null);
    if (!isWord(file)) return alert('Only .doc or .docx files are allowed');
    if (!sizeOk(file)) return alert('File must be <= 10MB');
    setter(file);
  };

  useEffect(() => {
    const wire = (ref, setter) => {
      const el = ref.current;
      if (!el) return () => {};
      const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
      const enter = (e) => { stop(e); el.classList.add('ring-2', 'ring-blue-400'); };
      const leave = (e) => { stop(e); el.classList.remove('ring-2', 'ring-blue-400'); };
      const drop = (e) => {
        stop(e);
        el.classList.remove('ring-2', 'ring-blue-400');
        const f = e.dataTransfer?.files?.[0];
        handleFileSet(f, setter);
      };
      ['dragenter', 'dragover'].forEach((ev) => el.addEventListener(ev, enter));
      ['dragleave', 'dragend'].forEach((ev) => el.addEventListener(ev, leave));
      el.addEventListener('drop', drop);
      return () => {
        ['dragenter', 'dragover'].forEach((ev) => el.removeEventListener(ev, enter));
        ['dragleave', 'dragend'].forEach((ev) => el.removeEventListener(ev, leave));
        el.removeEventListener('drop', drop);
      };
    };
    const off1 = wire(drop1, setSummaryReport);
    const off2 = wire(drop2, setDetailedReport);
    return () => { off1 && off1(); off2 && off2(); };
  }, []);

  // ======== Controls ========
  const handlePointChange = (index, value) => {
    const newPoints = [...points];
    newPoints[index].text = value;
    setPoints(newPoints);
  };
  const handleCategoryChange = (index, value) => {
    const newPoints = [...points];
    newPoints[index].category = value;
    setPoints(newPoints);
  };
  const addPointField = () => setPoints([...points, { text: '', category: 'A' }]);

  const handlePricingRowChange = (index, field, value) => {
    const updated = [...pricingRows];
    updated[index][field] = value;
    setPricingRows(updated);
  };
  const addPricingRow = () =>
    setPricingRows([...pricingRows, { height: '', length: '', width: '', weight: '', price_per_km: '' }]);

  const handleRoutePathChange = (index, value) => {
    const updated = [...routePath];
    updated[index] = value;
    setRoutePath(updated);
  };
  const addRoutePath = () => setRoutePath([...routePath, '']);
  const removeRoutePath = (index) => setRoutePath(routePath.filter((_, i) => i !== index));

  const addStartAliases = () => {
    const withAliases = aliasSet(startCity).join(', ');
    if (!withAliases) return;
    setStartKeyword((prev) => (prev ? `${prev}, ${withAliases}` : withAliases));
  };
  const addEndAliases = () => {
    const withAliases = aliasSet(endCity).join(', ');
    if (!withAliases) return;
    setEndKeyword((prev) => (prev ? `${prev}, ${withAliases}` : withAliases));
  };

  // ======== Submit ========
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', title);

    // NEW: two file inputs
    if (summaryReport) formData.append('summaryReport', summaryReport);
    if (detailedReport) formData.append('detailedReport', detailedReport);

    // Existing fields
    formData.append('points', JSON.stringify(points));
    formData.append('startKeyword', startKeyword);
    formData.append('endKeyword', endKeyword);
    formData.append('pricingRows', JSON.stringify(pricingRows));

    // NEW: route path + computed preview so backend can rebuild route_keywords
    formData.append('routePath', JSON.stringify(routePath));
    formData.append('routeKeywordsPreview', routeKeywordsPreview);

    const res = await fetch(`/api/admin/surveys/${id}`, {
      method: 'PUT',
      body: formData,
    });

    if (res.ok) {
      alert('Survey updated successfully');
      router.push('/admin/surveys');
    } else {
      alert('Update failed');
    }
  };

  const s3Base = process.env.NEXT_PUBLIC_S3_BUCKET_URL || '';

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-8 space-y-8 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800">Edit Survey Report</h1>

      {/* Title */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Survey Title</label>
        <p className="text-xs text-gray-500 mb-2">A human‑friendly title. Example: <em>Mumbai to Sriperumbudur Route</em>.</p>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Files: Summary + Detailed */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded border border-gray-200">
          <label className="block text-lg font-semibold text-gray-700 mb-1">Summary Report (.doc/.docx)</label>
          <p className="text-xs text-gray-500 mb-3">2–5 pages: overview, major constraints, recommended timings. Max 10MB.</p>
          {existingSummaryPath ? (
            <a
              href={`${s3Base}${existingSummaryPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm mb-2 inline-block"
            >
              View current summary file
            </a>
          ) : (
            <p className="text-xs text-gray-400 mb-2">No summary file uploaded yet.</p>
          )}
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
          <p className="text-xs text-gray-500 mb-3">Full report: photos, clearances, bridge IDs, permissions. Max 10MB.</p>
          {existingDetailedPath ? (
            <a
              href={`${s3Base}${existingDetailedPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm mb-2 inline-block"
            >
              View current detailed file
            </a>
          ) : (
            <p className="text-xs text-gray-400 mb-2">No detailed file uploaded yet.</p>
          )}
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

      {/* Constraints */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-1">Main Constraints</label>
        <p className="text-xs text-gray-500 mb-3">
          Add bullet points like low bridges, narrow turns, night‑only passages. Category:
          <span className="font-semibold"> A</span> (critical), <span className="font-semibold">B</span> (moderate), <span className="font-semibold"> C</span> (minor).
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
                  point.category === 'A' ? 'bg-red-500' : point.category === 'B' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              >
                <option value="A" className="text-black">A</option>
                <option value="B" className="text-black">B</option>
                <option value="C" className="text-black">C</option>
              </select>
              {points.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPoints(points.filter((_, i) => i !== idx))}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addPointField} className="mt-3 text-blue-600 hover:underline text-sm font-medium">
          + Add another point
        </button>
      </div>

      {/* Keywords + helpers */}
      <div className="p-6 bg-white rounded border border-gray-200">
        <label className="block text-lg font-semibold text-gray-700 mb-2">Location Keywords</label>
        <p className="text-xs text-gray-500 mb-4">
          <strong>How to enter:</strong> comma‑separated tokens. Include city names, old names (aliases), and localities.
          Example for Chennai: <code>Chennai, Madras, Perambur, Ambattur</code>. For Mumbai: <code>Mumbai, Bombay, Andheri, Bhiwandi</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Start City (helper)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={startCity}
              onChange={(e) => setStartCity(e.target.value)}
              placeholder="e.g., Chennai"
            />
            <button type="button" onClick={addStartAliases} className="text-sm text-blue-600 hover:underline mt-1">
              Add common aliases to Start keywords
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
            <label className="block text-sm font-medium text-gray-600 mb-1">End City (helper)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={endCity}
              onChange={(e) => setEndCity(e.target.value)}
              placeholder="e.g., Mumbai"
            />
            <button type="button" onClick={addEndAliases} className="text-sm text-blue-600 hover:underline mt-1">
              Add common aliases to End keywords
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
          <div className="text-gray-700 break-words">{routeKeywordsPreview || '—'}</div>
        </div>
      </div>

      {/* Route Path */}
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
        <label className="block text-lg font-semibold text-gray-700 mb-1">Truck Dimensions & Price (₹/km)</label>
        <p className="text-xs text-gray-500 mb-3">Choose a range for each dimension. Keep units consistent (m/tons).</p>
        {pricingRows.map((row, idx) => (
          <div key={idx} className="grid md:grid-cols-6 gap-4 mb-4 items-end">
            <SelectField label="Height" value={row.height} onChange={(v) => handlePricingRowChange(idx, 'height', v)} options={heightOptions} />
            <SelectField label="Length" value={row.length} onChange={(v) => handlePricingRowChange(idx, 'length', v)} options={lengthOptions} />
            <SelectField label="Width"  value={row.width}  onChange={(v) => handlePricingRowChange(idx, 'width',  v)} options={widthOptions} />
            <SelectField label="Weight" value={row.weight} onChange={(v) => handlePricingRowChange(idx, 'weight', v)} options={weightOptions} />
            <div>
              <label className="block text-sm text-gray-600 mb-1">₹/km</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full p-2 border rounded"
                value={row.price_per_km}
                onChange={(e) => handlePricingRowChange(idx, 'price_per_km', e.target.value)}
              />
            </div>
            <div className="flex items-center">
              <button type="button" onClick={() => setPricingRows(pricingRows.filter((_, i) => i !== idx))} className="text-red-500 text-xs">
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
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow-md transition duration-200"
        >
          Update Survey
        </button>
      </div>
    </form>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
