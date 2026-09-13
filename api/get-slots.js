import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const normalizeSupabaseUrl = (value = '') => { const match = value.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]+)\/?$/i); return match ? `https://${match[1]}.supabase.co` : value.replace(/\/$/, ''); };
const dayBounds = (date) => ({ start: new Date(`${date}T00:00:00+08:00`), end: new Date(`${date}T00:00:00+08:00`).getTime() + 86400000 });
const emptySlots = (response) => response.status(200).json({ success: true, bookedSlots: [] });

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ success: false, error: 'Method not allowed' });
  const date = request.query?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(new Date(`${date}T12:00:00+08:00`).getTime())) return response.status(400).json({ success: false, error: 'A valid date is required' });
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!supabaseUrl || !supabaseKey) { console.warn('Slot lookup skipped: Supabase credentials are missing.'); return emptySlots(response); }
  try {
    const bounds = dayBounds(date), supabase = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, { auth: { persistSession: false } });
    // Filter status in JS, not via a DB-level .in()/.neq() filter: Postgres NULL fails those comparisons,
    // which would silently drop bookings with no status set and let their slots double-book.
    const { data, error } = await supabase.from('bookings').select('start_time,end_time,status').gte('start_time', bounds.start.toISOString()).lt('start_time', new Date(bounds.end).toISOString()).order('start_time', { ascending: true });
    if (error) throw error;
    const activeBookings = (data || []).filter((row) => row.status !== 'cancelled');
    return response.status(200).json({ success: true, bookedSlots: activeBookings.map((row) => ({ start: row.start_time, end: row.end_time })) });
  } catch (error) { console.error('Could not read booking slots:', error); return emptySlots(response); }
}