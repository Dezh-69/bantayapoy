import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Role = 'admin' | 'bfp_responder' | 'resident';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  contact_number: string | null;
  device_id: string | null;
  setup_complete: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: string;
  device_code: string;
  label: string;
  location_desc: string;
  api_key: string;
  co_threshold: number;
  temp_threshold: number;
  bfp_contact: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface SensorReading {
  id: string;
  device_id: string;
  co_ppm: number;
  temp_celsius: number;
  latitude: number | null;
  longitude: number | null;
  gps_valid: boolean;
  on_battery: boolean;
  sensor_ready: boolean;
  recorded_at: string;
}

export interface AlertEvent {
  id: string;
  device_id: string;
  alert_tier: 1 | 2;
  co_ppm: number;
  temp_celsius: number;
  latitude: number | null;
  longitude: number | null;
  gps_valid: boolean;
  address_resolved: string | null;
  telegram_sent: boolean;
  sms_sent_owner: boolean;
  sms_sent_bfp: boolean;
  resolved_at: string | null;
  triggered_at: string;
  devices?: Device; // For joined queries
}
