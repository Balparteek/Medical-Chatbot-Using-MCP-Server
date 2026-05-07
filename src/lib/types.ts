export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  displayName?: string;   // e.g. "Chandigarh, Punjab, India"
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
