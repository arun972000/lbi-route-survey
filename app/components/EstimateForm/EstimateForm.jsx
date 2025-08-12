'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Dialog } from '@headlessui/react';
import { Autocomplete } from '@react-google-maps/api';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/solid';
import { ToastContainer, toast } from 'react-toastify';

export default function GetEstimateForm() {
  const [length, setLength] = useState('12m');
  const [width, setWidth] = useState('3m');
  const [height, setHeight] = useState('less than 4m');
  const [weight, setWeight] = useState('less than 50 tons');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const autocompleteStartRef = useRef(null);
  const autocompleteEndRef = useRef(null);

  const extractCity = (place) => {
    const getComponent = (types) =>
      place.address_components?.find((c) =>
        types.some((type) => c.types.includes(type))
      );

    const preferred =
      getComponent(['locality']) ||
      getComponent(['postal_town']) ||
      getComponent(['sublocality_level_1']);

    if (preferred?.long_name) {
      return preferred.long_name.toLowerCase().trim();
    }

    if (place?.formatted_address) {
      const first = place.formatted_address.split(',')[0].toLowerCase().trim();
      return first;
    }

    return '';
  };

  const handlePlaceChange = () => {
    if (autocompleteStartRef.current) {
      const place = autocompleteStartRef.current.getPlace();
      const city = extractCity(place);
      setStartLocation(city);
      setStartInput(place.formatted_address || '');
    }
    if (autocompleteEndRef.current) {
      const place = autocompleteEndRef.current.getPlace();
      const city = extractCity(place);
      setEndLocation(city);
      setEndInput(place.formatted_address || '');
    }
  };

  const handleSwap = () => {
    const tempInput = startInput;
    const tempLoc = startLocation;
    setStartInput(endInput);
    setStartLocation(endLocation);
    setEndInput(tempInput);
    setEndLocation(tempLoc);
  };

  const handleSubmitEnquiry = async () => {
    const missingFields = [];

    if (!startLocation) missingFields.push('Start Location');
    if (!endLocation) missingFields.push('Destination');
    if (!email.trim()) missingFields.push('Email');
    if (!phone.trim()) missingFields.push('Phone Number');
    if (!length) missingFields.push('Length');
    if (!width) missingFields.push('Width');
    if (!height) missingFields.push('Height');
    if (!weight) missingFields.push('Weight');

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = /^[6-9]\d{9}$/.test(phone);

    if (email && !isValidEmail) missingFields.push('Valid Email');
    if (phone && !isValidPhone) missingFields.push('Valid Phone Number');

    if (missingFields.length > 0) {
      toast.error(`Please provide: ${missingFields.join(', ')}`, { autoClose: 5000 });
      return;
    }

    const payload = {
      startLocation,
      endLocation,
      email,
      phone,
      length,
      width,
      height,
      weight,
    };

    try {
      const res = await fetch('/api/admin/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const query = new URLSearchParams({
          start: startLocation,
          end: endLocation,
          height,
          length,
          width,
          weight,
        });

        const getRes = await fetch(`/api/admin/estimate-search?${query.toString()}`);
        const result = await getRes.json();

        setSearchResult(getRes.ok ? result : null);
        setIsOpen(true);
        setEmail('');
        setPhone('');

        toast.success('Estimate generated successfully!');
      } else {
        toast.error('Submission failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error submitting enquiry.');
    }
  };

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

  const getTruckImage = () => {
    const vol = volumeEstimate();
    if (vol <= 300) return '/images/small truck.jpg';
    if (vol <= 800) return '/images/medium truck.jpg';
    return '/images/large truck.png';
  };


  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="bg-white rounded-xl shadow-lg p-8 mx-auto mt-10 max-w-4xl space-y-10">
        <h2 className="text-2xl font-semibold text-gray-800">Get ODC Transport Fare Estimate</h2>

        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5">
            <Autocomplete
              onLoad={(ref) => (autocompleteStartRef.current = ref)}
              onPlaceChanged={handlePlaceChange}
              options={{ componentRestrictions: { country: 'in' }, types: ['(cities)'] }}
            >
              <input
                ref={startRef}
                type="text"
                placeholder="Start Location"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
              />
            </Autocomplete>
          </div>

          <div className="col-span-2 flex justify-center">
            <button onClick={handleSwap} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              <ArrowsRightLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="col-span-5">
            <Autocomplete
              onLoad={(ref) => (autocompleteEndRef.current = ref)}
              onPlaceChanged={handlePlaceChange}
              options={{ componentRestrictions: { country: 'in' }, types: ['(cities)'] }}
            >
              <input
                ref={endRef}
                type="text"
                placeholder="Destination"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
              />
            </Autocomplete>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-6">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4 text-gray-700">Truck Dimensions</h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <Dropdown label="Length" value={length} onChange={setLength} options={['12m', '12-15m', '15-18m', '18-25m', '25-30m', '30-40m', '40-60m', '60-80m', '>80m']} />
            <Dropdown label="Width" value={width} onChange={setWidth} options={['3m', '3-4m', '4-5m', '5-6m', '6-7m', '7-8m', '>8m']} />
            <Dropdown label="Height" value={height} onChange={setHeight} options={['less than 4m', '4 - 4.5m', '4.5 - 5m', '5.5 - 6m', '6 - 6.5m', '6.5 - 7.5m', '>7.5m']} />
            <Dropdown label="Weight" value={weight} onChange={setWeight} options={['less than 50 tons', '50 - 100 tons', '100-200 tons', '200-300 tons', '300-400 tons', '400-500 tons', '>500 tons']} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Image src={getTruckImage()} alt="Truck preview" width={300} height={200} className="rounded-md object-contain" />
          <p className="text-sm text-gray-500">Estimated Volume: <strong>{volumeEstimate()} m³</strong></p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitEnquiry}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Show Estimate
          </button>
        </div>
      </div>

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
                  <li><strong>Start:</strong> {searchResult.startLocation}</li>
                  <li><strong>Destination:</strong> {searchResult.endLocation}</li>
                  <li><strong>Distance:</strong> {searchResult.distance_km} km</li>
                  <li><strong>Price per km:</strong> ₹{searchResult.pricing?.price_per_km || 'N/A'}</li>
                  <li className="text-lg mt-2"><strong className="text-blue-600 text-xl">Fare: ₹{searchResult.estimated_cost?.toLocaleString() || 'N/A'}</strong></li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
                  To know more about route constraints or details, contact us at{' '}
                  <a href="mailto:info@odcfare.com" className="underline font-medium">
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
