// app/(wherever-your-page-is)/EstimateFormV2.jsx
'use client';

import { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { Dialog } from '@headlessui/react';
import { Autocomplete } from '@react-google-maps/api';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { ToastContainer, toast } from 'react-toastify';

// Country dial codes with flag (curated set).
// If you truly need ALL countries, move this to a JSON file and include a comprehensive list.
const COUNTRIES = [
  { iso: 'IN', name: 'India',            dial: '+91',  flag: '🇮🇳' },
  { iso: 'US', name: 'United States',    dial: '+1',   flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom',   dial: '+44',  flag: '🇬🇧' },
  { iso: 'AE', name: 'U.A.E.',           dial: '+971', flag: '🇦🇪' },
  { iso: 'SG', name: 'Singapore',        dial: '+65',  flag: '🇸🇬' },
  { iso: 'DE', name: 'Germany',          dial: '+49',  flag: '🇩🇪' },
  { iso: 'FR', name: 'France',           dial: '+33',  flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy',            dial: '+39',  flag: '🇮🇹' },
  { iso: 'ES', name: 'Spain',            dial: '+34',  flag: '🇪🇸' },
  { iso: 'PT', name: 'Portugal',         dial: '+351', flag: '🇵🇹' },
  { iso: 'BR', name: 'Brazil',           dial: '+55',  flag: '🇧🇷' },
  { iso: 'MX', name: 'Mexico',           dial: '+52',  flag: '🇲🇽' },
  { iso: 'CA', name: 'Canada',           dial: '+1',   flag: '🇨🇦' },
  { iso: 'AU', name: 'Australia',        dial: '+61',  flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand',      dial: '+64',  flag: '🇳🇿' },
  { iso: 'SA', name: 'Saudi Arabia',     dial: '+966', flag: '🇸🇦' },
  { iso: 'QA', name: 'Qatar',            dial: '+974', flag: '🇶🇦' },
  { iso: 'KW', name: 'Kuwait',           dial: '+965', flag: '🇰🇼' },
  { iso: 'OM', name: 'Oman',             dial: '+968', flag: '🇴🇲' },
  { iso: 'BH', name: 'Bahrain',          dial: '+973', flag: '🇧🇭' },
  { iso: 'LK', name: 'Sri Lanka',        dial: '+94',  flag: '🇱🇰' },
  { iso: 'BD', name: 'Bangladesh',       dial: '+880', flag: '🇧🇩' },
  { iso: 'NP', name: 'Nepal',            dial: '+977', flag: '🇳🇵' },
  { iso: 'PK', name: 'Pakistan',         dial: '+92',  flag: '🇵🇰' },
  { iso: 'MY', name: 'Malaysia',         dial: '+60',  flag: '🇲🇾' },
  { iso: 'TH', name: 'Thailand',         dial: '+66',  flag: '🇹🇭' },
  { iso: 'ID', name: 'Indonesia',        dial: '+62',  flag: '🇮🇩' },
  { iso: 'VN', name: 'Vietnam',          dial: '+84',  flag: '🇻🇳' },
  { iso: 'PH', name: 'Philippines',      dial: '+63',  flag: '🇵🇭' },
  { iso: 'CN', name: 'China',            dial: '+86',  flag: '🇨🇳' },
  { iso: 'JP', name: 'Japan',            dial: '+81',  flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea',      dial: '+82',  flag: '🇰🇷' },
  { iso: 'TR', name: 'Türkiye',          dial: '+90',  flag: '🇹🇷' },
  { iso: 'ZA', name: 'South Africa',     dial: '+27',  flag: '🇿🇦' },
  { iso: 'NG', name: 'Nigeria',          dial: '+234', flag: '🇳🇬' },
  { iso: 'EG', name: 'Egypt',            dial: '+20',  flag: '🇪🇬' },
];

// Helper: pull an address component by any of the types
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
  // Truck UI state (labels)
  const [length, setLength] = useState('12m');
  const [width, setWidth] = useState('3m');
  const [height, setHeight] = useState('less than 4m');
  const [weight, setWeight] = useState('less than 50 tons');

  // Contact
  const [email, setEmail] = useState('');
  const [countryDial, setCountryDial] = useState('+91');
  const [phoneLocal, setPhoneLocal] = useState('');

  // Dialog/result
  const [isOpen, setIsOpen] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // Autocomplete & input
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
    const tmpInput = fromInput;
    const tmpPlace = fromPlace;
    setFromInput(toInput);
    setFromPlace(toPlace);
    setToInput(tmpInput);
    setToPlace(tmpPlace);
  };

  // Simple estimators
  const volumeEstimate = () => {
    const volMap = {
      '12m': 12, '12-15m': 13, '15-18m': 16, '18-25m': 20, '25-30m': 27,
      '30-40m': 35, '40-60m': 50, '60-80m': 70, '>80m': 90,
    };
    const widthMap = {
      '3m': 3, '3-4m': 3.5, '4-5m': 4.5, '5-6m': 5.5, '6-7m': 6.5,
      '7-8m': 7.5, '>8m': 9,
    };
    const heightMap = {
      'less than 4m': 3.8, '4 - 4.5m': 4.25, '4.5 - 5m': 4.75,
      '5.5 - 6m': 5.75, '6 - 6.5m': 6.25, '6.5 - 7.5m': 7, '>7.5m': 8,
    };
    const l = volMap[length] || 10;
    const w = widthMap[width] || 2;
    const h = heightMap[height] || 2;
    return Math.round(l * w * h);
  };

  const truckClass = () => {
    const vol = volumeEstimate();
    if (vol <= 300) return 'small';
    if (vol <= 800) return 'medium';
    return 'large';
  };

  const getTruckImage = () => {
    const klass = truckClass();
    if (klass === 'small') return '/images/small truck.jpg';
    if (klass === 'medium') return '/images/medium truck.jpg';
    return '/images/large truck.png';
  };

  // Full phone in E.164
  const fullPhone = useMemo(() => {
    const digits = (phoneLocal || '').replace(/\D/g, '');
    return `${countryDial}${digits}`;
  }, [countryDial, phoneLocal]);

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

    // Basic E.164 validation
    const phoneDigits = phoneLocal.replace(/\D/g, '');
    const isValidPhone =
      /^\+\d{1,4}$/.test(countryDial) &&
      phoneDigits.length >= 4 &&
      (countryDial + phoneDigits).replace(/\D/g, '').length <= 15;

    if (email && !isValidEmail) missing.push('Valid Email');
    if (phoneLocal && !isValidPhone) missing.push('Valid Phone Number');

    if (missing.length) {
      toast.error(`Please provide: ${missing.join(', ')}`, { autoClose: 5000 });
      return false;
    }
    return true;
  };

  const handleSubmitEnquiry = async () => {
    if (!validate()) return;

    // Structured payload (keep old flat fields for back-compat)
    const payload = {
      contact: { email, phone: fullPhone },
      route: { from: fromPlace, to: toPlace },
      truck: {
        length_label: length,
        width_label: width,
        height_label: height,
        weight_label: weight,
        volume_m3: volumeEstimate(),
        class: truckClass(),
      },
      // back-compat legacy keys (used by backend)
      startLocation: fromPlace.city_key,
      endLocation: toPlace.city_key,
      length, width, height, weight,
      client_ts: new Date().toISOString(),
      source: 'web_form',
    };

    try {
      // (Optional) save enquiry
      await fetch('/api/admin/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Estimate
      const query = new URLSearchParams({
        start: fromPlace.city_key,
        end: toPlace.city_key,
        start_place_id: fromPlace.place_id || '',
        end_place_id: toPlace.place_id || '',
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

  // Safely read Start/End for the modal from either old or new API shape
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

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="bg-white rounded-xl shadow-lg p-8 mx-auto mt-10 max-w-4xl space-y-10">
        <h2 className="text-2xl font-semibold text-gray-800">Get ODC Transport Fare Estimate</h2>

        {/* From / To with Google Places */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5">
            <Autocomplete
              onLoad={(ref) => (autocompleteFromRef.current = ref)}
              onPlaceChanged={onFromChanged}
              options={{
                componentRestrictions: { country: ['in'] }, // change/remove for global search
                types: ['geocode'],
                fields: ['place_id', 'address_components', 'formatted_address', 'geometry', 'name', 'types'],
              }}
            >
              <input
                aria-label="Start Location"
                type="text"
                placeholder="Start Location"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
              />
            </Autocomplete>
          </div>

          <div className="col-span-2 flex justify-center">
            <button onClick={handleSwap} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200" aria-label="Swap locations">
              <ArrowsRightLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="col-span-5">
            <Autocomplete
              onLoad={(ref) => (autocompleteToRef.current = ref)}
              onPlaceChanged={onToChanged}
              options={{
                componentRestrictions: { country: ['in'] },
                types: ['geocode'],
                fields: ['place_id', 'address_components', 'formatted_address', 'geometry', 'name', 'types'],
              }}
            >
              <input
                aria-label="Destination"
                type="text"
                placeholder="Destination"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
              />
            </Autocomplete>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-medium mb-3 text-gray-700">Contact</h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:col-span-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-2 sm:col-span-2">
              <select
                aria-label="Country code"
                className="min-w-[110px] border border-gray-300 rounded-lg px-3 py-3 bg-white"
                value={countryDial}
                onChange={(e) => setCountryDial(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.dial}>
                    {c.flag} {c.name} {c.dial}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                value={phoneLocal}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">We’ll format your number as {fullPhone}.</p>
        </div>

        {/* Truck dimensions */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-gray-700">Truck Dimensions</h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <Dropdown label="Length" value={length} onChange={setLength} options={['12m', '12-15m', '15-18m', '18-25m', '25-30m', '30-40m', '40-60m', '60-80m', '>80m']} />
            <Dropdown label="Width" value={width} onChange={setWidth} options={['3m', '3-4m', '4-5m', '5-6m', '6-7m', '7-8m', '>8m']} />
            <Dropdown label="Height" value={height} onChange={setHeight} options={['less than 4m', '4 - 4.5m', '4.5 - 5m', '5.5 - 6m', '6 - 6.5m', '6.5 - 7.5m', '>7.5m']} />
            <Dropdown label="Weight" value={weight} onChange={setWeight} options={['less than 50 tons', '50 - 100 tons', '100-200 tons', '200-300 tons', '300-400 tons', '400-500 tons', '>500 tons']} />
          </div>
        </div>

        {/* Visual */}
        <div className="flex flex-col items-center gap-2">
          <Image src={getTruckImage()} alt="Truck preview" width={300} height={200} className="rounded-md object-contain" />
          <p className="text-sm text-gray-500">
            Estimated Volume: <strong>{volumeEstimate()} m³</strong>
            <span className="ml-2 text-gray-400">({truckClass()})</span>
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmitEnquiry}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Show Estimate
          </button>
        </div>
      </div>

      {/* Result dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              Estimate Summary
            </Dialog.Title>

            {searchResult ? (
              <>
                <ul className="text-gray-700 space-y-2 mb-4">
                  <li><strong>Start:</strong> {resultStartLabel}</li>
                  <li><strong>Destination:</strong> {resultEndLabel}</li>
                  <li><strong>Distance:</strong> {searchResult.distance_km} km</li>
                  <li className="text-lg mt-2">
                    <strong className="text-blue-600 text-xl">Estimated Fare: ₹{searchResult.estimated_cost?.toLocaleString() || 'N/A'}</strong>
                  </li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
                  To know more about route constraints or details, contact us at{' '}
                  <a href="mailto:kh@raceinnovations.in" className="underline font-medium">
                    kh@raceinnovations.in
                  </a>
                  .
                </div>
              </>
            ) : (
              <p>Your enquiry has been received. Our team will contact you shortly.</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

function Dropdown({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        {options.map((val) => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
    </div>
  );
}
