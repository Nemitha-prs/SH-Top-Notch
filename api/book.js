import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const compactUtc = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
const toPerthDate = (date, time) => new Date(`${date}T${time}:00+08:00`); // explicit +08:00 offset yields a correct UTC instant regardless of server timezone
const minutesFromTime = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
const normalizeSupabaseUrl = (value = '') => { const match = value.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]+)\/?$/i); return match ? `https://${match[1]}.supabase.co` : value.replace(/\/$/, ''); };
const calendarInvite = (booking, start, end) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SH Top Notch//Booking//EN', 'METHOD:REQUEST', 'BEGIN:VEVENT', `UID:${booking.uid}`, `DTSTAMP:${compactUtc(new Date())}`, `DTSTART:${compactUtc(start)}`, `DTEND:${compactUtc(end)}`, `SUMMARY:SH Top Notch Detailing - ${booking.service_package} (${booking.client_name})`, `LOCATION:${booking.address}`, `DESCRIPTION:Vehicle: ${booking.vehicle_type}\\nMobile: ${booking.client_phone}\\nEmail: ${booking.client_email}`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
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
  if (startDate.getTime() <= Date.now()) return response.status(400).json({ success: false, error: 'This appointment time has already passed. Please choose a future time.' });
  if (startDate.getTime() < Date.now() + 2 * 60 * 60 * 1000) return response.status(400).json({ success: false, error: 'Bookings require a minimum of 2 hours notice.' });
  const endDate = new Date(startDate.getTime() + duration_minutes * 60000);
  const perthDay = new Date(`${date}T12:00:00+08:00`).getDay();
  if (perthDay === 5 && (minutesFromTime(start_time) < 16 * 60 || minutesFromTime(start_time) + duration_minutes > 18 * 60)) return response.status(400).json({ success: false, error: 'Friday bookings are available from 4:00 PM to 6:00 PM only.' });
  let booking;
  try {
    const supabase = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, { auth: { persistSession: false } });
    // Overlap rule: an existing (non-cancelled) booking conflicts if it starts before our slot ends AND ends after our slot starts.
    // start_time/end_time are stored as UTC timestamptz (converted from the +08:00 instant above), so this compares like-for-like instants.
    const overlapCheck = await supabase.from('bookings').select('id,status').lt('start_time', endDate.toISOString()).gt('end_time', startDate.toISOString());
    if (overlapCheck.error) { console.error('Supabase overlap check error:', overlapCheck.error); return response.status(500).json({ success: false, error: `Database check error: ${overlapCheck.error.message}` }); }
    if ((overlapCheck.data || []).some((row) => row.status !== 'cancelled')) return response.status(409).json({ success: false, error: 'This slot is already booked. Please choose another time.' });
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

    const sectionHeader = (label) => `<tr><td style="padding:24px 0 8px;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#1f2937;border-bottom:1px solid #e5e7eb">${label}</td></tr>`;
    const detailRow = (label, value) => `<tr><td style="padding:6px 12px 6px 0;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#4b5563;width:42%;vertical-align:top">${label}</td><td style="padding:6px 0;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#111827;font-weight:600;vertical-align:top">${value}</td></tr>`;

    const customerHtml = `
    <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px">
        <tr>
          <td style="padding:32px 32px 8px">
            <h1 style="margin:0 0 12px;font-size:20px;color:#111827">Booking Confirmed ✅</h1>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4b5563">Hi ${escapeHtml(client_name)},</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563">Thank you for choosing SH Top Notch Auto Detailing. Your workshop appointment is confirmed.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${sectionHeader('Appointment Details')}
              <tr><td colspan="2">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
                  ${detailRow('Date', escapeHtml(displayDate))}
                  ${detailRow('Drop-off Time', escapeHtml(displayStartTime))}
                  ${detailRow('Estimated Ready Time', escapeHtml(displayEndTime))}
                  ${detailRow('Package', escapeHtml(service_package))}
                  ${detailRow('Vehicle', escapeHtml(formattedVehicle))}
                </table>
              </td></tr>
              ${sectionHeader('Workshop Address')}
              <tr><td colspan="2" style="padding:8px 0 4px;font-size:14px;line-height:1.6;color:#111827">
                SH Top Notch Auto Detailing<br>${ADDRESS_LINE}
              </td></tr>
              ${sectionHeader('Your Contact Details')}
              <tr><td colspan="2">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
                  ${detailRow('Name', escapeHtml(client_name))}
                  ${detailRow('Mobile', escapeHtml(client_phone))}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px" width="50%">
                  <a href="${googleUrl}" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:12px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:700">Add to Calendar</a>
                </td>
                <td style="padding-left:8px" width="50%">
                  <a href="${directionsUrl}" style="display:block;background:#111827;color:#ffffff;text-align:center;padding:12px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:700">Get Directions</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563">Please arrive promptly at ${escapeHtml(displayStartTime)} so we can inspect the vehicle with you before starting. Please remove any personal valuables from the interior.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 8px 8px">
            <p style="margin:0 0 4px;font-size:13px;color:#4b5563">Phone: <a href="tel:${OWNER_MOBILE.replace(/\s+/g, '')}" style="color:#2563eb;text-decoration:none">${OWNER_MOBILE}</a></p>
            <p style="margin:0 0 4px;font-size:13px;color:#4b5563">Email: <a href="mailto:info@shtopnotch.com.au" style="color:#2563eb;text-decoration:none">info@shtopnotch.com.au</a></p>
            <p style="margin:0;font-size:13px;color:#4b5563">Instagram: <a href="https://instagram.com/sh_topnotch" style="color:#2563eb;text-decoration:none">@sh_topnotch</a></p>
          </td>
        </tr>
      </table>
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

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
        <tr><td>
          <a href="${googleUrl}" style="display:block;background:#2563eb;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold">📅 Add to My Google Calendar</a>
        </td></tr>
      </table>
      <p style="margin-top:12px"><a href="${directionsUrl}">Workshop Directions</a></p>
    </div>`;

    const icsUid = `${bookingId || Date.now()}@shtopnotch.com.au`;
    const attachments = [{ filename: 'sh-top-notch-booking.ics', content: Buffer.from(calendarInvite({ uid: icsUid, client_name, client_phone, client_email, service_package, vehicle_type: formattedVehicle, address }, startDate, endDate)) }];
    console.log('Dispatching customer confirmation to:', client_email);
    console.log('Dispatching owner alert to:', ownerEmail);
    const [customerResult, ownerResult] = await Promise.allSettled([
      resend.emails.send({ from: fromEmail, to: [client_email], subject: `Confirmed: Detailing Appointment at SH Top Notch (${displayDate})`, html: customerHtml, attachments }),
      resend.emails.send({ from: fromEmail, to: [ownerEmail], subject: `🚨 NEW BOOKING: ${client_name} - ${displayDate} @ ${displayStartTime}`, html: ownerHtml, attachments }),
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