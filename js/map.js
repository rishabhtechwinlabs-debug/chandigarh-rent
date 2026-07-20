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
    this.activeTileStyle = 'light'; // 'light' or 'dark'
    this.tileLayers = {};

    // Center coordinates & Tricity Bounding Box (Chandigarh, Mohali, Panchkula, Kharar)
    this.defaultCenter = [30.7333, 76.7794];
    this.defaultZoom = 13;
    window.currentMapManager = this;

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

    // Prepare Community Reviews
    const comments = pin.comments || [];
    if (comments.length === 0 && pin.review) {
      comments.push({
        id: 'cmt-init-' + pin.id,
        author: 'Verified Renter',
        text: pin.review,
        rating: pin.rating || 5,
        date: pin.date || '2026-07-20'
      });
      pin.comments = comments;
    }

    let commentsListHTML = '';
    if (comments.length === 0) {
      commentsListHTML = '<p class="no-comments-text">No reviews yet. Be the first to post a review!</p>';
    } else {
      commentsListHTML = comments.map(c => `
        <div class="comment-item">
          <div class="comment-item-header">
            <strong>${c.author || 'Anonymous'}</strong>
            <span class="comment-stars">${'⭐'.repeat(c.rating || 5)}</span>
          </div>
          <p class="comment-item-text">${c.text}</p>
          <span class="comment-item-date">${c.date || ''}</span>
        </div>
      `).join('');
    }

    const commentsSectionHTML = `
      <div class="popup-comments-wrapper">
        <div class="comments-toggle-header" onclick="window.toggleCommentsBlock('${pin.id}')">
          <span>💬 Reviews & Comments (${comments.length})</span>
          <span class="comments-toggle-btn" id="cmtToggleLabel_${pin.id}">View / Add ✍️</span>
        </div>

        <div class="comments-collapsible-content" id="commentsBlock_${pin.id}" style="display: none;">
          <div class="comments-list-box">
            ${commentsListHTML}
          </div>

          <form class="pin-comment-form" onsubmit="window.submitPinComment(event, '${pin.id}')">
            <div class="form-row-sm">
              <input type="text" id="commentAuthor_${pin.id}" placeholder="Your Name / Alias" class="comment-input input-name" maxlength="30">
              <select id="commentRating_${pin.id}" class="comment-input select-rating">
                <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                <option value="4">⭐⭐⭐⭐ (4/5)</option>
                <option value="3">⭐⭐⭐ (3/5)</option>
                <option value="2">⭐⭐ (2/5)</option>
                <option value="1">⭐ (1/5)</option>
              </select>
            </div>
            <div class="form-row-sm" style="margin-top: 4px;">
              <input type="text" id="commentText_${pin.id}" placeholder="Write a comment or review..." required class="comment-input input-text" maxlength="200">
              <button type="submit" class="btn btn-primary btn-xs">Post</button>
            </div>
          </form>
        </div>
      </div>
    `;

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
        ${commentsSectionHTML}
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--border-color); font-size: 0.72rem;">
          <a href="https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}" target="_blank" style="color: #25d366; text-decoration: none; font-weight: 600;">📢 WhatsApp</a>
          <button type="button" onclick="window.copyPinLink('${pin.id}')" style="background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 600; font-size: 0.72rem;">📋 Copy Link</button>
          <button type="button" onclick="window.reportPin('${pin.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.72rem;">🚩 Report</button>
        </div>
      </div>
    `;
  }

  updateMarkerPopupContent(pinId) {
    const pin = this.dataManager.pins.find(p => p.id === pinId);
    if (!pin) return;

    this.markersLayer.eachLayer(marker => {
      if (marker.pinData && marker.pinData.id === pinId) {
        marker.pinData = pin;
        const newPopupHTML = this.generatePopupHTML(pin);
        marker.setPopupContent(newPopupHTML);
      }
    });
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

// Global Helper to Report Pin
window.reportPin = function(pinId) {
  if (window.showToast) {
    window.showToast('Thank you! This pin has been flagged for community review.', 'success');
  } else {
    alert('Thank you! This pin has been flagged for community review.');
  }
};

// Global Helper to Copy Pin Shareable Link to Clipboard
window.copyPinLink = function(pinId) {
  const pinUrl = window.location.origin + window.location.pathname + '?pin=' + pinId;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pinUrl).then(() => {
      if (window.showToast) {
        window.showToast('📋 Pin link copied to clipboard!\n' + pinUrl, 'info', 4500);
      } else {
        alert('📋 Pin link copied to clipboard!\n' + pinUrl);
      }
    }).catch(() => {
      prompt('Copy this pin link:', pinUrl);
    });
  } else {
    prompt('Copy this pin link:', pinUrl);
  }
};

// Global Helper to Toggle Comments Block in Leaflet Popup
window.toggleCommentsBlock = function(pinId) {
  const block = document.getElementById('commentsBlock_' + pinId);
  const label = document.getElementById('cmtToggleLabel_' + pinId);
  if (block) {
    if (block.style.display === 'none' || !block.style.display) {
      block.style.display = 'block';
      if (label) label.textContent = 'Hide ✖';
    } else {
      block.style.display = 'none';
      if (label) label.textContent = 'View / Add ✍️';
    }
  }
};

// Helper function to escape HTML special characters
function escapeHTMLStr(str) {
  return String(str || '').replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

// Global Helper to Post Comment / Review on Pin
window.submitPinComment = async function(event, pinId) {
  event.preventDefault();
  const authorInput = document.getElementById('commentAuthor_' + pinId);
  const ratingInput = document.getElementById('commentRating_' + pinId);
  const textInput = document.getElementById('commentText_' + pinId);

  const text = textInput ? textInput.value.trim() : '';
  if (!text) {
    if (window.showToast) window.showToast('⚠️ Please enter a comment or review text.', 'warning');
    return;
  }

  const author = authorInput && authorInput.value.trim() ? authorInput.value.trim() : 'Anonymous Renter';
  const rating = ratingInput ? Number(ratingInput.value) : 5;

  const newComment = await window.rentDataManager.addCommentToPin(pinId, { author, text, rating });

  if (newComment) {
    if (window.showToast) {
      window.showToast('🎉 Review posted successfully!', 'success');
    }

    // 1. Instant Live DOM update of open popup
    const commentsBlock = document.getElementById('commentsBlock_' + pinId);
    if (commentsBlock) {
      commentsBlock.style.display = 'block';

      const listBox = commentsBlock.querySelector('.comments-list-box');
      if (listBox) {
        // Remove "No reviews yet" message if present
        const noComments = listBox.querySelector('.no-comments-text');
        if (noComments) noComments.remove();

        // Create new comment element
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.style.animation = 'fadeInDown 0.3s ease';
        commentEl.innerHTML = `
          <div class="comment-item-header">
            <strong>${escapeHTMLStr(newComment.author)}</strong>
            <span class="comment-stars">${'⭐'.repeat(newComment.rating || 5)}</span>
          </div>
          <p class="comment-item-text">${escapeHTMLStr(newComment.text)}</p>
          <span class="comment-item-date">${newComment.date || ''}</span>
        `;
        // Insert as top comment immediately
        listBox.insertBefore(commentEl, listBox.firstChild);
      }

      // Update header count text
      const pin = window.rentDataManager.pins.find(p => p.id === pinId);
      const headerSpan = commentsBlock.previousElementSibling?.querySelector('span:first-child');
      if (headerSpan && pin && pin.comments) {
        headerSpan.textContent = `💬 Reviews & Comments (${pin.comments.length})`;
      }

      const toggleLabel = document.getElementById('cmtToggleLabel_' + pinId);
      if (toggleLabel) toggleLabel.textContent = 'Hide ✖';

      // Reset text field
      if (textInput) textInput.value = '';
    }

    // 2. Sync Leaflet popup cached content
    if (window.currentMapManager) {
      window.currentMapManager.updateMarkerPopupContent(pinId);
    }
  }
};

