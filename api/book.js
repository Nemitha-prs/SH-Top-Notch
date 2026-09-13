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
// --- Display-only formatting helpers for email templates (no effect on scheduling/slot logic) ---
const formatDisplayDate = (date) => new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Perth' });
const formatDisplayTime = (perthDate) => perthDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Perth' });
const cleanPhoneForWhatsApp = (phone) => { const digits = String(phone).replace(/\D/g, ''); return digits.startsWith('0') ? `61${digits.slice(1)}` : digits; };
const ADDRESS_LINE = '9 Addingham Dr, Ellenbrook WA 6069';
const DIRECTIONS_URL = 'https://maps.app.goo.gl/5TtnbEDvK2AeSDVg6';
const OWNER_MOBILE = '+61 405 505 424';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ success: false, error: 'Method not allowed' });
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
  const client_name = body.client_name || body.name;
  const client_email = body.client_email || body.email;
  const client_phone = body.client_phone || body.phone;
  const service_package = body.service_package || body.servicePackage;
  const vehicle_type = body.vehicle_type || body.vehicleType;
  const vehicle_model = body.vehicle_model || body.vehicleModel || 'Unspecified';
  const address = body.address || '9 Addingham Dr, Ellenbrook WA 6069';
  const date = body.date;
  const start_time = body.start_time || body.startTime;
  const duration_minutes = Number.parseInt(body.duration_minutes || body.duration, 10) || 120;
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const ownerEmail = process.env.OWNER_EMAIL?.replace(/^["']|["']$/g, '').trim() || 'hemsworkplace@gmail.com';
  const fromEmailRaw = (process.env.FROM_EMAIL || 'noreply@shtopnotch.com.au').replace(/^["']|["']$/g, '').trim();
  const fromEmail = fromEmailRaw.includes('<') ? fromEmailRaw : `SH Top Notch <${fromEmailRaw}>`;
  console.log('--- [API/BOOK ENVIRONMENT CHECK] ---');
  console.log('SUPABASE_URL:', supabaseUrl ? 'FOUND' : 'MISSING');
  console.log('SUPABASE_KEY:', supabaseKey ? 'FOUND' : 'MISSING');
  console.log('RESEND_API_KEY:', resendApiKey ? 'FOUND' : 'MISSING');
  console.log('OWNER_EMAIL:', ownerEmail || 'MISSING');
  console.log('-----------------------------------');
  if (!supabaseUrl || !supabaseKey) return response.status(500).json({ success: false, error: 'Database credentials missing from environment variables (.env.local).' });
  if ([client_name, client_email, client_phone, service_package, vehicle_type, address, date, start_time].some((value) => !value)) return response.status(400).json({ success: false, error: 'Missing booking details' });
  if (!/^(?:\+61|0)?\s?(?:\d[\s-]?){8,}\d$/.test(String(client_phone).replace(/\s+/g, ''))) return response.status(400).json({ success: false, error: 'Please enter a valid mobile number.' });
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
    const directionsUrl = DIRECTIONS_URL;
    const displayDate = formatDisplayDate(date);
    const displayStartTime = formatDisplayTime(startDate);
    const displayEndTime = formatDisplayTime(endDate);
    const whatsappNumberClean = cleanPhoneForWhatsApp(client_phone);
    const ownerWhatsAppUrl = `https://wa.me/${whatsappNumberClean}`;
    const ownerCallUrl = `tel:${client_phone.replace(/\s+/g, '')}`;
    const bookingId = booking?.[0]?.id || '';

    const customerHtml = `
    <div style="background:#0b0f17;color:#f5f7fa;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#00d2ff;margin:0 0 12px;font-size:22px">Booking Confirmed</h1>
      <p style="line-height:1.6">Hi ${escapeHtml(client_name)},</p>
      <p style="line-height:1.6">Thank you for choosing SH Top Notch Auto Detailing. Your workshop appointment is locked in.</p>

      <h2 style="color:#00d2ff;font-size:15px;letter-spacing:.5px;border-bottom:1px solid #23303f;padding-bottom:6px;margin:28px 0 12px">APPOINTMENT TIMELINE</h2>
      <p style="line-height:1.8;margin:0">
        <strong>Date:</strong> ${escapeHtml(displayDate)}<br>
        <strong>Drop-off Time (Start):</strong> ${escapeHtml(displayStartTime)}<br>
        <strong>Estimated Ready Time:</strong> ${escapeHtml(displayEndTime)}<br>
        <strong>Selected Package:</strong> ${escapeHtml(service_package)}<br>
        <strong>Vehicle Type:</strong> ${escapeHtml(formattedVehicle)}
      </p>

      <h2 style="color:#00d2ff;font-size:15px;letter-spacing:.5px;border-bottom:1px solid #23303f;padding-bottom:6px;margin:28px 0 12px">WORKSHOP DROP-OFF ADDRESS</h2>
      <p style="line-height:1.8;margin:0">
        SH Top Notch Auto Detailing<br>
        ${ADDRESS_LINE}<br>
        <a href="${directionsUrl}" style="color:#00d2ff">Google Maps Directions</a>
      </p>

      <h2 style="color:#00d2ff;font-size:15px;letter-spacing:.5px;border-bottom:1px solid #23303f;padding-bottom:6px;margin:28px 0 12px">YOUR CONTACT DETAILS</h2>
      <p style="line-height:1.8;margin:0">
        <strong>Name:</strong> ${escapeHtml(client_name)}<br>
        <strong>Mobile:</strong> ${escapeHtml(client_phone)}
      </p>

      <h2 style="color:#00d2ff;font-size:15px;letter-spacing:.5px;border-bottom:1px solid #23303f;padding-bottom:6px;margin:28px 0 12px">DROP-OFF INSTRUCTIONS</h2>
      <p style="line-height:1.6;margin:0">Please arrive promptly at ${escapeHtml(displayStartTime)} so we can inspect the vehicle with you prior to commencing work. Please remove any personal valuables from the interior.</p>

      <p style="line-height:1.8;margin:28px 0 4px">Need to reschedule or have questions?<br>
      Call / WhatsApp us: <a href="tel:${OWNER_MOBILE.replace(/\s+/g, '')}" style="color:#00d2ff">${OWNER_MOBILE}</a><br>
      Instagram: <a href="https://instagram.com/sh_topnotch" style="color:#00d2ff">@sh_topnotch</a></p>

      <p style="margin-top:24px"><a href="${googleUrl}" style="color:#00d2ff">Add to Google Calendar</a></p>
    </div>`;

    const ownerHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:18px;margin:0 0 16px">🚨 New Detailing Booking</h1>
      <p style="margin:0 0 16px">New detailing booking received via website.</p>

      <table style="width:100%;margin-bottom:16px" cellpadding="6" cellspacing="0">
        <tr><td colspan="2" style="background:#111;color:#fff;font-weight:bold">SCHEDULE WINDOW</td></tr>
        <tr><td><strong>Date</strong></td><td>${escapeHtml(displayDate)}</td></tr>
        <tr><td><strong>Drop-off / Start</strong></td><td>${escapeHtml(displayStartTime)}</td></tr>
        <tr><td><strong>Estimated Finish</strong></td><td>${escapeHtml(displayEndTime)}</td></tr>
      </table>

      <table style="width:100%;margin-bottom:16px" cellpadding="6" cellspacing="0">
        <tr><td colspan="2" style="background:#111;color:#fff;font-weight:bold">CUSTOMER &amp; CONTACT</td></tr>
        <tr><td><strong>Name</strong></td><td>${escapeHtml(client_name)}</td></tr>
        <tr><td><strong>Mobile</strong></td><td>${escapeHtml(client_phone)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(client_email)}</td></tr>
      </table>

      <table style="width:100%;margin-bottom:20px" cellpadding="6" cellspacing="0">
        <tr><td colspan="2" style="background:#111;color:#fff;font-weight:bold">SERVICE &amp; VEHICLE</td></tr>
        <tr><td><strong>Package</strong></td><td>${escapeHtml(service_package)}</td></tr>
        <tr><td><strong>Vehicle Size</strong></td><td>${escapeHtml(formattedVehicle)}</td></tr>
        <tr><td><strong>Location</strong></td><td>Workshop (${ADDRESS_LINE})</td></tr>
        <tr><td><strong>Booking Ref</strong></td><td>${escapeHtml(String(bookingId))}</td></tr>
      </table>

      <table style="width:100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:8px">
            <a href="${ownerCallUrl}" style="display:block;background:#0b0f17;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold">📞 Call ${escapeHtml(client_name)}</a>
          </td>
          <td style="padding-left:8px">
            <a href="${ownerWhatsAppUrl}" style="display:block;background:#25D366;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold">💬 WhatsApp</a>
          </td>
        </tr>
      </table>

      <p style="margin-top:20px"><a href="${googleUrl}">Open Google Calendar event</a> · <a href="${directionsUrl}">Workshop Directions</a></p>
    </div>`;

    const attachments = [{ filename: 'sh-top-notch-booking.ics', content: Buffer.from(calendarInvite({ client_name, service_package, vehicle_type: formattedVehicle, address }, startDate, endDate)) }];
    console.log('Dispatching customer confirmation to:', client_email);
    console.log('Dispatching owner alert to:', ownerEmail);
    const [customerResult, ownerResult] = await Promise.allSettled([
      resend.emails.send({ from: fromEmail, to: [client_email], subject: `Confirmed: Detailing Appointment at SH Top Notch (${displayDate})`, html: customerHtml, attachments }),
      resend.emails.send({ from: fromEmail, to: [ownerEmail], subject: `🚨 NEW BOOKING: ${client_name} - ${displayDate} @ ${displayStartTime}`, html: ownerHtml }),
    ]);
    // Resend resolves with { data, error } rather than rejecting, so each result must be checked independently.
    const customerSendError = customerResult.status === 'rejected' ? customerResult.reason?.message : customerResult.value?.error?.message;
    const ownerSendError = ownerResult.status === 'rejected' ? ownerResult.reason?.message : ownerResult.value?.error?.message;
    if (customerSendError) console.error('Customer confirmation email failed:', customerSendError, '- check that FROM_EMAIL is on a verified Resend domain (the onboarding@resend.dev sandbox sender can only deliver to your own account email).', JSON.stringify(customerResult.status === 'rejected' ? customerResult.reason : customerResult.value?.error));
    if (ownerSendError) console.error('Owner alert email failed:', ownerSendError, JSON.stringify(ownerResult.status === 'rejected' ? ownerResult.reason : ownerResult.value?.error));
    if (customerSendError || ownerSendError) {
      return response.status(200).json({ success: true, bookingId: booking?.[0]?.id, warning: customerSendError ? 'Booking saved, but the customer confirmation email failed to send.' : 'Booking saved, but the owner alert email failed to send.', customerEmailSent: !customerSendError, ownerEmailSent: !ownerSendError });
    }
  } catch (emailErr) { console.error('Resend Error:', emailErr.message); return response.status(200).json({ success: true, bookingId: booking?.[0]?.id, warning: 'Booking saved, email alert failed.' }); }
  return response.status(200).json({ success: true, bookingId: booking?.[0]?.id });
}