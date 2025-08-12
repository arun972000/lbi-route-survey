'use client';

import { useState, useRef } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import GetEstimateForm from './EstimateFormV2';
// import GetEstimateForm from './EstimateForm';

export default function GetEstimateWrapper() {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      libraries={['places']}
    >
      <GetEstimateForm />
    </LoadScript>
  );
}