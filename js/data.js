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
      const res = await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/pins?select=*`, {
        headers: {
          'apikey': window.SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
        }
      });
      if (res.ok) {
        const cloudPins = await res.json();
        if (cloudPins && cloudPins.length > 0) {
          const existingIds = new Set(this.pins.map(p => p.id));
          cloudPins.forEach(cp => {
            if (!existingIds.has(cp.id)) {
              this.pins.unshift(cp);
            }
          });
          this.save();
        }
      }
    } catch (e) {
      console.warn('Cloud database sync offline, using local storage dataset.', e);
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
      ...newPinData
    };
    this.pins.unshift(pin);
    this.save();

    // Post to Supabase Cloud DB if configured
    if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
      try {
        await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/pins`, {
          method: 'POST',
          headers: {
            'apikey': window.SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(pin)
        });
      } catch (e) {
        console.warn('Could not post pin to cloud DB', e);
      }
    }

    return pin;
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
