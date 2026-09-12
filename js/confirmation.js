(() => {
  const rawBooking = sessionStorage.getItem('latest_booking');
  const receipt = document.querySelector('.receipt-wrapper');
  const fallback = document.querySelector('#confirmationFallback');
  const showFallback = () => { [...receipt.children].filter((element) => element !== fallback).forEach((element) => { element.hidden = true; }); fallback.hidden = false; };
  if (!receipt || !fallback) return;
  if (!rawBooking) { showFallback(); return; }
  let booking;
  try { booking = JSON.parse(rawBooking); } catch (error) { console.error('Could not read latest booking.', error); showFallback(); return; }
  const bookingDate = String(booking.date || ''), bookingTime = String(booking.start_time || '');
  if (!bookingDate || !bookingTime) { showFallback(); return; }
  const duration = Number(booking.duration_minutes) || 120;
  const start = new Date(`${bookingDate}T${bookingTime}:00+08:00`);
  if (Number.isNaN(start.getTime())) { showFallback(); return; }
  const end = new Date(start.getTime() + duration * 60000);
  const compactUtc = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  const vehicle = `${booking.vehicle_type} (${booking.vehicle_model || 'Unspecified'})`;
  const title = `Car Detailing - ${booking.service_package} (${booking.client_name})`;
  const details = `Service: ${booking.service_package}\nVehicle: ${vehicle}\nClient Phone: ${booking.client_phone || 'Not provided'}\nAddress: ${booking.address}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compactUtc(start)}/${compactUtc(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(booking.address)}`;
  document.querySelector('#confId').textContent = `#SH-${bookingDate.replaceAll('-', '')}-${bookingTime.replace(':', '')}`;
  document.querySelector('#confPackage').textContent = booking.service_package || '-';
  document.querySelector('#confVehicle').textContent = vehicle;
  document.querySelector('#confDateTime').textContent = `${bookingDate} at ${bookingTime} AWST`;
  document.querySelector('#confAddress').textContent = booking.address;
  document.querySelector('#confContact').textContent = `${booking.client_name} / ${booking.client_phone || 'Mobile not provided'} / ${booking.client_email}`;
  document.querySelector('#confGoogleCalBtn').href = googleUrl;
  document.querySelector('#confIcsBtn').addEventListener('click', () => {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SH Top Notch//Booking//EN', 'BEGIN:VEVENT', `DTSTART:${compactUtc(start)}`, `DTEND:${compactUtc(end)}`, `SUMMARY:${title}`, `LOCATION:${booking.address}`, `DESCRIPTION:${details.replaceAll('\n', '\\n')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); link.download = 'sh-top-notch-booking.ics'; link.click(); URL.revokeObjectURL(link.href);
  });
})();