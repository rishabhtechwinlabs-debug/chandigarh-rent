/**
 * CHANDIGARH.RENT — DATA MANAGEMENT & SEED DATASET
 * Persistent dataset for Chandigarh, Mohali & Panchkula.
 * Includes LocalStorage synchronization & Supabase ready hooks.
 */

// Initial Dataset - Empty for actual live user data
const INITIAL_TRICITY_DATA = [];

// Optional Supabase Free Database Configuration
window.SUPABASE_CONFIG = {
  url: 'https://xqqjhwsjayvkeecstjfv.supabase.co',      // e.g. 'https://xyzcompany.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxcWpod3NqYXl2a2VlY3N0amZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjQ0MTMsImV4cCI6MjEwMDEwMDQxM30.myomqVSd9AiE_EJp7rPzL6puTp5M6PSW6Nb01nftymg'   // e.g. 'eyJhbGciOiJIUzI1Ni...'
};

// Data Management Class
class RentDataManager {
  constructor() {
    this.storageKey = 'chandigarh_rent_pins_v1';
    this.pins = [];
    this.init();
  }

  async init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out old initial dummy seed pins (pin-001 to pin-016)
        this.pins = parsed.filter(p => !p.id.startsWith('pin-00') && !p.id.startsWith('pin-01'));
      } catch (e) {
        console.error('Failed to parse saved rent data', e);
        this.pins = [];
      }
    } else {
      this.pins = [];
    }

    this.save();

    // Fetch actual live user data from Supabase Cloud DB
    await this.syncFromCloud();
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.pins));
  }

  async syncFromCloud() {
    if (!window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.anonKey) return;
    try {
      const res = await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/pins?select=*&order=id.desc`, {
        headers: {
          'apikey': window.SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
        }
      });
      if (res.ok) {
        const cloudPins = await res.json();
        if (cloudPins && Array.isArray(cloudPins) && cloudPins.length > 0) {
          cloudPins.forEach(cp => {
            // Restore seekerName from contactName if type is seeker
            if (cp.type === 'seeker' && cp.contactName && !cp.seekerName) {
              cp.seekerName = cp.contactName;
            }

            // Restore extra metadata (comments & photoData) from JSON notes column
            if (cp.notes && typeof cp.notes === 'string' && cp.notes.trim().startsWith('{')) {
              try {
                const meta = JSON.parse(cp.notes);
                if (meta.comments && Array.isArray(meta.comments)) cp.comments = meta.comments;
                if (meta.photoData) cp.photoData = meta.photoData;
              } catch (e) {}
            } else if (cp.notes && typeof cp.notes === 'string' && cp.notes.trim().startsWith('[')) {
              try {
                cp.comments = JSON.parse(cp.notes);
              } catch (e) {
                cp.comments = [];
              }
            }

            if (!cp.comments || cp.comments.length === 0) {
              if (cp.review) {
                cp.comments = [{
                  id: 'cmt-init-' + cp.id,
                  author: 'Verified Renter',
                  text: cp.review,
                  rating: cp.rating || 5,
                  date: cp.date || '2026-07-20'
                }];
              } else {
                cp.comments = [];
              }
            }
          });

          // Cloud DB is the primary source of truth
          const cloudIdSet = new Set(cloudPins.map(p => p.id));
          const localOnly = this.pins.filter(p => !cloudIdSet.has(p.id));
          this.pins = [...cloudPins, ...localOnly];
          this.save();
        }
      }
    } catch (e) {
      console.warn('Cloud database sync offline, using local storage dataset fallback.', e);
    }
  }

  getAllPins() {
    const invalidKeywords = ['dasdasda', 'asdf', 'qwerty', 'test', '123'];
    return this.pins.filter(p => {
      if (!p || !p.sector) return false;
      const s = p.sector.toLowerCase().trim();
      return !invalidKeywords.includes(s) && s.length >= 3;
    });
  }

  async addPin(newPinData) {
    const pin = {
      id: 'pin-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString().split('T')[0],
      comments: [],
      ...newPinData
    };
    if (newPinData.review) {
      pin.comments = [{
        id: 'cmt-' + Date.now().toString(36),
        author: 'Verified Renter',
        text: newPinData.review,
        rating: newPinData.rating || 5,
        date: pin.date
      }];
    }

    this.pins.unshift(pin);
    this.save();

    // Format payload for exact Supabase DB schema
    if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
      try {
        const extraMeta = {
          comments: pin.comments || [],
          photoData: pin.photoData || null
        };

        const dbPayload = {
          id: pin.id,
          type: pin.type || 'rent',
          city: pin.city || 'Chandigarh',
          sector: pin.sector || 'Sector 15',
          lat: pin.lat ? Number(pin.lat) : 30.7414,
          lng: pin.lng ? Number(pin.lng) : 76.7791,
          bhk: pin.bhk || null,
          rent: pin.rent ? Number(pin.rent) : null,
          budget: pin.budget ? Number(pin.budget) : null,
          maintenance: pin.maintenance !== undefined && pin.maintenance !== null ? Number(pin.maintenance) : null,
          deposit: pin.deposit ? Number(pin.deposit) : null,
          furnished: pin.furnished || null,
          gated: pin.gated || null,
          rating: pin.rating ? Number(pin.rating) : null,
          review: pin.review || null,
          desc: pin.desc || null,
          tenantPref: pin.tenantPref || null,
          ownerType: pin.ownerType || null,
          contactName: pin.contactName || pin.seekerName || null,
          phone: pin.phone || null,
          contact: pin.contact || null,
          moveDate: pin.moveDate || null,
          profile: pin.profile || null,
          notes: JSON.stringify(extraMeta),
          date: pin.date
        };

        await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/pins`, {
          method: 'POST',
          headers: {
            'apikey': window.SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(dbPayload)
        });
      } catch (e) {
        console.warn('Could not post pin to cloud DB', e);
      }
    }

    return pin;
  }

  async addCommentToPin(pinId, commentData) {
    const pin = this.pins.find(p => p.id === pinId);
    if (!pin) return null;

    if (!pin.comments) {
      pin.comments = [];
    }

    const newComment = {
      id: 'cmt-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      author: commentData.author || 'Anonymous Renter',
      text: String(commentData.text).trim(),
      rating: Number(commentData.rating) || 5,
      date: new Date().toISOString().split('T')[0]
    };

    pin.comments.unshift(newComment);

    const extraMeta = {
      comments: pin.comments,
      photoData: pin.photoData || null
    };
    pin.notes = JSON.stringify(extraMeta);
    pin.review = newComment.text;
    pin.rating = newComment.rating;

    this.save();

    // Sync comment to Supabase Cloud DB if available
    if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
      try {
        await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/pins?id=eq.${pinId}`, {
          method: 'PATCH',
          headers: {
            'apikey': window.SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            notes: pin.notes,
            review: newComment.text,
            rating: newComment.rating
          })
        });
      } catch (e) {
        console.warn('Could not sync comment to cloud DB', e);
      }
    }

    return newComment;
  }

  exportDataJSON() {
    return JSON.stringify(this.pins, null, 2);
  }

  importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        this.pins = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON dataset', e);
    }
    return false;
  }

  filterPins(filters = {}) {
    return this.getAllPins().filter(pin => {
      // City Filter
      if (filters.city && filters.city !== 'all') {
        if (pin.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      }

      // Pin Type Filter
      if (filters.allowedTypes && Array.isArray(filters.allowedTypes)) {
        if (!filters.allowedTypes.includes(pin.type)) return false;
      }

      // BHK Filter
      if (filters.bhk && filters.bhk !== 'all') {
        if (filters.bhk === 'PG' && pin.bhk !== 'PG' && pin.bhk !== '1RK') return false;
        if (filters.bhk !== 'PG' && pin.bhk !== filters.bhk) return false;
      }

      // Max Rent / Budget Filter
      if (filters.maxRent) {
        const pinCost = pin.rent || pin.budget || 0;
        if (pinCost > filters.maxRent) return false;
      }

      // Gated Filter
      if (filters.gatedOnly) {
        if (pin.gated !== 'Yes') return false;
      }

      // Furnished Only
      if (filters.furnishedOnly) {
        if (pin.furnished !== 'Fully Furnished') return false;
      }

      // Student Friendly
      if (filters.studentFriendly) {
        const isStudent = (pin.tenantPref && pin.tenantPref.includes('Student')) ||
          (pin.profile && pin.profile === 'Student') ||
          (pin.review && pin.review.toLowerCase().includes('student'));
        if (!isStudent) return false;
      }

      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const sectorMatch = pin.sector.toLowerCase().includes(q);
        const cityMatch = pin.city.toLowerCase().includes(q);
        const reviewMatch = (pin.review || pin.desc || pin.notes || '').toLowerCase().includes(q);
        if (!sectorMatch && !cityMatch && !reviewMatch) return false;
      }

      return true;
    });
  }

  resetToDefaults() {
    this.pins = [...INITIAL_TRICITY_DATA];
    this.save();
    return this.pins;
  }
}

// Global instance
window.rentDataManager = new RentDataManager();
