import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const compactUtc = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
const toPerthDate = (date, time) => new Date(`${date}T${time}:00+08:00`);
const minutesFromTime = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
const normalizeSupabaseUrl = (value = '') => { const match = value.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]+)\/?$/i); return match ? `https://${match[1]}.supabase.co` : value.replace(/\/$/, ''); };
const calendarInvite = (booking, start, end) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SH Top Notch//Booking//EN', 'METHOD:REQUEST', 'BEGIN:VEVENT', `DTSTART:${compactUtc(start)}`, `DTEND:${compactUtc(end)}`, 'SUMMARY:SH Top Notch Auto Detailing', `LOCATION:${booking.address}`, `DESCRIPTION:Service: ${booking.service_package}\nVehicle: ${booking.vehicle_type}\nClient: ${booking.client_name}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ success: false, error: 'Method not allowed' });
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
  const client_name = body.client_name || body.name;
  const client_email = body.client_email || body.email;
  const client_phone = body.client_phone || body.phone;
  const service_package = body.service_package || body.servicePackage;
  const vehicle_type = body.vehicle_type || body.vehicleType;
  const vehicle_model = body.vehicle_model || body.vehicleModel || 'Unspecified';
  const address = body.address;
  const date = body.date;
  const start_time = body.start_time || body.startTime;
  const duration_minutes = Number.parseInt(body.duration_minutes || body.duration, 10) || 120;
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  const fromEmail = process.env.FROM_EMAIL?.trim() || 'SH Top Notch <onboarding@resend.dev>';
  console.log('--- [API/BOOK ENVIRONMENT CHECK] ---');
  console.log('SUPABASE_URL:', supabaseUrl ? 'FOUND' : 'MISSING');
  console.log('SUPABASE_KEY:', supabaseKey ? 'FOUND' : 'MISSING');
  console.log('RESEND_API_KEY:', resendApiKey ? 'FOUND' : 'MISSING');
  console.log('OWNER_EMAIL:', ownerEmail || 'MISSING');
  console.log('-----------------------------------');
  if (!supabaseUrl || !supabaseKey) return response.status(500).json({ success: false, error: 'Database credentials missing from environment variables (.env.local).' });
  if ([client_name, client_email, service_package, vehicle_type, address, date, start_time].some((value) => !value)) return response.status(400).json({ success: false, error: 'Missing booking details' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start_time) || !Number.isInteger(duration_minutes) || duration_minutes <= 0) return response.status(400).json({ success: false, error: 'Invalid booking date, time, or duration' });
  const startDate = toPerthDate(date, start_time);
  if (Number.isNaN(startDate.getTime())) return response.status(400).json({ success: false, error: 'Invalid booking date or time' });
  const endDate = new Date(startDate.getTime() + duration_minutes * 60000);
  const perthDay = new Date(`${date}T12:00:00+08:00`).getDay();
  if (perthDay === 5 && (minutesFromTime(start_time) < 16 * 60 || minutesFromTime(start_time) + duration_minutes > 18 * 60)) return response.status(400).json({ success: false, error: 'Friday bookings are available from 4:00 PM to 6:00 PM only.' });
  let booking;
  try {
    const supabase = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, { auth: { persistSession: false } });
    const result = await supabase.from('bookings').insert([{ client_name, client_email, client_phone, service_package, vehicle_type: `${vehicle_type} (${vehicle_model})`, address, start_time: startDate.toISOString(), end_time: endDate.toISOString() }]).select();
    if (result.error) { console.error('Supabase DB Insert Error:', result.error); return response.status(500).json({ success: false, error: `Database insert error: ${result.error.message}` }); }
    booking = result.data;
  } catch (dbError) { console.error('Supabase DB Insert Error:', dbError); return response.status(500).json({ success: false, error: `Database insert error: ${dbError.message}` }); }
  try {
    if (!resendApiKey || !ownerEmail) throw new Error('RESEND_API_KEY or OWNER_EMAIL is missing from environment variables.');
    const resend = new Resend(resendApiKey), formattedVehicle = `${vehicle_type} (${vehicle_model})`, details = `Service: ${service_package}\nVehicle: ${formattedVehicle}\nClient Phone: ${client_phone}\nAddress: ${address}`;
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Car Detailing - ${service_package} (${client_name})`)}&dates=${compactUtc(startDate)}/${compactUtc(endDate)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(address)}`;
    const customerHtml = `<div style="background:#0b0f17;color:#fff;padding:32px;font-family:Arial,sans-serif"><h1 style="color:#00d2ff">Booking confirmed</h1><p>Hi ${escapeHtml(client_name)}, your SH Top Notch Auto Detailing appointment is confirmed.</p><p><strong>Service:</strong> ${escapeHtml(service_package)}<br><strong>Date:</strong> ${escapeHtml(date)}<br><strong>Time:</strong> ${escapeHtml(start_time)} AWST<br><strong>Vehicle:</strong> ${escapeHtml(formattedVehicle)}<br><strong>Address:</strong> ${escapeHtml(address)}<br><strong>Mobile:</strong> ${escapeHtml(client_phone)}</p><p><a href="${googleUrl}">Add to Google Calendar</a></p></div>`;
    const ownerHtml = `<h2>New SH Top Notch booking</h2><p><strong>Name:</strong> ${escapeHtml(client_name)}<br><strong>Phone:</strong> ${escapeHtml(client_phone)}<br><strong>Email:</strong> ${escapeHtml(client_email)}<br><strong>Address/Suburb:</strong> ${escapeHtml(address)}<br><strong>Vehicle:</strong> ${escapeHtml(formattedVehicle)}<br><strong>Service:</strong> ${escapeHtml(service_package)}<br><strong>Scheduled:</strong> ${escapeHtml(date)} at ${escapeHtml(start_time)} AWST</p><p><a href="${googleUrl}">Open Google Calendar event</a></p>`;
    const attachments = [{ filename: 'sh-top-notch-booking.ics', content: Buffer.from(calendarInvite({ client_name, service_package, vehicle_type: formattedVehicle, address }, startDate, endDate)) }];
    const [customerResult, ownerResult] = await Promise.all([resend.emails.send({ from: fromEmail, to: [client_email], subject: 'Booking Confirmed: SH Top Notch Auto Detailing', html: customerHtml, attachments }), resend.emails.send({ from: fromEmail, to: [ownerEmail], subject: `🚨 NEW BOOKING: ${service_package} - ${client_name}`, html: ownerHtml })]);
    if (customerResult.error || ownerResult.error) throw new Error(customerResult.error?.message || ownerResult.error?.message || 'Email dispatch failed');
  } catch (emailErr) { console.error('Resend Error:', emailErr.message); return response.status(200).json({ success: true, bookingId: booking?.[0]?.id, warning: 'Booking saved, email alert failed.' }); }
  return response.status(200).json({ success: true, bookingId: booking?.[0]?.id });
}