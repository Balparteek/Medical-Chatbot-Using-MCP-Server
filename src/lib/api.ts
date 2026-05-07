import type { LocationData } from './types';

const FLASK_BACKEND_URL = import.meta.env.VITE_FLASK_BACKEND_URL || 'http://localhost:5000';

export interface ChatRequest {
  message: string;
  session_id?: string;
  location?: LocationData;
}

export interface ChatResponse {
  response: string;
  session_id: string;
}

export interface HealthResponse {
  status: string;
  model: string;
}

export async function sendMessage(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${FLASK_BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getChatHistory(sessionId: string): Promise<ChatResponse[]> {
  const res = await fetch(`${FLASK_BACKEND_URL}/api/chat/${sessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${FLASK_BACKEND_URL}/api/health`, { method: 'GET' });
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}

/**
 * Reverse-geocode lat/lng using the free OpenStreetMap Nominatim API.
 * No API key required. Returns city, state, country, countryCode.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<LocationData> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'MedAssistAI/1.0' },
  });

  if (!res.ok) throw new Error('Geocoding failed');

  const data = await res.json();
  const addr = data.address || {};

  const city        = addr.city || addr.town || addr.village || addr.county || '';
  const state       = addr.state || addr.region || '';
  const country     = addr.country || '';
  const countryCode = (addr.country_code || '').toUpperCase();

  const parts = [city, state, country].filter(Boolean);
  const displayName = parts.join(', ');

  return { lat, lng, city, state, country, countryCode, displayName };
}
