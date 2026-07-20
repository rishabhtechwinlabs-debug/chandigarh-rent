/**
 * CHANDIGARH.RENT — LEAFLET MAP ENGINE
 * Custom pins, CARTO map tile switching, popups & area bounds.
 */

class TricityMapManager {
  constructor(containerId, dataManager) {
    this.containerId = containerId;
    this.dataManager = dataManager;
    this.map = null;
    this.markersLayer = null;
    this.activeTileStyle = 'dark'; // 'dark' or 'light'
    this.tileLayers = {};

    // Center coordinates & Tricity Bounding Box (Chandigarh, Mohali, Panchkula, Kharar)
    this.defaultCenter = [30.7333, 76.7794];
    this.defaultZoom = 13;

    // Strict Tricity geographic bounds (South-West to North-East)
    this.tricityBounds = L.latLngBounds(
      L.latLng(30.5200, 76.5300), // SW: South Mohali, Zirakpur, Aerocity, Kharar
      L.latLng(30.8600, 76.9900)  // NE: North Chandigarh, Pinjore, East Panchkula
    );

    this.initMap();
  }

  initMap() {
    // Initialize Leaflet Map locked strictly to Tricity region
    this.map = L.map(this.containerId, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: this.tricityBounds,
      maxBoundsViscosity: 1.0, // Hard bounce-back lock when dragging outside Tricity
      zoomControl: false,
      attributionControl: false // Hide Leaflet attribution watermark
    });

    // Add Zoom control on bottom right (away from top controls)
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Define Tile Layers (Free CARTO & OpenStreetMap tiles - No API key needed)
    this.tileLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    this.tileLayers.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    this.tileLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    // High Resolution Satellite / Green Cover Layer (Esri World Imagery)
    this.tileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri World Imagery',
      maxZoom: 18
    });

    // Default tile based on initial activeTileStyle
    this.setTileStyle(this.activeTileStyle);

    // Create Marker Group Layer
    this.markersLayer = L.layerGroup().addTo(this.map);
    
    // Create Hub Overlay Layer (Inactive by default until user clicks 🎓 Commute Zones)
    this.hubOverlayLayer = L.layerGroup();

    // Render Tricity Key Hub Landmarks & Commute Radius
    this.renderKeyHubs();
  }

  setTileStyle(styleName) {
    // Remove existing tile layers
    Object.values(this.tileLayers).forEach(layer => {
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });

    const targetStyle = this.tileLayers[styleName] ? styleName : 'light';
    this.tileLayers[targetStyle].addTo(this.map);
    this.activeTileStyle = targetStyle;
  }

  toggleTileStyle() {
    if (this.activeTileStyle === 'dark') {
      this.setTileStyle('light');
    } else if (this.activeTileStyle === 'light') {
      this.setTileStyle('satellite');
    } else if (this.activeTileStyle === 'satellite') {
      this.setTileStyle('osm');
    } else {
      this.setTileStyle('dark');
    }
  }

  renderKeyHubs() {
    this.hubOverlayLayer.clearLayers();

    const hubs = [
      { name: '🎓 Panjab University (PU)', lat: 30.7582, lng: 76.7689, color: '#8b5cf6' },
      { name: '💼 IT Park Mohali', lat: 30.6725, lng: 76.7450, color: '#3b82f6' },
      { name: '🚌 ISBT 43 Bus Stand', lat: 30.7230, lng: 76.7460, color: '#10b981' }
    ];

    hubs.forEach(h => {
      // 2km Radius Circle around Hub
      L.circle([h.lat, h.lng], {
        color: h.color,
        fillColor: h.color,
        fillOpacity: 0.08,
        radius: 2000,
        weight: 1.5,
        dashArray: '4, 6'
      }).bindTooltip(`${h.name} (2km Commute Radius)`, { permanent: false, direction: 'top' })
        .addTo(this.hubOverlayLayer);
    });
  }

  toggleHubOverlays() {
    if (this.map.hasLayer(this.hubOverlayLayer)) {
      this.map.removeLayer(this.hubOverlayLayer);
      return false;
    } else {
      this.hubOverlayLayer.addTo(this.map);
      return true;
    }
  }

  renderPins(pins) {
    this.markersLayer.clearLayers();

    pins.forEach(pin => {
      const marker = this.createCustomMarker(pin);
      if (marker) {
        marker.addTo(this.markersLayer);
      }
    });
  }

  createCustomMarker(pin) {
    let priceLabel = '';
    let pinClass = 'pin-rent';

    if (pin.type === 'rent') {
      priceLabel = '₹' + Math.round(pin.rent / 1000) + 'k';
      pinClass = 'pin-rent';
    } else if (pin.type === 'owner') {
      priceLabel = '₹' + Math.round(pin.rent / 1000) + 'k';
      pinClass = 'pin-owner';
    } else if (pin.type === 'seeker') {
      priceLabel = 'Seeker';
      pinClass = 'pin-seeker';
    } else if (pin.type === 'tolet') {
      priceLabel = 'To-Let';
      pinClass = 'pin-tolet';
    }

    const iconHtml = `<div class="custom-pin-marker ${pinClass}" style="width: 44px; height: 44px;">${priceLabel}</div>`;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });

    // Attach Popup HTML
    const popupContent = this.generatePopupHTML(pin);
    marker.bindPopup(popupContent);

    return marker;
  }

  generatePopupHTML(pin) {
    let typeBadge = '';
    let priceText = '';
    let title = pin.sector + ' (' + pin.city + ')';
    let bodyDetails = '';

    if (pin.type === 'rent') {
      typeBadge = '<span class="popup-badge popup-badge-rent">🟢 Rent Paid</span>';
      priceText = '₹' + pin.rent.toLocaleString('en-IN') + '/mo';
      bodyDetails = `
        <div class="popup-detail-row">
          <span>🏠 ${pin.bhk}</span>
          <span>🔒 ${pin.gated === 'Yes' ? 'Gated' : 'Open Sector'}</span>
          <span>✨ ${pin.furnished}</span>
        </div>
        <div class="popup-detail-row">
          <span>⭐ Landlord Rating: ${pin.rating}/5</span>
        </div>
        ${pin.review ? `<div class="popup-review-quote">"${pin.review}"</div>` : ''}
      `;
    } else if (pin.type === 'owner') {
      typeBadge = '<span class="popup-badge popup-badge-owner">🔵 Zero Broker Flat</span>';
      priceText = '₹' + pin.rent.toLocaleString('en-IN') + '/mo';
      const cleanPhone = (pin.phone || '').replace(/\D/g, '');
      const waMsg = encodeURIComponent(`Hi ${pin.contactName || ''}! I saw your ${pin.bhk} listing for ${pin.sector} on chandigarh.rent and I'm interested.`);
      bodyDetails = `
        <div class="popup-detail-row">
          <span>🏠 ${pin.bhk} (${pin.ownerType || 'Direct'})</span>
        </div>
        <div class="popup-detail-row">
          <span>👤 Pref: ${pin.tenantPref || 'Anyone'}</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-main); margin-top: 4px;">${pin.desc || ''}</p>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <a href="tel:${pin.phone}" class="btn btn-primary btn-sm" style="flex: 1;">📞 Call</a>
          ${cleanPhone ? `<a href="https://wa.me/91${cleanPhone}?text=${waMsg}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; background: #25d366; color: #fff; border: none;">💬 WhatsApp</a>` : ''}
        </div>
      `;
    } else if (pin.type === 'seeker') {
      typeBadge = '<span class="popup-badge popup-badge-seeker">🟣 Seeker Requirement</span>';
      priceText = 'Budget: ₹' + pin.budget.toLocaleString('en-IN') + '/mo';
      bodyDetails = `
        <div class="popup-detail-row">
          <span>🏠 Needs ${pin.bhk}</span>
          <span>📅 Move Date: ${pin.moveDate || 'Immediate'}</span>
        </div>
        <div class="popup-detail-row">
          <span>👤 Profile: ${pin.profile}</span>
        </div>
        <a href="mailto:${pin.contact}" class="btn btn-secondary btn-sm popup-action-btn">✉️ Contact ${pin.seekerName}</a>
      `;
    } else if (pin.type === 'tolet') {
      typeBadge = '<span class="popup-badge popup-badge-tolet">🟡 Spotted To-Let</span>';
      priceText = 'Spotted Board';
      bodyDetails = `
        <div class="popup-detail-row">
          <span>📍 Location: ${pin.sector}</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-main); margin-top: 4px;">${pin.notes || ''}</p>
        <a href="tel:${pin.phone}" class="btn btn-primary btn-sm popup-action-btn">📞 Call Number on Board (${pin.phone})</a>
      `;
    }

    const imgTag = pin.photoData ? `
      <div style="width: 100%; height: 130px; border-radius: var(--radius-sm); overflow: hidden; margin: 6px 0; border: 1px solid var(--border-color);">
        <img src="${pin.photoData}" style="width: 100%; height: 100%; object-fit: cover;" alt="Listing Photo">
      </div>
    ` : '';

    const shareText = encodeURIComponent(`📍 Check out this ${pin.bhk || ''} listing in ${pin.sector} (${pin.city}) on chandigarh.rent:`);
    const shareUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?pin=' + pin.id);

    return `
      <div class="pin-popup-card">
        <div class="popup-tag-row">
          ${typeBadge}
          <span style="font-size: 0.7rem; color: var(--text-muted);">${pin.date || ''}</span>
        </div>
        <div class="popup-rent-price">${priceText}</div>
        <div class="popup-title">${title}</div>
        ${imgTag}
        ${bodyDetails}
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--border-color); font-size: 0.72rem;">
          <a href="https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}" target="_blank" style="color: #25d366; text-decoration: none; font-weight: 600;">📢 WhatsApp</a>
          <button type="button" onclick="window.copyPinLink('${pin.id}')" style="background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 600; font-size: 0.72rem;">📋 Copy Link</button>
          <button type="button" onclick="alert('Thank you! This pin has been flagged for community review.')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.72rem;">🚩 Report</button>
        </div>
      </div>
    `;
  }

  flyToLocation(lat, lng, zoom = 15) {
    this.map.flyTo([lat, lng], zoom, {
      animate: true,
      duration: 1.2
    });
  }

  getCenter() {
    return this.map.getCenter();
  }

  isWithinBounds(lat, lng) {
    return this.tricityBounds.contains(L.latLng(lat, lng));
  }

  setupHoldListener(actionCallback) {
    let holdTimer = null;
    let startPoint = null;
    let startLatLng = null;

    const clearTimer = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    // 1. Left Mouse Click & Hold (> 350ms)
    this.map.on('mousedown', (e) => {
      if (e.originalEvent && e.originalEvent.button !== 0) return; // Left click only
      clearTimer();
      startLatLng = e.latlng;
      startPoint = e.containerPoint;

      holdTimer = setTimeout(() => {
        if (startLatLng) {
          this.openHoldMenuPopup(startLatLng, actionCallback);
          clearTimer();
        }
      }, 350); // 350ms hold duration
    });

    // Only cancel if mouse actually drags > 8 pixels (ignores tiny hand tremors)
    this.map.on('mousemove', (e) => {
      if (holdTimer && startPoint && e.containerPoint) {
        const dx = e.containerPoint.x - startPoint.x;
        const dy = e.containerPoint.y - startPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          clearTimer();
        }
      }
    });

    this.map.on('mouseup dragstart zoomstart', clearTimer);

    // 2. Mobile Touch Long-Press
    this.map.on('touchstart', (e) => {
      clearTimer();
      if (e.latlng) {
        startLatLng = e.latlng;
        startPoint = e.containerPoint;
        holdTimer = setTimeout(() => {
          if (startLatLng) {
            this.openHoldMenuPopup(startLatLng, actionCallback);
            clearTimer();
          }
        }, 400);
      }
    });

    this.map.on('touchmove', (e) => {
      if (holdTimer && startPoint && e.containerPoint) {
        const dx = e.containerPoint.x - startPoint.x;
        const dy = e.containerPoint.y - startPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          clearTimer();
        }
      }
    });

    this.map.on('touchend', clearTimer);

    // 3. Right Click (Context Menu) Direct Trigger
    this.map.on('contextmenu', (e) => {
      clearTimer();
      if (e.latlng) {
        this.openHoldMenuPopup(e.latlng, actionCallback);
      }
    });
  }

  openHoldMenuPopup(latlng, actionCallback) {
    // Close any existing hold popup before opening a new one
    if (this.activeHoldPopup) {
      try { this.map.closePopup(this.activeHoldPopup); } catch (e) {}
      this.activeHoldPopup = null;
    }

    const popupHtml = `
      <div class="map-context-menu">
        <h4>📍 Selected Location</h4>
        <small>Lat: ${latlng.lat.toFixed(4)}, Lng: ${latlng.lng.toFixed(4)}</small>
        <button class="ctx-btn" data-action="rent">🟢 Drop Anonymous Rent</button>
        <button class="ctx-btn" data-action="owner">🔵 List Flat (Zero Brokerage)</button>
        <button class="ctx-btn" data-action="seeker">🟣 Drop Seeker Pin</button>
        <button class="ctx-btn" data-action="tolet">🟡 Spot "To-Let" Board</button>
      </div>
    `;

    this.activeHoldPopup = L.popup({
      closeButton: true,
      closeOnClick: false, // Prevents closing on random map click
      autoClose: true,     // Automatically replaces when a new pin/popup opens
      className: 'hold-context-popup'
    })
      .setLatLng(latlng)
      .setContent(popupHtml)
      .openOn(this.map);

    // Attach click listeners to context menu buttons
    setTimeout(() => {
      if (!this.activeHoldPopup) return;
      const container = this.activeHoldPopup.getElement();
      if (container) {
        container.querySelectorAll('.ctx-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (this.activeHoldPopup) {
              this.map.closePopup(this.activeHoldPopup);
              this.activeHoldPopup = null;
            }
            if (actionCallback) {
              actionCallback(action, latlng);
            }
          });
        });
      }
    }, 50);
  }
}

window.TricityMapManager = TricityMapManager;

// Global Helper to Copy Pin Shareable Link to Clipboard
window.copyPinLink = function(pinId) {
  const pinUrl = window.location.origin + window.location.pathname + '?pin=' + pinId;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pinUrl).then(() => {
      alert('📋 Pin link copied to clipboard!\n' + pinUrl);
    }).catch(() => {
      prompt('Copy this pin link:', pinUrl);
    });
  } else {
    prompt('Copy this pin link:', pinUrl);
  }
};
