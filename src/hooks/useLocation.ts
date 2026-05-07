import { useState, useEffect } from 'react';
import { reverseGeocode } from '../lib/api';
import type { LocationData } from '../lib/types';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface UseLocationResult {
  location: LocationData | null;
  status: LocationStatus;
  error: string | null;
  request: () => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [status,   setStatus]   = useState<LocationStatus>('idle');
  const [error,    setError]    = useState<string | null>(null);

  function request() {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setLocation(loc);
          setStatus('granted');
          sessionStorage.setItem('medassist_location', JSON.stringify(loc));
        } catch {
          // Geocoding failed — store raw coordinates
          const raw: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            displayName: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          };
          setLocation(raw);
          setStatus('granted');
          sessionStorage.setItem('medassist_location', JSON.stringify(raw));
        }
      },
      (err) => {
        setStatus('denied');
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. You can enable it in browser settings.'
            : 'Unable to retrieve your location.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 }
    );
  }

  // Restore cached location on mount so we don't re-prompt every refresh
  useEffect(() => {
    const cached = sessionStorage.getItem('medassist_location');
    if (cached) {
      try {
        setLocation(JSON.parse(cached));
        setStatus('granted');
      } catch { /* ignore */ }
    }
  }, []);

  return { location, status, error, request };
}
