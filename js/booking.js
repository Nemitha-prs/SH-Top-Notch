(() => {
  const form = document.querySelector('#booking-form'); if (!form) return;
  const durations = { 'Entry Detail': { Hatchback: 120, Sedan: 120, '4WD': 180 }, 'Transitional Detail': { Hatchback: 180, Sedan: 180, '4WD': 210 }, 'TopNotch Detail': { Hatchback: 240, Sedan: 240, '4WD': 300 } };
  const windows = { 0: ['07:00', '18:00'], 1: ['07:00', '14:00'], 2: null, 3: ['07:00', '18:00'], 4: null, 5: ['16:00', '18:00'], 6: ['07:00', '18:00'] };
  const steps = [...form.querySelectorAll('.form-step')], progress = [...document.querySelectorAll('[data-progress]')], packageField = document.querySelector('#servicePackage'), vehicleField = document.querySelector('#vehicleType'), dateField = document.querySelector('#bookingDate'), startField = document.querySelector('#selectedTime'), slots = document.querySelector('#slotsContainer'), slotStatus = document.querySelector('#slot-status'), durationCopy = document.querySelector('#duration-copy'), error = document.querySelector('#form-error');
  let currentStep = 1, bookedRanges = [], currentDuration = 0, selectedTime = '';
  const pad = (value) => String(value).padStart(2, '0');
  const minutesFromTime = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
  const timeFromMinutes = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const duration = () => durations[packageField.value]?.[vehicleField.value] || 0;
  const dateAtTime = (date, time) => new Date(`${date}T${time}:00+08:00`);
  const isClosed = (date) => !date || !windows[new Date(`${date}T12:00:00+08:00`).getDay()];
  const showError = (message) => { error.textContent = message; error.hidden = !message; };
  const setStep = (step) => { currentStep = step; steps.forEach((item) => item.classList.toggle('active', Number(item.dataset.step) === step)); progress.forEach((item) => item.classList.toggle('active', Number(item.dataset.progress) <= step)); };
  const validStep = () => [...steps[currentStep - 1].querySelectorAll('input, select, textarea')].every((field) => field.reportValidity());
  const renderSlots = () => {
    slots.innerHTML = ''; startField.value = ''; selectedTime = ''; const date = dateField.value, selectedDuration = duration(); currentDuration = selectedDuration;
    if (!date || !selectedDuration) { slots.innerHTML = '<p class="slot-empty">Choose a service, vehicle, and date first.</p>'; return; }
    const dayWindow = windows[new Date(`${date}T12:00:00+08:00`).getDay()];
    if (!dayWindow) { slots.innerHTML = '<p class="slot-empty">This day is closed. Please choose another date.</p>'; slotStatus.textContent = ''; return; }
    for (let start = minutesFromTime(dayWindow[0]); start + selectedDuration <= minutesFromTime(dayWindow[1]); start += 30) {
      const startTime = timeFromMinutes(start), startDate = dateAtTime(date, startTime), endDate = new Date(startDate.getTime() + selectedDuration * 60000), button = document.createElement('button');
      button.type = 'button'; button.className = 'time-slot'; button.textContent = startTime; button.dataset.time = startTime;
      const booked = bookedRanges.some((range) => startDate < new Date(range.end) && endDate > new Date(range.start));
      if (booked) { button.disabled = true; button.title = 'Booked / Unavailable'; button.setAttribute('aria-label', `${startTime}, booked`); } else { button.addEventListener('click', () => { document.querySelectorAll('.time-slot').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); selectedTime = startTime; startField.value = selectedTime; slotStatus.textContent = `${startTime} to ${timeFromMinutes(start + selectedDuration)} AWST selected.`; }); }
      slots.appendChild(button);
    }
    if (!slots.children.length) slots.innerHTML = '<p class="slot-empty">No times remain on this date. Please choose another day.</p>';
  };
  const loadSlots = async () => { bookedRanges = []; renderSlots(); if (!dateField.value || isClosed(dateField.value)) return; slotStatus.textContent = 'Checking live availability...'; try { const response = await fetch(`/api/get-slots?date=${encodeURIComponent(dateField.value)}`); if (!response.ok) throw new Error(`Availability request failed (${response.status})`); const result = await response.json(); bookedRanges = Array.isArray(result) ? result : (result.bookedSlots || []); renderSlots(); slotStatus.textContent = ''; } catch (requestError) { console.warn('Live availability is unavailable; showing operating-hour slots.', requestError); bookedRanges = []; renderSlots(); slotStatus.textContent = 'Live availability is unavailable; showing operating-hour slots.'; } };
  const today = new Date(); today.setHours(0, 0, 0, 0); dateField.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  packageField.addEventListener('change', () => { durationCopy.textContent = duration() ? `This appointment takes ${Math.floor(duration() / 60)} hours${duration() % 60 ? ` ${duration() % 60} minutes` : ''}.` : 'Your appointment duration will appear here.'; if (dateField.value) loadSlots(); });
  vehicleField.addEventListener('change', () => { packageField.dispatchEvent(new Event('change')); });
  dateField.addEventListener('change', () => { const closed = isClosed(dateField.value); dateField.classList.toggle('closed-date', closed); dateField.setCustomValidity(closed ? 'Tuesdays and Thursdays are closed.' : ''); loadSlots(); });
  form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => { if (validStep()) setStep(Math.min(3, currentStep + 1)); }));
  form.querySelectorAll('[data-prev]').forEach((button) => button.addEventListener('click', () => setStep(Math.max(1, currentStep - 1))));
  form.addEventListener('submit', (event) => {
    event.preventDefault(); showError(''); if (!validStep() || !startField.value) { if (!startField.value) showError('Please choose an available starting time.'); return; }
    const payload = { client_name: document.getElementById('clientName')?.value.trim(), client_email: document.getElementById('clientEmail')?.value.trim(), client_phone: document.getElementById('clientPhone')?.value.trim(), address: document.getElementById('clientAddress')?.value.trim(), service_package: document.getElementById('servicePackage')?.value, vehicle_type: document.getElementById('vehicleType')?.value, vehicle_model: document.getElementById('vehicleModel')?.value.trim() || 'Unspecified', date: document.getElementById('bookingDate')?.value, start_time: selectedTime, duration_minutes: currentDuration };
    console.log('Sending booking payload:', payload);
    const address = payload.address, start = dateAtTime(payload.date, payload.start_time), end = new Date(start.getTime() + payload.duration_minutes * 60000), details = `Service: ${payload.service_package}\nVehicle: ${payload.vehicle_model}\nClient Phone: ${payload.client_phone}\nAddress: ${address}`, compact = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
    fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(async (res) => { const result = await res.json().catch(() => ({})); if (!res.ok) { const errMessage = result.error || JSON.stringify(result); console.error('API Error Details:', result); alert(`Booking notice: ${errMessage}`); return; } if (result.warning) console.warn('API Warning:', result.warning); sessionStorage.setItem('latest_booking', JSON.stringify(payload)); const confirmationTab = window.open('confirmation.html', '_blank'); if (!confirmationTab) window.location.href = 'confirmation.html'; }).catch((requestError) => { console.error('Booking request failed:', requestError); alert(`Booking notice: ${requestError.message || 'Network request failed.'}`); });
  });
})();