/**
 * CHANDIGARH.RENT — MATCHMAKING ENGINE
 * Matches flat seekers with available owner listings & flatmates based on budget, BHK & proximity.
 */

class TricityMatcher {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  // Calculate distance between two lat/lng pairs in KM (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  findMatchesForSeeker(seekerPin) {
    const allPins = this.dataManager.getAllPins();
    const ownerListings = allPins.filter(p => p.type === 'owner');

    const matches = ownerListings.map(listing => {
      let score = 0;
      const reasons = [];

      // 1. Distance check
      const dist = this.calculateDistance(seekerPin.lat, seekerPin.lng, listing.lat, listing.lng);
      if (dist <= 3.0) {
        score += 40;
        reasons.push(`Within ${dist.toFixed(1)} km of target area`);
      } else if (dist <= 6.0) {
        score += 20;
        reasons.push(`Within ${dist.toFixed(1)} km`);
      }

      // 2. BHK match
      if (listing.bhk === seekerPin.bhk) {
        score += 35;
        reasons.push(`Exact BHK match (${listing.bhk})`);
      }

      // 3. Budget match
      if (listing.rent <= seekerPin.budget) {
        score += 25;
        reasons.push(`Within your max budget (₹${listing.rent.toLocaleString('en-IN')})`);
      } else if (listing.rent <= seekerPin.budget * 1.15) {
        score += 10;
        reasons.push(`Slightly above budget (₹${listing.rent.toLocaleString('en-IN')})`);
      }

      return {
        listing,
        score,
        reasons,
        distanceKm: dist.toFixed(1)
      };
    }).filter(m => m.score >= 40)
      .sort((a, b) => b.score - a.score);

    return matches;
  }
}

window.tricityMatcher = new TricityMatcher(window.rentDataManager);
