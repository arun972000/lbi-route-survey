// app/(wherever-your-page-is)/EstimateFormV2.jsx
'use client';

import { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { Dialog } from '@headlessui/react';
import { Autocomplete } from '@react-google-maps/api';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { ToastContainer, toast } from 'react-toastify';

// If you already have a server util, uncomment and set the correct path:
// import { sendBulkEmails } from '@/lib/send-bulk-emails';

const COUNTRIES = [
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'AE', name: 'U.A.E.', dial: '+971', flag: '🇦🇪' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { iso: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { iso: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { iso: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { iso: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { iso: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { iso: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { iso: 'TR', name: 'Türkiye', dial: '+90', flag: '🇹🇷' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { iso: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
];

const pickComp = (place, types) =>
  place?.address_components?.find((c) => types.some((t) => c.types.includes(t)));

const summarizePlace = (place) => {
  if (!place) return null;
  const loc = place.geometry?.location;
  const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
  const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;

  const cityComp =
    pickComp(place, ['locality']) ||
    pickComp(place, ['postal_town']) ||
    pickComp(place, ['sublocality_level_1']) ||
    pickComp(place, ['administrative_area_level_3']);

  const districtComp = pickComp(place, ['administrative_area_level_2']);
  const stateComp = pickComp(place, ['administrative_area_level_1']);
  const countryComp = pickComp(place, ['country']);

  return {
    place_id: place.place_id ?? null,
    name: place.name ?? cityComp?.long_name ?? place.formatted_address ?? '',
    formatted_address: place.formatted_address ?? '',
    types: place.types ?? [],
    location: lat != null && lng != null ? { lat, lng } : null,
    admin: {
      city: cityComp?.long_name ?? null,
      district: districtComp?.long_name ?? null,
      state: stateComp?.long_name ?? null,
      country: countryComp?.long_name ?? null,
      country_code: countryComp?.short_name ?? null,
    },
    city_key: (cityComp?.long_name || place.name || '')?.toLowerCase()?.trim() || '',
  };
};

export default function GetEstimateForm() {
  // truck UI
  const [length, setLength] = useState('12m');
  const [width, setWidth] = useState('3m');
  const [height, setHeight] = useState('less than 4m');
  const [weight, setWeight] = useState('less than 50 tons');

  // contact
  const [email, setEmail] = useState('');
  const [countryDial, setCountryDial] = useState('+91');
  const [phoneLocal, setPhoneLocal] = useState('');

  // dialogs
  const [isOpen, setIsOpen] = useState(false);            // estimate dialog
  const [isSurveyOpen, setIsSurveyOpen] = useState(false); // survey dialog
  const [surveyEmail, setSurveyEmail] = useState('');       // email inside survey modal
  const [sendingSurvey, setSendingSurvey] = useState(false);

  // results
  const [searchResult, setSearchResult] = useState(null);

  // places
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);

  const autocompleteFromRef = useRef(null);
  const autocompleteToRef = useRef(null);

  const onFromChanged = () => {
    const place = autocompleteFromRef.current?.getPlace();
    const summary = summarizePlace(place);
    if (summary) {
      setFromPlace(summary);
      setFromInput(place.formatted_address || summary.name || '');
    }
  };
  const onToChanged = () => {
    const place = autocompleteToRef.current?.getPlace();
    const summary = summarizePlace(place);
    if (summary) {
      setToPlace(summary);
      setToInput(place.formatted_address || summary.name || '');
    }
  };

  const handleSwap = () => {
    const ti = fromInput; const tp = fromPlace;
    setFromInput(toInput); setFromPlace(toPlace);
    setToInput(ti); setToPlace(tp);
  };

  // estimates
  const volumeEstimate = () => {
    const volMap = { '12m': 12, '12-15m': 13, '15-18m': 16, '18-25m': 20, '25-30m': 27, '30-40m': 35, '40-60m': 50, '60-80m': 70, '>80m': 90 };
    const widthMap = { '3m': 3, '3-4m': 3.5, '4-5m': 4.5, '5-6m': 5.5, '6-7m': 6.5, '7-8m': 7.5, '>8m': 9 };
    const heightMap = { 'less than 4m': 3.8, '4 - 4.5m': 4.25, '4.5 - 5m': 4.75, '5.5 - 6m': 5.75, '6 - 6.5m': 6.25, '6.5 - 7.5m': 7, '>7.5m': 8 };
    const l = volMap[length] || 10, w = widthMap[width] || 2, h = heightMap[height] || 2;
    return Math.round(l * w * h);
  };
  const truckClass = () => (volumeEstimate() <= 300 ? 'small' : volumeEstimate() <= 800 ? 'medium' : 'large');
  const getTruckImage = () => (truckClass() === 'small' ? '/images/small truck.jpg' : truckClass() === 'medium' ? '/images/medium truck.jpg' : '/images/large truck.png');

  // phone
  const fullPhone = useMemo(() => {
    const digits = (phoneLocal || '').replace(/\D/g, '');
    return `${countryDial}${digits}`;
  }, [countryDial, phoneLocal]);

  // validate
  const validate = () => {
    const missing = [];
    if (!fromPlace?.place_id) missing.push('Start Location');
    if (!toPlace?.place_id) missing.push('Destination');
    if (!email.trim()) missing.push('Email');
    if (!phoneLocal.trim()) missing.push('Phone Number');
    if (!length) missing.push('Length');
    if (!width) missing.push('Width');
    if (!height) missing.push('Height');
    if (!weight) missing.push('Weight');

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneDigits = phoneLocal.replace(/\D/g, '');
    const isValidPhone = /^\+\d{1,4}$/.test(countryDial) && phoneDigits.length >= 4 && (countryDial + phoneDigits).replace(/\D/g, '').length <= 15;

    if (email && !isValidEmail) missing.push('Valid Email');
    if (phoneLocal && !isValidPhone) missing.push('Valid Phone Number');

    if (missing.length) { toast.error(`Please provide: ${missing.join(', ')}`, { autoClose: 5000 }); return false; }
    return true;
  };

  // submit estimate
  const handleSubmitEnquiry = async () => {
    if (!validate()) return;
    const payload = {
      contact: { email, phone: fullPhone },
      route: { from: fromPlace, to: toPlace },
      truck: { length_label: length, width_label: width, height_label: height, weight_label: weight, volume_m3: volumeEstimate(), class: truckClass() },
      startLocation: fromPlace.city_key,
      endLocation: toPlace.city_key,
      length, width, height, weight,
      client_ts: new Date().toISOString(),
      source: 'web_form',
    };

    try {
      await fetch('/api/admin/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const query = new URLSearchParams({
        start: fromPlace.city_key, end: toPlace.city_key,
        start_place_id: fromPlace.place_id || '', end_place_id: toPlace.place_id || '',
        height, length, width, weight,
      });
      const getRes = await fetch(`/api/admin/estimate-search?${query.toString()}`);
      const result = await getRes.json();
      setSearchResult(getRes.ok ? result : null);
      setIsOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error submitting enquiry.');
    }
  };

  // SURVEY: open modal
  const openSurveyModal = () => {
    setSurveyEmail(email || ''); // prefill with contact email if available
    setIsSurveyOpen(true);
  };

  // SURVEY: send email
  const handleSurveySubmit = async () => {
    if (!surveyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(surveyEmail)) {
      toast.error('Please enter a valid email.');
      return;
    }

    const recipients = ['kh@raceinnovations.in'];
    const subject = 'Route Survey Request - Race Innovations';
    const message = `
      <div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#0f172a">
        <h2 style="margin:0 0 12px 0;color:#111827">Route Survey Request</h2>
        <p style="margin:0 0 8px 0">A new survey request has been submitted from the website.</p>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb">
          <tbody>
            <tr><td style="background:#f8fafc;border:1px solid #e5e7eb"><strong>Requester Email</strong></td><td style="border:1px solid #e5e7eb">${surveyEmail}</td></tr>
          </tbody>
        </table>
        <p style="margin:12px 0 0 0;color:#334155">Submitted at: ${new Date().toLocaleString()}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      </div>
    `;

    try {
      setSendingSurvey(true);

      // If you have a server util, use it directly (must be server-side):
      // await sendBulkEmails(recipients, subject, message);

      // Otherwise call your API route that wraps sendBulkEmails server-side:
      await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, message }),
      });

      toast.success('Survey request sent. We’ll reach out shortly.');
      setIsSurveyOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to send survey request.');
    } finally {
      setSendingSurvey(false);
    }
  };

  const resultStartLabel = useMemo(() => {
    const r = searchResult;
    if (!r) return '';
    if (r.start?.normalized?.label) return r.start.normalized.label;
    if (r.start?.input) return r.start.input;
    if (r.startLocation) return r.startLocation;
    return '';
  }, [searchResult]);

  const resultEndLabel = useMemo(() => {
    const r = searchResult;
    if (!r) return '';
    if (r.end?.normalized?.label) return r.end.normalized.label;
    if (r.end?.input) return r.end.input;
    if (r.endLocation) return r.endLocation;
    return '';
  }, [searchResult]);

  // styling
  const inputCls =
    'w-full rounded-xl border border-blue-200 bg-blue-50/70 ' +
    'px-4 py-3 text-[16px] md:text-[17px] text-slate-900 placeholder:text-slate-500 shadow-sm ' +
    'focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-300/50 focus:outline-none caret-blue-600';
  const labelCls = 'mb-1 text-[15px] md:text-base font-medium text-slate-700';

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="mx-auto mt-6 max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Get ODC Transport Fare Estimate
        </h2>

        {/* FROM / TO — add a little space near the swap icon on ≥sm */}
        <div className="mt-4 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-2">
          {/* Start */}
          <div>
            <label className={labelCls}>Start Location</label>
            <Autocomplete
              onLoad={(ref) => (autocompleteFromRef.current = ref)}
              onPlaceChanged={onFromChanged}
              options={{ componentRestrictions: { country: ['in'] }, types: ['geocode'], fields: ['place_id', 'address_components', 'formatted_address', 'geometry', 'name', 'types'] }}
            >
              <input
                aria-label="Start Location"
                type="text"
                placeholder="City, address, landmark…"
                className={inputCls}
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
              />
            </Autocomplete>
          </div>

          {/* Swap */}
          <div className="flex justify-center sm:px-1">
            <button
              onClick={handleSwap}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
              aria-label="Swap locations"
              type="button"
            >
              <ArrowsRightLeftIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Destination */}
          <div>
            <label className={labelCls}>Destination</label>
            <Autocomplete
              onLoad={(ref) => (autocompleteToRef.current = ref)}
              onPlaceChanged={onToChanged}
              options={{ componentRestrictions: { country: ['in'] }, types: ['geocode'], fields: ['place_id', 'address_components', 'formatted_address', 'geometry', 'name', 'types'] }}
            >
              <input
                aria-label="Destination"
                type="text"
                placeholder="City, address, landmark…"
                className={inputCls}
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
              />
            </Autocomplete>
          </div>
        </div>

        <div className="my-4 h-px w-full bg-slate-200" />

        {/* CONTACT */}
        <div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Phone</label>
              <div className="flex gap-2">
                <select
                  aria-label="Country code"
                  className={`min-w-[130px] ${inputCls} text-[18px] leading-tight`}
                  value={countryDial}
                  onChange={(e) => setCountryDial(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.iso} value={c.dial}>
                      {c.flag} {c.dial}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone number"
                  className={`${inputCls}`}
                  value={phoneLocal}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="my-4 h-px w-full bg-slate-200" />

        {/* TRUCK DIMENSIONS */}
        <div>
          <h3 className="mb-2 text-lg md:text-xl font-semibold text-slate-800">Truck Dimensions</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Dropdown label="Length" value={length} onChange={setLength} options={['12m', '12-15m', '15-18m', '18-25m', '25-30m', '30-40m', '40-60m', '60-80m', '>80m']} inputCls={inputCls} labelCls={labelCls} />
            <Dropdown label="Width" value={width} onChange={setWidth} options={['3m', '3-4m', '4-5m', '5-6m', '6-7m', '7-8m', '>8m']} inputCls={inputCls} labelCls={labelCls} />
            <Dropdown label="Height" value={height} onChange={setHeight} options={['less than 4m', '4 - 4.5m', '4.5 - 5m', '5.5 - 6m', '6 - 6.5m', '6.5 - 7.5m', '>7.5m']} inputCls={inputCls} labelCls={labelCls} />
            <Dropdown label="Weight" value={weight} onChange={setWeight} options={['less than 50 tons', '50 - 100 tons', '100-200 tons', '200-300 tons', '300-400 tons', '400-500 tons', '>500 tons']} inputCls={inputCls} labelCls={labelCls} />
          </div>
        </div>

        {/* INLINE: buttons + truck image (responsive) */}
        <div className="mt-5 flex w-full justify-center">
          <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <button
              type="button"
              onClick={openSurveyModal}
              className="inline-flex w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 font-semibold text-yellow-900 shadow-sm transition hover:bg-yellow-500 hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 sm:w-auto"
              aria-label="Request route survey"
            >
              Request Survey Quote
            </button>

            <div className="w-full sm:w-auto">
              <div className="mx-auto flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Image
                  src={getTruckImage()}
                  alt="Truck preview"
                  width={400}
                  height={250}
                  className="h-auto w-full max-w-[360px] rounded-md object-contain sm:w-[400px]"
                />
              </div>
            </div>

            <button
              onClick={handleSubmitEnquiry}
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300/50 sm:w-auto"
            >
              Get Estimate
            </button>
          </div>
        </div>


        {/* BOTTOM DISCLAIMER */}
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Disclaimer:</strong> The transportation estimate provided is based on prevailing market rates at the time of
          preparation. Actual costs may vary due to factors such as fuel price fluctuations, changes in demand, route
          alterations, regulatory adjustments, or other unforeseen circumstances. This estimate is for reference purposes
          only and does not constitute a binding offer.
        </div>
      </div>

      {/* ESTIMATE RESULT DIALOG */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="mb-4 text-lg md:text-xl font-semibold text-slate-900">Estimate Summary</Dialog.Title>

            {searchResult ? (
              <>
                <ul className="mb-4 space-y-2 text-slate-700">
                  <li><strong>Start:</strong> {resultStartLabel}</li>
                  <li><strong>Destination:</strong> {resultEndLabel}</li>
                  <li><strong>Distance:</strong> {searchResult.distance_km} km</li>
                  <li className="mt-2 text-lg">
                    <strong className="text-xl text-blue-700">Estimated Fare: ₹{searchResult.estimated_cost?.toLocaleString() || 'N/A'}</strong>
                  </li>
                </ul>
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  To know more about route constraints or details, contact us at{' '}
                  <a href="mailto:kh@raceinnovations.in" className="font-medium underline">kh@raceinnovations.in</a>.
                </div>
              </>
            ) : (
              <p>Your enquiry has been received. Our team will contact you shortly.</p>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setIsOpen(false)} className="text-sm text-slate-600 hover:text-slate-800">
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* SURVEY REQUEST DIALOG */}
      <Dialog open={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="mb-3 text-lg md:text-xl font-semibold text-slate-900">
              Route Survey Request
            </Dialog.Title>

            <p className="text-slate-700">
              Our team will provide you with a detailed <span className="font-medium">route survey</span> and
              <span className="font-medium"> fare details</span> for this route.
            </p>

            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Disclaimer:</strong> The transportation estimate provided is based on prevailing market rates at the time of preparation. Actual costs may vary due to factors such as fuel price fluctuations, changes in demand, route alterations, regulatory adjustments, or other unforeseen circumstances. This estimate is for reference purposes only and does not constitute a binding offer.
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Your Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className={inputCls}
                value={surveyEmail}
                onChange={(e) => setSurveyEmail(e.target.value)}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsSurveyOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSurveySubmit}
                disabled={sendingSurvey}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300/50 disabled:opacity-60"
              >
                {sendingSurvey ? 'Sending…' : 'Submit Request'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

function Dropdown({ label, value, onChange, options, inputCls, labelCls }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((val) => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
    </div>
  );
}
