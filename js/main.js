(() => {
	const updateOnRequestCopy = () => {
		document.title = document.title.replace(/Mobile Detailing/gi, 'Mobile on Request');
		const description = document.querySelector('meta[name="description"]');
		const heroEyebrow = document.querySelector('.hero .eyebrow');
		const heroLede = document.querySelector('.hero .lede');
		const mobileStat = document.querySelector('.stat-strip .stat:nth-child(2) span');
		const trustItem = document.querySelector('.trust-bar-section .trust-bar-item:first-child');
		if (heroEyebrow) heroEyebrow.textContent = 'Premium auto care / Perth WA';
		if (heroLede) heroLede.textContent = 'Professional detailing with mobile service available on request across Perth.';
		if (mobileStat) mobileStat.textContent = 'Mobile on Request';
		if (trustItem) { trustItem.querySelector('strong').textContent = 'Mobile on Request'; trustItem.querySelector('span').textContent = 'Perth-wide upon enquiry'; }
		if (description) description.content = description.content.replace(/mobile (car )?detailing/gi, 'professional auto care with mobile service available on request');
		document.querySelectorAll('p').forEach((paragraph) => { if (paragraph.textContent.includes('Premium mobile detailing, delivered across Perth and surrounds.')) paragraph.textContent = 'Professional detailing, delivered across Perth and surrounds. Mobile service available on request.'; });
	};
	updateOnRequestCopy();
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
			full: [{ name: 'Entry Detail', key: 'Entry', items: ['Body Wash / Dry', 'Mirrors Detail', 'Tyre Gloss', 'Wheels Detail', 'Windows Detail (Exterior & Interior)', 'Dashboard Detail', 'Rubbish Removal', 'Full Interior Vacuum'] }, { name: 'Transitional Detail', key: 'Transitional', items: ['Everything in Entry Detail', 'Wheel Arch Detail', 'Body Wax / Polish', 'Headlight Restoration', 'Carpet Shampoo', 'Deodorize Treatment', 'Door Cards Wiped', 'Interior Fine Detail', 'Pet Hair & Sand Removal'] }, { name: 'TopNotch Detail', key: 'TopNotch', items: ['Everything in Transitional Detail', 'Clay Bar Decontamination Treatment', 'Engine Bay Detail', 'Paint Protection', 'Plastic & Rubber Exterior Trim Restoration', 'Door Shuts & Jambs Deep Detail', 'Leather & Fabric Protective Treatment', 'Roof Lining Detail'] }],
			interior: [{ name: 'Transitional Detail', key: 'Transitional', items: ['Full interior blowout', 'Heavy vacuum', 'Shampoo extraction on cloth seats/carpets', 'Leather cleaned and conditioned', 'Trim steam cleaned and sanitized'] }, { name: 'TopNotch Detail', key: 'TopNotch', items: ['Everything in Transitional Interior', 'Roof lining spot clean', 'Odor neutralization', 'Fabric/leather protective ceramic shield coating', 'Air vent disinfection'] }]
		};
		let category = 'full'; let vehicle = 'hatch';
		const vehicleNames = { hatch: 'Hatchback', sedan: 'Sedan', '4wd': '4WD', seven: 'SUV' };
		const suvSelector = document.querySelector('[data-vehicle="seven"]');
		if (suvSelector?.firstChild) suvSelector.firstChild.textContent = 'SUV ';
		const fourWheelDriveSelector = document.querySelector('[data-vehicle="4wd"]');
		if (suvSelector && fourWheelDriveSelector) { suvSelector.parentElement.append(suvSelector, fourWheelDriveSelector); }
		packageGrid.classList.add('service-view-panel', 'active');
		const mobileRequestBanner = document.createElement('div');
		mobileRequestBanner.className = 'mobile-request-banner';
		mobileRequestBanner.innerHTML = '<div class="mobile-request-content"><span class="eyebrow">On-Site Service</span><h3>Need Mobile Detailing at Your Location?</h3><p>We primarily operate from our workshop. Mobile service is available strictly on request for select packages and locations.</p></div><div class="mobile-request-action"><a href="https://wa.me/61405505424?text=Hi%20SH%20Top%20Notch%2C%20I%20would%20like%20to%20enquire%20about%20a%20mobile%20detailing%20booking" target="_blank" rel="noopener noreferrer" class="button whatsapp-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="margin-right: 8px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>Enquire via WhatsApp</a></div>';
		packageGrid.parentElement.insertBefore(mobileRequestBanner, packageGrid);
		const ceramicSection = document.createElement('section');
		ceramicSection.className = 'services-category-section service-category-panel ceramic-category';
		ceramicSection.id = 'panel-ceramic-coating';
		ceramicSection.innerHTML = '<div class="container"><div class="category-header"><span class="eyebrow-tag">SPECIALIST PROTECTION</span><h2>Ceramic Coating &amp; Paint Correction</h2><p>Precision multi-stage paint restoration and long-term nano-ceramic defense.</p></div><div class="ceramic-stages-grid services-grid"><div class="stage-card service-card"><div class="stage-num card-tier-label">STAGE 01</div><h3>Pre-Coating Wash &amp; Decontamination</h3><p class="service-desc">Complete exterior purification preparing clear coat for correction.</p><div class="service-price-block"><span class="price-val">Pricing Coming Soon</span><span class="price-sub">Available for all 4 vehicle types</span></div><ul class="service-features"><li>Thorough exterior wash</li><li>Iron/fallout removal</li><li>Tar removal</li><li>Clay bar treatment</li><li>Wheels and wheel arches cleaned</li><li>Surface preparation</li></ul></div><div class="stage-card service-card"><div class="stage-num card-tier-label">STAGE 02</div><h3>Paint Correction</h3><p class="service-desc">Precision mechanical levelling to restore maximum paint clarity and gloss.</p><div class="service-price-block"><span class="price-val">Pricing Coming Soon</span><span class="price-sub">Available for all 4 vehicle types</span></div><ul class="service-features"><li>Paint inspection</li><li>Machine polishing</li><li>Removal/reduction of light swirl marks</li><li>Oxidation and minor paint defects correction</li><li>Gloss enhancement</li><li>Final panel preparation</li></ul></div><div class="stage-card service-card highlight-stage"><div class="stage-num card-tier-label">STAGE 03</div><h3>Ceramic Coating Application</h3><p class="service-desc">Long-term nano-ceramic bonding for ultimate defense and high hydrophobic shine.</p><div class="service-price-block"><span class="price-val">Pricing Coming Soon</span><span class="price-sub">Available for all 4 vehicle types</span></div><ul class="service-features"><li>Professional ceramic coating application</li><li>Paint protection</li><li>Enhanced gloss and depth</li><li>Hydrophobic water-repellent properties</li><li>Protection against environmental contaminants</li><li>Easier maintenance and cleaning</li></ul></div></div><div class="ceramic-footer-banner"><div class="pricing-notice"><span class="status-pill" data-ceramic-vehicle>Available for Hatchback</span><h4>Pricing Coming Soon</h4><p>Custom tailored following an in-person paint thickness and defect inspection.</p><span class="quote-badge">Enquire for Quote</span></div><a href="book.html?service=ceramic-coating" class="btn btn-primary">Enquire / Pre-Book</a></div></div>';
		packageGrid.closest('.section').insertAdjacentElement('afterend', ceramicSection);
		ceramicSection.style.display = 'none';
		const paintSection = document.createElement('section');
		paintSection.className = 'services-category-section service-category-panel ceramic-category';
		paintSection.id = 'panel-paint-correction';
		paintSection.style.display = 'none';
		paintSection.innerHTML = '<div class="container"><div class="category-header"><span class="eyebrow-tag">SPECIALIST FINISH</span><h2>Paint Correction</h2><p>Precision machine polishing for clearer, glossier paintwork.</p></div><div class="ceramic-stages-grid services-grid"><div class="stage-card service-card"><div class="stage-num card-tier-label">01 / PAINT CORRECTION</div><h3>Stage 1 Polish</h3><p class="service-desc">Single-stage machine enhancement to boost gloss and eliminate light hazing.</p><div class="service-price-block"><span class="price-val">Coming Soon</span><span class="price-sub">AUD / Inspection</span></div><ul class="service-features"><li>Paint inspection &amp; depth measurement</li><li>Single-stage machine polishing</li><li>Removal of minor paint defects</li><li>Gloss &amp; clarity enhancement</li><li>Final panel wipe preparation</li></ul><a href="book.html?service=stage-1-correction" class="btn btn-service">Book This Service</a></div><div class="stage-card service-card"><div class="stage-num card-tier-label">02 / PAINT CORRECTION</div><h3>Stage 2 Correction</h3><p class="service-desc">Two-stage cut and polish removing heavy swirls, oxidation, and deeper scratches.</p><div class="service-price-block"><span class="price-val">Coming Soon</span><span class="price-sub">AUD / Inspection</span></div><ul class="service-features"><li>Full digital paint depth analysis</li><li>Heavy cutting compound stage</li><li>Secondary finishing polish stage</li><li>75%-85% defect &amp; swirl reduction</li><li>High-gloss mirror finish recovery</li></ul><a href="book.html?service=stage-2-correction" class="btn btn-service">Book This Service</a></div><div class="stage-card service-card"><div class="stage-num card-tier-label">03 / PAINT CORRECTION</div><h3>Stage 3 Multi-Cut</h3><p class="service-desc">Show-car level paint perfection and wet-sanding for total defect removal.</p><div class="service-price-block"><span class="price-val">Coming Soon</span><span class="price-sub">AUD / Inspection</span></div><ul class="service-features"><li>Precision multi-step heavy compounding</li><li>Spot wet-sanding on deep imperfections</li><li>90%+ true paint clarity &amp; swirl removal</li><li>Ultra-fine jewel finish polishing</li><li>Complete panel alcohol strip</li></ul><a href="book.html?service=stage-3-correction" class="btn btn-service">Book This Service</a></div></div></div>';
		paintSection.innerHTML = '<div class="container"><div class="ceramic-stages-grid services-grid single-card-grid"><div class="service-card"><div class="card-eyebrow">01 / RESTORATION</div><h3 class="card-title">Paint Correction</h3><p class="card-desc">Comprehensive multi-stage machine compounding and polishing to eliminate swirls, scratches, and restore true optical clarity.</p><div class="card-price-row"><span class="price-amount">Coming Soon</span><span class="price-unit">/ On Inspection</span></div><ul class="service-features"><li>Paint depth gauge inspection &amp; analysis</li><li>Multi-stage machine compound &amp; polish</li><li>Removal / reduction of swirl marks &amp; light scratches</li><li>Oxidation &amp; clear coat defect correction</li><li>Gloss enhancement &amp; mirror finish restoration</li><li>Final panel wipe &amp; preparation</li></ul><a href="book.html?service=paint-correction" class="btn btn-service">Book This Service</a></div></div></div>';
		ceramicSection.innerHTML = '<div class="container"><div class="category-header"><span class="eyebrow-tag">SPECIALIST PROTECTION</span><h2>Ceramic Coating</h2><p>Long-term nano-ceramic protection with deep gloss and extreme water beading.</p></div><div class="ceramic-stages-grid services-grid single-card-grid"><div class="service-card"><div class="card-eyebrow">01 / PROTECTION</div><h3 class="card-title">Ceramic Coating</h3><p class="card-desc">Multi-year nano-ceramic protective barrier delivering extreme gloss, intense water beading, and high environmental defense.</p><div class="card-price-row"><span class="price-amount">Coming Soon</span><span class="price-unit">/ On Inspection</span></div><ul class="service-features"><li>Thorough exterior decontamination wash</li><li>Chemical iron / fallout &amp; tar removal</li><li>Full clay bar surface treatment</li><li>Wheels &amp; wheel arches deep cleaned</li><li>Multi-stage paint defect &amp; swirl correction</li><li>Panel alcohol wipe &amp; surface preparation</li><li>Professional ceramic coating application</li><li>Durable multi-year clear coat defense</li><li>Hydrophobic water-repellent finish</li><li>Protection against UV, tree sap &amp; bug acid</li><li>Easier long-term maintenance &amp; washing</li></ul><a href="book.html?service=ceramic-coating" class="btn btn-service">Book This Service</a></div></div></div>';
		ceramicSection.insertAdjacentElement('afterend', paintSection);
		const ceramicVehicle = ceramicSection.querySelector('[data-ceramic-vehicle]');
		const updateCeramicVehicle = () => { if (ceramicVehicle) ceramicVehicle.textContent = `Available for ${vehicleNames[vehicle]}`; };
		updateCeramicVehicle();
		const categoryToggle = document.querySelector('[data-category="full"]')?.parentElement;
		const paintCategoryButton = document.createElement('button');
		paintCategoryButton.type = 'button'; paintCategoryButton.className = 'segment category-pill'; paintCategoryButton.dataset.category = 'paint-correction'; paintCategoryButton.setAttribute('aria-selected', 'false'); paintCategoryButton.textContent = 'Paint Correction';
		const ceramicCategoryButton = document.createElement('button');
		ceramicCategoryButton.type = 'button'; ceramicCategoryButton.className = 'segment category-pill'; ceramicCategoryButton.dataset.category = 'ceramic-coating'; ceramicCategoryButton.setAttribute('aria-selected', 'false'); ceramicCategoryButton.textContent = 'Ceramic Coating';
		categoryToggle?.append(paintCategoryButton, ceramicCategoryButton);
		categoryToggle?.classList.add('category-toggle-group');
		document.querySelectorAll('[data-category]').forEach((button) => { button.classList.add('category-pill'); button.classList.toggle('active', button.dataset.category === 'full'); });
		const render = (animate = false) => {
			const update = () => { if (category === 'paint-correction' || category === 'ceramic-coating') return; packageGrid.innerHTML = packages[category].map((item, index) => `<article class="package-card${index === 1 ? ' featured' : ''}"><p class="eyebrow">0${index + 1} / ${category === 'full' ? 'Full detail' : 'Interior only'}</p><h2>${item.name}</h2><p>${category === 'full' ? 'A complete mobile finish, tailored to your vehicle and its day-to-day demands.' : 'A thorough interior reset for a fresher, cleaner cabin.'}</p><div class="price-large">$${prices[category][item.key][vehicle]} <span>AUD / ${vehicleNames[vehicle]}</span></div><ul>${item.items.map((service) => `<li>${service}</li>`).join('')}</ul><a class="button dark" href="book.html?package=${item.key}&type=${vehicleNames[vehicle]}&category=${category === 'full' ? 'FullDetail' : 'InteriorOnly'}">Book This Service</a></article>`).join(''); };
			if (!animate) { update(); return; }
			packageGrid.style.opacity = '0'; packageGrid.style.transform = 'translate3d(0,-6px,0)';
			window.setTimeout(() => { update(); packageGrid.style.opacity = ''; packageGrid.style.transform = ''; }, 160);
		};
		document.querySelectorAll('[data-category]').forEach((button) => { button.classList.add('service-toggle-btn'); button.addEventListener('click', () => { if (category === button.dataset.category) return; category = button.dataset.category; document.querySelectorAll('[data-category]').forEach((item) => { item.setAttribute('aria-selected', String(item === button)); item.classList.toggle('active', item === button); }); const isPaint = category === 'paint-correction'; const isCeramic = category === 'ceramic-coating'; const isSpecialist = isPaint || isCeramic; packageGrid.hidden = isSpecialist; ceramicSection.style.display = isCeramic ? '' : 'none'; paintSection.style.display = isPaint ? '' : 'none'; render(false); }); });
		document.querySelectorAll('[data-vehicle]').forEach((button) => { button.classList.add('service-toggle-btn'); button.addEventListener('click', () => { if (vehicle === button.dataset.vehicle) return; vehicle = button.dataset.vehicle; document.querySelectorAll('[data-vehicle]').forEach((item) => item.setAttribute('aria-selected', String(item === button))); updateCeramicVehicle(); render(false); }); });
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
