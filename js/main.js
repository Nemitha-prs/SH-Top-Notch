(() => {
	const preloader = document.querySelector('.preloader');
	if (preloader) window.addEventListener('load', () => window.setTimeout(() => preloader.classList.add('is-hidden'), 80), { once: true });

	const packageGrid = document.querySelector('#package-grid');
	if (packageGrid) {
		const maintenanceLabel = document.querySelector('.maintenance-banner strong');
		if (maintenanceLabel) maintenanceLabel.textContent = 'Regular Maintenance Discounts:';
		const prices = {
			full: { Entry: { hatch: 169, sedan: 199, '4wd': 229, seven: 269 }, Transitional: { hatch: 339, sedan: 409, '4wd': 469, seven: 499 }, TopNotch: { hatch: 519, sedan: 609, '4wd': 699, seven: 729 } },
			interior: { Transitional: { hatch: 169, sedan: 199, '4wd': 229, seven: 259 }, TopNotch: { hatch: 279, sedan: 309, '4wd': 349, seven: 389 } }
		};
		const packages = {
			full: [{ name: 'Entry Detail', key: 'Entry', items: ['Foam pre-wash', 'Two-bucket contact wash', 'Wheel face & barrel clean', 'Tire dressing', 'Interior vacuum', 'Dash & console wipe down', 'Streak-free window clean'] }, { name: 'Transitional Detail', key: 'Transitional', items: ['Everything in Entry', 'Chemical decontamination: iron remover & clay bar', 'Light paint enhancement wax', 'Deep carpet/upholstery shampoo & steam clean', 'Leather conditioner', 'Door jamb detail'] }, { name: 'TopNotch Detail', key: 'TopNotch', items: ['Complete paint decontamination', 'Single-stage machine polish', '12-month ceramic spray sealant', 'Intense deep interior extraction', 'Engine bay detail', 'Plastic trim UV restoration'] }],
			interior: [{ name: 'Transitional Detail', key: 'Transitional', items: ['Full interior blowout', 'Heavy vacuum', 'Shampoo extraction on cloth seats/carpets', 'Leather cleaned and conditioned', 'Trim steam cleaned and sanitized'] }, { name: 'TopNotch Detail', key: 'TopNotch', items: ['Everything in Transitional Interior', 'Roof lining spot clean', 'Odor neutralization', 'Fabric/leather protective ceramic shield coating', 'Air vent disinfection'] }]
		};
		let category = 'full'; let vehicle = 'hatch';
		const vehicleNames = { hatch: 'Hatchback', sedan: 'Sedan', '4wd': '4WD', seven: '7-Seater' };
		packageGrid.classList.add('service-view-panel', 'active');
		const render = (animate = false) => {
			const update = () => { packageGrid.innerHTML = packages[category].map((item, index) => `<article class="package-card${index === 1 ? ' featured' : ''}"><p class="eyebrow">0${index + 1} / ${category === 'full' ? 'Full detail' : 'Interior only'}</p><h2>${item.name}</h2><p>${category === 'full' ? 'A complete mobile finish, tailored to your vehicle and its day-to-day demands.' : 'A thorough interior reset for a fresher, cleaner cabin.'}</p><div class="price-large">$${prices[category][item.key][vehicle]} <span>AUD / ${vehicleNames[vehicle]}</span></div><ul>${item.items.map((service) => `<li>${service}</li>`).join('')}</ul><a class="button dark" href="book.html?package=${item.key}&type=${vehicleNames[vehicle]}&category=${category === 'full' ? 'FullDetail' : 'InteriorOnly'}">Book This Service</a></article>`).join(''); };
			if (!animate) { update(); return; }
			packageGrid.style.opacity = '0'; packageGrid.style.transform = 'translate3d(0,-6px,0)';
			window.setTimeout(() => { update(); packageGrid.style.opacity = ''; packageGrid.style.transform = ''; }, 160);
		};
		document.querySelectorAll('[data-category]').forEach((button) => { button.classList.add('service-toggle-btn'); button.addEventListener('click', () => { if (category === button.dataset.category) return; category = button.dataset.category; document.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-selected', String(item === button))); render(true); }); });
		document.querySelectorAll('[data-vehicle]').forEach((button) => { button.classList.add('service-toggle-btn'); button.addEventListener('click', () => { if (vehicle === button.dataset.vehicle) return; vehicle = button.dataset.vehicle; document.querySelectorAll('[data-vehicle]').forEach((item) => item.setAttribute('aria-selected', String(item === button))); render(true); }); });
		render();
	}

	const header = document.querySelector('.site-header');
	const toggle = document.querySelector('.nav-toggle');
	if (header && toggle) {
		toggle.addEventListener('click', () => {
			const open = header.classList.toggle('mobile-menu-open');
			toggle.setAttribute('aria-expanded', String(open));
			toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
		});
	}
})();
