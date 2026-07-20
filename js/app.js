/**
 * CHANDIGARH.RENT — MAIN APPLICATION CONTROLLER
 * Manages reactive UI state, user input event handlers, modal dialogs, and map sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Map
  const mapManager = new window.TricityMapManager('map', window.rentDataManager);

  // Application State
  const state = {
    city: 'all',
    bhk: 'all',
    maxRent: 80000,
    allowedTypes: ['rent', 'owner', 'seeker', 'tolet'],
    gatedOnly: false,
    studentFriendly: false,
    furnishedOnly: false,
    searchQuery: '',
    theme: localStorage.getItem('chandigarh_theme') || 'dark'
  };

  // Set Theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
  mapManager.setTileStyle(state.theme);

  // Initial Filter Apply & Render
  applyFiltersAndRender();

  // ==================== EVENT LISTENERS ====================

  // 1. City Filter Buttons
  document.querySelectorAll('.city-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.city = e.target.dataset.city;

      // Pan map based on selected city
      if (state.city === 'chandigarh') {
        mapManager.flyToLocation(30.7333, 76.7794, 13);
      } else if (state.city === 'mohali') {
        mapManager.flyToLocation(30.7042, 76.7170, 13);
      } else if (state.city === 'panchkula') {
        mapManager.flyToLocation(30.6942, 76.8535, 13);
      } else {
        mapManager.flyToLocation(30.7333, 76.7794, 12);
      }

      applyFiltersAndRender();
    });
  });

  // 2. BHK Filter Buttons
  document.querySelectorAll('#bhkFilterContainer .chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#bhkFilterContainer .chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      state.bhk = e.target.dataset.bhk;
      applyFiltersAndRender();
    });
  });

  // 3. Rent Range Slider
  const rentRangeInput = document.getElementById('rentRangeInput');
  const rentValueDisplay = document.getElementById('rentValueDisplay');
  rentRangeInput.addEventListener('input', (e) => {
    state.maxRent = Number(e.target.value);
    rentValueDisplay.textContent = '₹' + state.maxRent.toLocaleString('en-IN') + '/mo';
    applyFiltersAndRender();
  });

  // 4. Map Layer Checkboxes
  document.querySelectorAll('.toggle-pill input').forEach(chk => {
    chk.addEventListener('change', () => {
      const parentPill = chk.closest('.toggle-pill');
      if (chk.checked) {
        parentPill.classList.add('active');
      } else {
        parentPill.classList.remove('active');
      }

      // Re-evaluate allowed types
      state.allowedTypes = [];
      document.querySelectorAll('.toggle-pill input:checked').forEach(c => {
        state.allowedTypes.push(c.dataset.filterType);
      });

      applyFiltersAndRender();
    });
  });

  // 5. Attributes Checkboxes
  document.getElementById('chkGatedOnly').addEventListener('change', (e) => {
    state.gatedOnly = e.target.checked;
    applyFiltersAndRender();
  });

  document.getElementById('chkStudentFriendly').addEventListener('change', (e) => {
    state.studentFriendly = e.target.checked;
    applyFiltersAndRender();
  });

  document.getElementById('chkFurnishedOnly').addEventListener('change', (e) => {
    state.furnishedOnly = e.target.checked;
    applyFiltersAndRender();
  });

  // 6. Quick Sector Chips
  document.querySelectorAll('.sector-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const lat = parseFloat(e.target.dataset.lat);
      const lng = parseFloat(e.target.dataset.lng);
      const zoom = parseInt(e.target.dataset.zoom) || 15;
      mapManager.flyToLocation(lat, lng, zoom);
    });
  });

  // 7. Reset Filters Button
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    state.city = 'all';
    state.bhk = 'all';
    state.maxRent = 80000;
    state.allowedTypes = ['rent', 'owner', 'seeker', 'tolet'];
    state.gatedOnly = false;
    state.studentFriendly = false;
    state.furnishedOnly = false;
    state.searchQuery = '';

    // Reset UI Controls
    rentRangeInput.value = 80000;
    rentValueDisplay.textContent = '₹80,000/mo';

    document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.city-btn[data-city="all"]').classList.add('active');

    document.querySelectorAll('#bhkFilterContainer .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#bhkFilterContainer .chip[data-bhk="all"]').classList.add('active');

    document.querySelectorAll('.toggle-pill input').forEach(c => {
      c.checked = true;
      c.closest('.toggle-pill').classList.add('active');
    });

    document.getElementById('chkGatedOnly').checked = false;
    document.getElementById('chkStudentFriendly').checked = false;
    document.getElementById('chkFurnishedOnly').checked = false;
    document.getElementById('sectorSearchInput').value = '';

    applyFiltersAndRender();
  });

  // 8. Search Input Auto-Suggest
  const searchInput = document.getElementById('sectorSearchInput');
  const suggestionsBox = document.getElementById('searchSuggestions');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    state.searchQuery = query;

    if (query.length === 0) {
      suggestionsBox.style.display = 'none';
      applyFiltersAndRender();
      return;
    }

    // Filter matching sectors from dataset
    const allPins = window.rentDataManager.getAllPins();
    const matches = Array.from(new Set(allPins.map(p => p.sector)))
      .filter(s => s.toLowerCase().includes(query))
      .slice(0, 5);

    if (matches.length > 0) {
      suggestionsBox.innerHTML = matches.map(m => `
        <div class="suggestion-item" data-sector="${m}">
          <span>📍 ${m}</span>
          <small>View on Map</small>
        </div>
      `).join('');
      suggestionsBox.style.display = 'block';
    } else {
      suggestionsBox.style.display = 'none';
    }

    applyFiltersAndRender();
  });

  suggestionsBox.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const sectorName = item.dataset.sector;
      searchInput.value = sectorName;
      state.searchQuery = sectorName;
      suggestionsBox.style.display = 'none';

      // Find first pin in this sector to pan map
      const matchingPin = window.rentDataManager.getAllPins().find(p => p.sector === sectorName);
      if (matchingPin) {
        mapManager.flyToLocation(matchingPin.lat, matchingPin.lng, 15);
      }
      applyFiltersAndRender();
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      suggestionsBox.style.display = 'none';
    }
  });

  // 9. Theme Toggle
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  btnThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('chandigarh_theme', state.theme);
    updateThemeIcon();
    mapManager.setTileStyle(state.theme);
  });

  function updateThemeIcon() {
    const iconSpan = document.querySelector('.theme-icon');
    if (iconSpan) {
      iconSpan.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    }
  }

  // 10. Map Floating Action Controls
  document.getElementById('btnToggleTiles').addEventListener('click', () => {
    mapManager.toggleTileStyle();
  });

  document.getElementById('btnToggleHubs')?.addEventListener('click', (e) => {
    const isVisible = mapManager.toggleHubOverlays();
    if (isVisible) {
      e.currentTarget.classList.add('active');
    } else {
      e.currentTarget.classList.remove('active');
    }
  });

  document.getElementById('btnLocateMe').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        mapManager.flyToLocation(pos.coords.latitude, pos.coords.longitude, 15);
      }, err => {
        alert('Geolocation permission denied or unavailable. Centering on Chandigarh Sector 17.');
        mapManager.flyToLocation(30.7414, 76.7791, 15);
      });
    }
  });

  // Selected Hold Coordinates from Map Click & Hold
  let selectedHoldCoords = null;

  mapManager.setupHoldListener((actionType, latlng) => {
    selectedHoldCoords = latlng;
    const coordStr = `Selected Spot: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    const badge = document.getElementById('rentCoordsText');
    if (badge) badge.textContent = coordStr;

    if (actionType === 'rent') openModal('modalDropRent');
    else if (actionType === 'owner') openModal('modalListFlat');
    else if (actionType === 'seeker') openModal('modalDropSeeker');
    else if (actionType === 'tolet') openModal('modalSpotToLet');
  });

  // Sidebar Drawer Toggle for Desktop & Mobile
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('show-mobile');
      sidebarBackdrop?.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
    }
    setTimeout(() => {
      mapManager.map.invalidateSize();
    }, 320);
  };

  document.getElementById('btnToggleSidebar').addEventListener('click', toggleSidebar);
  document.getElementById('btnOpenMobileFilters')?.addEventListener('click', toggleSidebar);
  document.getElementById('mBtnFilters')?.addEventListener('click', toggleSidebar);

  sidebarBackdrop?.addEventListener('click', () => {
    sidebar.classList.remove('show-mobile');
    sidebarBackdrop.classList.remove('show');
  });

  // Main Action Dropdown Toggle
  const btnMainAction = document.getElementById('btnMainAction');
  const addPinDropdown = document.getElementById('addPinDropdown');

  btnMainAction.addEventListener('click', (e) => {
    e.stopPropagation();
    addPinDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    addPinDropdown.classList.remove('show');
  });

  // ==================== MODAL HANDLERS ====================

  // Open Modals via Dropdown Actions
  document.getElementById('actionDropRent').addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modalDropRent');
  });

  document.getElementById('actionListFlat').addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modalListFlat');
  });

  document.getElementById('actionDropSeeker').addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modalDropSeeker');
  });

  document.getElementById('actionSpotToLet').addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modalSpotToLet');
  });

  document.getElementById('btnAreaStats').addEventListener('click', (e) => {
    e.preventDefault();
    populateSectorStatsTable();
    openModal('modalAreaStats');
  });

  document.getElementById('btnDrawArea').addEventListener('click', (e) => {
    e.preventDefault();
    populateSectorStatsTable();
    openModal('modalAreaStats');
  });

  // Mobile Bottom Bar Actions
  document.getElementById('mBtnDropRent')?.addEventListener('click', () => openModal('modalDropRent'));
  document.getElementById('mBtnListFlat')?.addEventListener('click', () => openModal('modalListFlat'));
  document.getElementById('mBtnSeeker')?.addEventListener('click', () => openModal('modalDropSeeker'));
  document.getElementById('mBtnToLet')?.addEventListener('click', () => openModal('modalSpotToLet'));

  // Close Modal Buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.target.dataset.close;
      closeModal(modalId);
    });
  });

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }

  // State for interactive map picker overlay
  let activeModalForPicker = null;
  let activeTargetSpanForPicker = null;
  const mapPickerBanner = document.getElementById('mapPickerBanner');
  const mapPickerCoordsText = document.getElementById('mapPickerCoordsText');

  // 1. Handle "Use GPS" Button
  document.querySelectorAll('.btn-use-gps').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSpanId = e.target.dataset.coordsId;
      const targetSpan = document.getElementById(targetSpanId);
      if (navigator.geolocation) {
        btn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          selectedHoldCoords = { lat, lng };
          if (targetSpan) targetSpan.textContent = `· ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          mapManager.flyToLocation(lat, lng, 16);
          btn.textContent = 'Use GPS';
        }, () => {
          const center = mapManager.getCenter();
          selectedHoldCoords = center;
          if (targetSpan) targetSpan.textContent = `· ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
          btn.textContent = 'Use GPS';
        });
      }
    });
  });

  // 2. Handle "Pick on map" Button (Opens smooth map overlay banner, no alert popups!)
  document.querySelectorAll('.btn-pick-map').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalCard = e.target.closest('.modal-backdrop');
      if (modalCard) {
        activeModalForPicker = modalCard.id;
        closeModal(activeModalForPicker);
      }
      activeTargetSpanForPicker = document.getElementById(e.target.dataset.coordsId);

      const center = mapManager.getCenter();
      mapPickerCoordsText.textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      mapPickerBanner.classList.add('show');
    });
  });

  // Update banner coordinates text live as map pans
  mapManager.map.on('move', () => {
    if (mapPickerBanner && mapPickerBanner.classList.contains('show')) {
      const center = mapManager.getCenter();
      mapPickerCoordsText.textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
    }
  });

  // Confirm Location on Map Banner
  document.getElementById('btnConfirmMapPicker')?.addEventListener('click', () => {
    const center = mapManager.getCenter();
    selectedHoldCoords = center;
    if (activeTargetSpanForPicker) {
      activeTargetSpanForPicker.textContent = `· ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
    }
    mapPickerBanner.classList.remove('show');
    if (activeModalForPicker) {
      openModal(activeModalForPicker);
    }
  });

  // Cancel Map Picker
  document.getElementById('btnCancelMapPicker')?.addEventListener('click', () => {
    mapPickerBanner.classList.remove('show');
    if (activeModalForPicker) {
      openModal(activeModalForPicker);
    }
  });

  // ==================== STRICT DATA VALIDATOR & SPAM PROTECTION ====================
  const TricityValidator = {
    isValidPhone(phone) {
      const clean = (phone || '').replace(/\D/g, '');
      if (clean.length !== 10) return false;
      if (/^(\d)\1{9}$/.test(clean)) return false; // Reject 0000000000 or 9999999999
      return /^[6-9]\d{9}$/.test(clean);
    },

    isValidName(name) {
      const s = (name || '').trim();
      if (s.length < 3 || s.length > 50) return false;
      if (/^([a-zA-Z])\1{3,}$/.test(s)) return false; // Reject "aaaaa" or key smashes
      return /^[a-zA-Z\s\.']{3,50}$/.test(s);
    },

    isValidContact(contact) {
      const s = (contact || '').trim();
      const isPhone = this.isValidPhone(s);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
      return isPhone || isEmail;
    },

    isValidRent(amount, bhk) {
      const num = Number(amount);
      if (isNaN(num) || num <= 0) return false;
      if (bhk === '1RK' || bhk === 'PG') return num >= 2500 && num <= 35000;
      if (bhk === '1BHK') return num >= 4000 && num <= 50000;
      if (bhk === '2BHK') return num >= 7000 && num <= 90000;
      if (bhk === '3BHK') return num >= 10000 && num <= 180000;
      return num >= 2500 && num <= 250000;
    },

    isValidSector(sector) {
      const s = (sector || '').trim().toLowerCase();
      if (s.length < 3) return false;
      const keySmashes = ['dasdasda', 'asdf', 'qwerty', 'zxcv', '12345', 'test', 'abcde', 'dfsdf', 'sdfsf', 'ghjkl', 'aaaa', 'zzzz'];
      if (keySmashes.some(k => s.includes(k))) return false;
      if (/^([a-z0-9])\1{3,}$/.test(s)) return false;
      return true;
    }
  };

  // Bind Dynamic "Other (Custom Location)" Toggle
  const bindSectorToggle = (selectId, customInputId) => {
    const sel = document.getElementById(selectId);
    const custom = document.getElementById(customInputId);
    if (sel && custom) {
      sel.addEventListener('change', () => {
        if (sel.value === 'Other') {
          custom.style.display = 'block';
          custom.focus();
        } else {
          custom.style.display = 'none';
        }
      });
    }
  };

  bindSectorToggle('rentSector', 'rentSectorCustom');
  bindSectorToggle('ownerSector', 'ownerSectorCustom');
  bindSectorToggle('seekerSector', 'seekerSectorCustom');
  bindSectorToggle('toletSector', 'toletSectorCustom');

  // Sector Mapping by City for Clean Cross-Browser Selectability
  const CITY_SECTORS = {
    Chandigarh: [
      "Sector 7", "Sector 8", "Sector 9", "Sector 10", "Sector 11",
      "Sector 14 (PU)", "Sector 15 (Student Hub)", "Sector 16", "Sector 17 (City Center)",
      "Sector 18", "Sector 19", "Sector 20", "Sector 21", "Sector 22 (Market Hub)",
      "Sector 23", "Sector 24", "Sector 26", "Sector 27", "Sector 28",
      "Sector 32 (GMCH)", "Sector 33", "Sector 34 (Coaching Hub)", "Sector 35 (Commercial Hub)",
      "Sector 36", "Sector 37", "Sector 38", "Sector 40", "Sector 41", "Sector 42",
      "Sector 43 (ISBT)", "Sector 44", "Sector 45", "Sector 46", "Sector 47",
      "Sector 48", "Sector 49", "Sector 50", "Manimajra", "Industrial Area Ph 1"
    ],
    Mohali: [
      "Phase 1 Mohali", "Phase 2 Mohali", "Phase 3B1 Mohali", "Phase 3B2 Mohali (Market Hub)",
      "Phase 4 Mohali", "Phase 5 Mohali", "Phase 7 Mohali", "Phase 8 Mohali",
      "Phase 9 Mohali", "Phase 10 Mohali", "Phase 11 Mohali",
      "Sector 67 Mohali", "Sector 68 Mohali", "Sector 69 Mohali", "Sector 70 Mohali",
      "Sector 71 Mohali", "Sector 82 IT City Mohali", "Sector 125 Kharar (Sunny Enclave)",
      "Kharar Highway", "Aerocity Mohali", "Landran"
    ],
    Panchkula: [
      "Sector 4 Panchkula", "Sector 7 Panchkula", "Sector 8 Panchkula",
      "Sector 9 Panchkula", "Sector 11 Panchkula", "Sector 15 Panchkula",
      "Sector 20 Panchkula", "Zirakpur"
    ]
  };

  const populateSectorsForCity = (citySelectId, sectorSelectId) => {
    const cityEl = document.getElementById(citySelectId);
    const sectorEl = document.getElementById(sectorSelectId);
    if (!cityEl || !sectorEl) return;

    const render = () => {
      const selectedCity = cityEl.value || 'Chandigarh';
      const sectorList = CITY_SECTORS[selectedCity] || CITY_SECTORS['Chandigarh'];

      let html = `<option value="">-- Choose ${selectedCity} Sector / Phase --</option>`;
      sectorList.forEach(sec => {
        html += `<option value="${sec}">${sec}</option>`;
      });
      html += `<option value="Other">➕ Other (Custom Sub-Location / House #)</option>`;

      sectorEl.innerHTML = html;
      sectorEl.value = '';
    };

    cityEl.addEventListener('change', render);
    render();
  };

  populateSectorsForCity('rentCity', 'rentSector');
  populateSectorsForCity('ownerCity', 'ownerSector');
  populateSectorsForCity('seekerCity', 'seekerSector');
  populateSectorsForCity('toletCity', 'toletSector');

  const getEffectiveSector = (selectId, customInputId) => {
    const selVal = document.getElementById(selectId)?.value;
    if (selVal === 'Other') {
      return document.getElementById(customInputId)?.value || '';
    }
    return selVal || '';
  };

  // Helper: File to Base64 Data URL
  const fileToDataURL = (file) => {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Pill Radio Button Group Interactivity
  document.querySelectorAll('.pill-group').forEach(group => {
    group.addEventListener('click', (e) => {
      const pillBtn = e.target.closest('.pill-btn');
      if (pillBtn) {
        group.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        pillBtn.classList.add('active');
        const radio = pillBtn.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      }
    });
  });

  // ==================== FORM SUBMISSIONS WITH VALIDATION ====================

  // 1. Submit Anonymous Rent Pin
  document.getElementById('formDropRent').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sector = getEffectiveSector('rentSector', 'rentSectorCustom');
    const bhk = document.getElementById('rentBhk').value;
    const amount = document.getElementById('rentAmount').value;

    if (!TricityValidator.isValidSector(sector)) {
      alert('⚠️ Please select an official Sector/Phase or enter a genuine sub-location (no random text like dasdasda).');
      return;
    }

    if (!TricityValidator.isValidRent(amount, bhk)) {
      alert(`⚠️ Please enter a realistic monthly rent amount for ${bhk} (e.g., ₹5,000 - ₹80,000).`);
      return;
    }

    const targetCoords = selectedHoldCoords || mapManager.getCenter();
    const selectedPetRadio = document.querySelector('input[name="rentPets"]:checked');

    const newPin = {
      type: 'rent',
      city: document.getElementById('rentCity').value,
      sector: sector.trim(),
      bhk: bhk,
      rent: Number(amount),
      maintenance: Number(document.getElementById('rentMaintenance').value) || 0,
      furnished: document.getElementById('rentFurnished').value,
      gated: document.getElementById('rentGated').value,
      rating: Number(document.getElementById('rentRating').value),
      pets: selectedPetRadio ? selectedPetRadio.value : 'Not sure',
      parking: Number(document.getElementById('rentParking').value) || 0,
      sqft: Number(document.getElementById('rentSqft').value) || null,
      email: document.getElementById('rentEmail')?.value.trim() || '',
      oneLiner: document.getElementById('rentOneLiner')?.value.trim() || '',
      review: document.getElementById('rentReview').value,
      lat: targetCoords.lat,
      lng: targetCoords.lng
    };

    await window.rentDataManager.addPin(newPin);
    selectedHoldCoords = null;
    closeModal('modalDropRent');
    document.getElementById('formDropRent').reset();
    document.getElementById('rentSectorCustom').style.display = 'none';
    applyFiltersAndRender();
    alert('🎉 Rent pin submitted successfully!');
  });

  // 2. Submit Direct Owner Listing
  document.getElementById('formListFlat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sector = getEffectiveSector('ownerSector', 'ownerSectorCustom');
    const bhk = document.getElementById('ownerBhk').value;
    const amount = document.getElementById('ownerRent').value;
    const phone = document.getElementById('ownerPhone').value;
    const name = document.getElementById('ownerName').value;

    if (!TricityValidator.isValidSector(sector)) {
      alert('⚠️ Please select an official Sector/Phase or enter a genuine sub-location.');
      return;
    }

    if (!TricityValidator.isValidRent(amount, bhk)) {
      alert(`⚠️ Please enter a realistic rent amount for ${bhk}.`);
      return;
    }

    if (!TricityValidator.isValidPhone(phone)) {
      alert('⚠️ Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (!TricityValidator.isValidName(name)) {
      alert('⚠️ Please enter your valid full name.');
      return;
    }

    const targetCoords = selectedHoldCoords || mapManager.getCenter();
    const photoInput = document.getElementById('ownerPhoto');
    const photoData = photoInput && photoInput.files[0] ? await fileToDataURL(photoInput.files[0]) : null;
    const selectedPetRadio = document.querySelector('input[name="ownerPets"]:checked');

    const newPin = {
      type: 'owner',
      ownerType: document.getElementById('ownerType').value,
      city: document.getElementById('ownerCity').value || 'Chandigarh',
      sector: sector.trim(),
      bhk: bhk,
      rent: Number(amount),
      deposit: Number(document.getElementById('ownerDeposit').value) || 0,
      tenantPref: document.getElementById('ownerTenantPref').value,
      pets: selectedPetRadio ? selectedPetRadio.value : 'Not sure',
      parking: Number(document.getElementById('ownerParking').value) || 0,
      sqft: Number(document.getElementById('ownerSqft').value) || null,
      email: document.getElementById('ownerEmail')?.value.trim() || '',
      oneLiner: document.getElementById('ownerOneLiner')?.value.trim() || '',
      desc: document.getElementById('ownerDesc').value,
      phone: phone.trim(),
      contactName: name.trim(),
      photoData: photoData,
      lat: targetCoords.lat,
      lng: targetCoords.lng
    };

    await window.rentDataManager.addPin(newPin);
    selectedHoldCoords = null;
    closeModal('modalListFlat');
    document.getElementById('formListFlat').reset();
    applyFiltersAndRender();
    alert('🎉 Zero Brokerage Flat listing published on map!');
  });

  // 3. Submit Flat Seeker Pin
  document.getElementById('formDropSeeker').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sector = getEffectiveSector('seekerSector', 'seekerSectorCustom');
    const bhk = document.getElementById('seekerBhk').value;
    const budget = document.getElementById('seekerBudget').value;
    const email = document.getElementById('seekerEmail').value.trim();
    const phone = document.getElementById('seekerPhone').value.trim();

    if (!TricityValidator.isValidSector(sector)) {
      alert('⚠️ Please select an official Sector/Phase or enter a genuine custom sub-location.');
      return;
    }

    if (!TricityValidator.isValidRent(budget, bhk)) {
      alert(`⚠️ Please enter a realistic max budget per room for ${bhk}.`);
      return;
    }

    if (!TricityValidator.isValidPhone(phone)) {
      alert('⚠️ Please enter a valid 10-digit mobile number.');
      return;
    }

    const targetCoords = selectedHoldCoords || mapManager.getCenter();

    const newPin = {
      type: 'seeker',
      city: document.getElementById('seekerCity').value,
      sector: sector.trim(),
      lookingFor: document.getElementById('seekerLookingFor')?.value || 'Room in Shared Flat',
      budget: Number(budget),
      bhk: bhk,
      timeline: document.getElementById('seekerTimeline')?.value || 'Flexible',
      foodPref: document.getElementById('seekerFoodPref')?.value || 'No Preference',
      smoking: document.getElementById('seekerSmoking')?.value || 'Outside only',
      profile: document.getElementById('seekerProfile')?.value || 'Working Professional',
      genderPref: document.getElementById('seekerGenderPref')?.value || 'Any Gender / Mixed',
      parking: Number(document.getElementById('seekerParking')?.value) || 0,
      lifestyle: document.getElementById('seekerLifestyle')?.value.trim() || '',
      email: email,
      phone: phone,
      seekerName: email.split('@')[0] || 'Flat Seeker',
      contact: phone,
      lat: targetCoords.lat,
      lng: targetCoords.lng
    };

    await window.rentDataManager.addPin(newPin);
    selectedHoldCoords = null;
    closeModal('modalDropSeeker');
    document.getElementById('formDropSeeker').reset();
    document.getElementById('seekerSectorCustom').style.display = 'none';
    applyFiltersAndRender();
    alert('🎉 Flat Seeker pin dropped successfully on map!');

    // Check for matches!
    const matches = window.tricityMatcher.findMatchesForSeeker(newPin);
    if (matches.length > 0) {
      alert(`🎉 Seeker pin dropped! We found ${matches.length} matching available flat(s) in your area!`);
    } else {
      alert('🎉 Seeker pin dropped! Owners will contact you as soon as matching flats open up.');
    }
  });

  // 4. Submit Spotted To-Let Board
  document.getElementById('formSpotToLet').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sector = getEffectiveSector('toletSector', 'toletSectorCustom');
    const phone = document.getElementById('toletPhone').value;

    if (!TricityValidator.isValidSector(sector)) {
      alert('⚠️ Please select an official Sector/Phase or enter a genuine sub-location.');
      return;
    }

    if (!TricityValidator.isValidPhone(phone)) {
      alert('⚠️ Please enter a valid 10-digit Indian phone number seen on the board.');
      return;
    }

    const targetCoords = selectedHoldCoords || mapManager.getCenter();
    const photoInput = document.getElementById('toletPhoto');
    const photoData = photoInput && photoInput.files[0] ? await fileToDataURL(photoInput.files[0]) : null;

    const newPin = {
      type: 'tolet',
      city: document.getElementById('toletCity').value || 'Chandigarh',
      sector: sector.trim(),
      phone: phone.trim(),
      bhk: document.getElementById('toletBhk').value,
      notes: document.getElementById('toletNotes').value,
      photoData: photoData,
      lat: targetCoords.lat,
      lng: targetCoords.lng
    };

    await window.rentDataManager.addPin(newPin);
    selectedHoldCoords = null;
    closeModal('modalSpotToLet');
    document.getElementById('formSpotToLet').reset();
    document.getElementById('toletSectorCustom').style.display = 'none';
    applyFiltersAndRender();
    alert('🎉 Spotted To-Let board added to map! Thanks for helping fellow renters skip brokers.');
  });

  // ==================== CORE RENDER CONTROLLER ====================

  function applyFiltersAndRender() {
    const filteredPins = window.rentDataManager.filterPins(state);

    // 1. Render Map Markers
    mapManager.renderPins(filteredPins);

    // 2. Compute Overview Metrics
    const overview = window.tricityStatsEngine.computeOverviewStats(filteredPins);

    document.getElementById('statTotalPins').textContent = overview.totalPins;
    document.getElementById('statAvgRent').textContent = overview.avg2BHK !== 'N/A' ? overview.avg2BHK : overview.avg1BHK;
    
    const directCnt = filteredPins.filter(p => p.type === 'owner').length;
    document.getElementById('statDirectFlats').textContent = directCnt;

    // Layer Count Badges in Sidebar
    const allPins = window.rentDataManager.getAllPins();
    document.getElementById('cntRent').textContent = allPins.filter(p => p.type === 'rent').length;
    document.getElementById('cntOwner').textContent = allPins.filter(p => p.type === 'owner').length;
    document.getElementById('cntSeeker').textContent = allPins.filter(p => p.type === 'seeker').length;
    document.getElementById('cntTolet').textContent = allPins.filter(p => p.type === 'tolet').length;
  }

  function populateSectorStatsTable() {
    const benchmarkRows = window.tricityStatsEngine.generateSectorBenchmark();
    const tbody = document.getElementById('sectorStatsTableBody');
    if (!tbody) return;

    tbody.innerHTML = benchmarkRows.map(row => `
      <tr>
        <td><strong>${row.sector}</strong></td>
        <td><span class="tricity-badge">${row.city}</span></td>
        <td>${row.bhk1Avg}</td>
        <td><strong>${row.bhk2Avg}</strong></td>
        <td>${row.bhk3Avg}</td>
        <td>${row.gatedPct}</td>
      </tr>
    `).join('');
  }
});
