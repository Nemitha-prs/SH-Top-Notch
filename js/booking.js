(() => {
  const form = document.querySelector('#booking-form'); if (!form) return;
  const durations = { 'Entry Detail': { Hatchback: 120, Sedan: 120, '4WD': 180 }, 'Transitional Detail': { Hatchback: 180, Sedan: 180, '4WD': 210 }, 'TopNotch Detail': { Hatchback: 240, Sedan: 240, '4WD': 300 } };
  const windows = { 0: ['07:00', '18:00'], 1: ['07:00', '14:00'], 2: null, 3: ['07:00', '18:00'], 4: null, 5: ['16:00', '18:00'], 6: ['07:00', '18:00'] };
  const steps = [...form.querySelectorAll('.form-step')], progress = [...document.querySelectorAll('[data-progress]')], packageField = document.querySelector('#servicePackage'), vehicleField = document.querySelector('#vehicleType'), dateField = document.querySelector('#bookingDate'), startField = document.querySelector('#selectedTime'), timeInput = document.getElementById('selected-time-input'), slots = document.querySelector('#slotsContainer'), slotStatus = document.querySelector('#slot-status'), durationCopy = document.querySelector('#duration-copy'), error = document.querySelector('#form-error'), phoneInput = document.getElementById('customer-phone'), phoneError = phoneInput?.parentElement?.querySelector('.field-error');
  const dropOffAddress = '9 Addingham Dr, Ellenbrook WA 6069';
  const availabilityCache = {};
  let currentStep = 1, bookedRanges = [], currentDuration = 0, selectedTime = '', currentSelectedTime = '';
  const pad = (value) => String(value).padStart(2, '0');
  const PERTH_OFFSET_MS = 8 * 60 * 60 * 1000;
  // Perth (Australia/Perth) has no DST, so shifting the UTC epoch by a fixed +8h and reading UTC getters yields Perth wall-clock time regardless of the visitor's local timezone.
  const perthNow = () => new Date(Date.now() + PERTH_OFFSET_MS);
  const perthTodayStr = () => { const p = perthNow(); return `${p.getUTCFullYear()}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`; };
  const MIN_NOTICE_MS = 2 * 60 * 60 * 1000;
  const minutesFromTime = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
  const timeFromMinutes = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const duration = () => durations[packageField.value]?.[vehicleField.value] || 0;
  const dateAtTime = (date, time) => new Date(`${date}T${time}:00+08:00`);
  const isPastDate = (date) => !date || date < perthTodayStr();
  const isClosed = (date) => !date || isPastDate(date) || !windows[new Date(`${date}T12:00:00+08:00`).getDay()];
  const showLoadingSlots = () => {
    if (!slots) return;
    slots.innerHTML = '<div class="slots-loading"><span class="slots-spinner"></span><span>Checking live availability...</span></div>';
    persistSelectedTime('');
    slotStatus.textContent = '';
  };
  const showError = (message) => { error.textContent = message; error.hidden = !message; };
  const persistSelectedTime = (value) => {
    currentSelectedTime = value || '';
    selectedTime = currentSelectedTime;
    if (startField) startField.value = currentSelectedTime;
    if (timeInput) timeInput.value = currentSelectedTime;
  };
  const restoreSelectedTime = () => {
    if (!currentSelectedTime) return;
    const match = Array.from(document.querySelectorAll('.time-slot')).find((button) => (button.getAttribute('data-time') || button.textContent.trim()) === currentSelectedTime);
    if (match) match.classList.add('selected');
  };
  const setStep = (step) => { currentStep = step; steps.forEach((item) => item.classList.toggle('active', Number(item.dataset.step) === step)); progress.forEach((item) => item.classList.toggle('active', Number(item.dataset.progress) <= step)); };
  const validStep = () => [...steps[currentStep - 1].querySelectorAll('input, select, textarea')].every((field) => {
    if (field === phoneInput) {
      const phoneValue = field.value.trim();
      const isPhoneValid = /^(?:\+61|0)?\s?(?:\d[\s-]?){8,}\d$/.test(phoneValue.replace(/\s+/g, ''));
      if (!isPhoneValid) {
        field.setCustomValidity('Please enter a valid mobile number.');
        if (phoneError) phoneError.style.display = 'inline';
      } else {
        field.setCustomValidity('');
        if (phoneError) phoneError.style.display = 'none';
      }
    }
    return field.reportValidity();
  });
  const renderSlots = (bookedRangesData = bookedRanges) => {
    if (!slots) return;
    const date = dateField.value, selectedDuration = duration(); currentDuration = selectedDuration;
    slots.innerHTML = '';
    if (!date || !selectedDuration) { slots.innerHTML = '<p class="slot-empty">Choose a service, vehicle, and date first.</p>'; return; }
    if (isPastDate(date)) { slots.innerHTML = '<p class="slot-empty">This date has passed. Please choose another date.</p>'; slotStatus.textContent = ''; persistSelectedTime(''); return; }
    const dayWindow = windows[new Date(`${date}T12:00:00+08:00`).getDay()];
    if (!dayWindow) { slots.innerHTML = '<p class="slot-empty">This day is closed. Please choose another date.</p>'; slotStatus.textContent = ''; persistSelectedTime(''); return; }
    const fragment = document.createDocumentFragment();
    const slotTimes = [];
    for (let start = minutesFromTime(dayWindow[0]); start + selectedDuration <= minutesFromTime(dayWindow[1]); start += 30) {
      const slotTime = timeFromMinutes(start);
      slotTimes.push(slotTime);
      const startDate = dateAtTime(date, slotTime);
      const endDate = new Date(startDate.getTime() + selectedDuration * 60000);
      const tooSoon = startDate.getTime() < Date.now() + MIN_NOTICE_MS;
      const isBooked = bookedRangesData.some((range) => startDate < new Date(range.end) && endDate > new Date(range.start));
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'time-slot'; button.textContent = slotTime; button.dataset.time = slotTime;
      if (isBooked || tooSoon) {
        button.disabled = true;
        button.title = tooSoon && !isBooked ? 'Requires at least 2 hours notice' : 'Booked / Unavailable';
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('aria-label', `${slotTime}, ${tooSoon && !isBooked ? 'requires 2 hours notice' : 'booked'}`);
      } else {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          document.querySelectorAll('.time-slot').forEach((item) => item.classList.remove('selected'));
          button.classList.add('selected');
          const selectedText = button.getAttribute('data-time') || button.textContent.trim();
          persistSelectedTime(selectedText);
          slotStatus.textContent = `${selectedText} to ${timeFromMinutes(start + selectedDuration)} AWST selected.`;
        });
      }
      fragment.appendChild(button);
    }
    if (!fragment.childNodes.length) { slots.innerHTML = '<p class="slot-empty">No times remain on this date. Please choose another day.</p>'; persistSelectedTime(''); return; }
    slots.appendChild(fragment);
    if (currentSelectedTime) {
      const match = Array.from(document.querySelectorAll('.time-slot')).find((button) => (button.getAttribute('data-time') || button.textContent.trim()) === currentSelectedTime);
      if (match) match.classList.add('selected');
    }
  };
  const loadSlots = async () => {
    if (!dateField.value || isClosed(dateField.value)) {
      if (slots) slots.innerHTML = '<p class="slot-empty">Choose a service, vehicle, and date first.</p>';
      return;
    }
    const selectedDate = dateField.value;
    showLoadingSlots();
    const cached = availabilityCache[selectedDate];
    if (cached) {
      bookedRanges = cached;
      renderSlots(cached);
      slotStatus.textContent = '';
      return;
    }
    try {
      const response = await fetch(`/api/get-slots?date=${encodeURIComponent(selectedDate)}`);
      if (!response.ok) throw new Error(`Availability request failed (${response.status})`);
      const result = await response.json();
      const nextBookedRanges = Array.isArray(result) ? result : (result.bookedSlots || []);
      availabilityCache[selectedDate] = nextBookedRanges;
      bookedRanges = nextBookedRanges;
      renderSlots(nextBookedRanges);
      slotStatus.textContent = '';
    } catch (requestError) {
      console.warn('Live availability is unavailable; showing operating-hour slots.', requestError);
      bookedRanges = [];
      availabilityCache[selectedDate] = [];
      renderSlots([]);
      slotStatus.textContent = 'Live availability is unavailable; showing operating-hour slots.';
    }
  };
  const today = new Date(); today.setHours(0, 0, 0, 0); dateField.min = perthTodayStr();
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      const phoneValue = phoneInput.value.trim();
      const isPhoneValid = /^(?:\+61|0)?\s?(?:\d[\s-]?){8,}\d$/.test(phoneValue.replace(/\s+/g, ''));
      phoneInput.setCustomValidity(isPhoneValid ? '' : 'Please enter a valid mobile number.');
      if (phoneError) phoneError.style.display = isPhoneValid || !phoneValue ? 'none' : 'inline';
    });
  }
  packageField.addEventListener('change', () => { durationCopy.textContent = duration() ? `This appointment takes ${Math.floor(duration() / 60)} hours${duration() % 60 ? ` ${duration() % 60} minutes` : ''}.` : 'Your appointment duration will appear here.'; if (dateField.value) loadSlots(); });
  vehicleField.addEventListener('change', () => { packageField.dispatchEvent(new Event('change')); });
  dateField.addEventListener('change', () => { const closed = isClosed(dateField.value); dateField.classList.toggle('closed-date', closed); dateField.setCustomValidity(closed ? (isPastDate(dateField.value) ? 'Please choose a current or future date.' : 'Tuesdays and Thursdays are closed.') : ''); loadSlots(); });
  form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    if (currentStep === 2 && !currentSelectedTime) {
      showError('Please pick a time before continuing.');
      return;
    }
    showError('');
    if (validStep()) {
      if (currentStep === 2) restoreSelectedTime();
      setStep(Math.min(3, currentStep + 1));
    }
  }));
  form.querySelectorAll('[data-prev]').forEach((button) => button.addEventListener('click', () => {
    if (currentStep === 3) restoreSelectedTime();
    setStep(Math.max(1, currentStep - 1));
  }));
  const query = new URLSearchParams(window.location.search);
  const packageNames = { Entry: 'Entry Detail', Transitional: 'Transitional Detail', TopNotch: 'TopNotch Detail' };
  const requestedPackage = packageNames[query.get('package')] || query.get('package');
  const requestedVehicle = query.get('type');
  const vehicleOption = requestedVehicle === 'SUV' ? '4WD' : requestedVehicle;
  const packageIsValid = requestedPackage && [...packageField.options].some((option) => option.value === requestedPackage);
  const vehicleIsValid = vehicleOption && [...vehicleField.options].some((option) => option.value === vehicleOption);
  if (packageIsValid && vehicleIsValid) { packageField.value = requestedPackage; vehicleField.value = vehicleOption; packageField.dispatchEvent(new Event('change')); }
  form.addEventListener('submit', (event) => {
    event.preventDefault(); showError(''); const chosenTime = currentSelectedTime || (startField ? startField.value : '') || (timeInput ? timeInput.value : ''); const phoneValue = phoneInput?.value.trim() || ''; if (!validStep() || !chosenTime || !phoneValue) { if (!chosenTime) showError('Please choose an available starting time.'); if (!phoneValue) showError('Please enter a valid mobile number.'); return; }
    const bookingData = { client_name: document.getElementById('clientName')?.value.trim(), client_email: document.getElementById('clientEmail')?.value.trim(), client_phone: phoneValue, phone: phoneValue, address: dropOffAddress, service_package: document.getElementById('servicePackage')?.value, vehicle_type: document.getElementById('vehicleType')?.value, vehicle_model: document.getElementById('vehicleModel')?.value.trim() || 'Unspecified', date: document.getElementById('bookingDate')?.value, start_time: chosenTime, duration_minutes: currentDuration };
    console.log('Sending booking payload:', bookingData);
    const address = bookingData.address, start = dateAtTime(bookingData.date, bookingData.start_time), end = new Date(start.getTime() + bookingData.duration_minutes * 60000), details = `Service: ${bookingData.service_package}\nVehicle: ${bookingData.vehicle_model}\nClient Phone: ${bookingData.client_phone}\nAddress: ${address}`, compact = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
    fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData) }).then(async (res) => { const result = await res.json().catch(() => ({})); if (!res.ok) { const errMessage = result.error || JSON.stringify(result); console.error('API Error Details:', result); alert(`Booking notice: ${errMessage}`); return; } if (result.warning) console.warn('API Warning:', result.warning); sessionStorage.setItem('latest_booking', JSON.stringify(bookingData)); window.location.href = 'confirmation.html'; }).catch((requestError) => { console.error('Booking request failed:', requestError); alert(`Booking notice: ${requestError.message || 'Network request failed.'}`); });
  });
})();