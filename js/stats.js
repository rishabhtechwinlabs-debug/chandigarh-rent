/**
 * CHANDIGARH.RENT — STATS & BENCHMARK ANALYTICS ENGINE
 * Computes average rent prices, ranges, landlord ratings, and sector comparisons.
 */

class TricityStatsEngine {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  // Compute metrics for current filtered pins
  computeOverviewStats(pins) {
    const rentPins = pins.filter(p => p.type === 'rent' || p.type === 'owner');
    
    if (rentPins.length === 0) {
      return {
        avg1BHK: 'N/A',
        avg2BHK: 'N/A',
        avg3BHK: 'N/A',
        avgLandlordRating: '4.2 / 5',
        totalPins: pins.length
      };
    }

    const bhk1 = rentPins.filter(p => p.bhk === '1BHK' || p.bhk === '1RK').map(p => p.rent);
    const bhk2 = rentPins.filter(p => p.bhk === '2BHK').map(p => p.rent);
    const bhk3 = rentPins.filter(p => p.bhk === '3BHK').map(p => p.rent);

    const calcAvg = (arr) => arr.length ? '₹' + Math.round(arr.reduce((a, b) => a + b, 0) / arr.length).toLocaleString('en-IN') : 'N/A';

    const ratings = rentPins.filter(p => p.rating).map(p => Number(p.rating));
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) + ' / 5' : '4.2 / 5';

    return {
      avg1BHK: calcAvg(bhk1),
      avg2BHK: calcAvg(bhk2),
      avg3BHK: calcAvg(bhk3),
      avgLandlordRating: avgRating,
      totalPins: pins.length
    };
  }

  // Generate sector-wise benchmark table
  generateSectorBenchmark() {
    const allPins = this.dataManager.getAllPins();
    
    // Group by sector
    const sectorMap = {};

    allPins.forEach(pin => {
      const sec = pin.sector.split('-')[0].trim(); // Normalize e.g. "Sector 15-D" -> "Sector 15"
      if (!sectorMap[sec]) {
        sectorMap[sec] = {
          sectorName: sec,
          city: pin.city,
          rents1BHK: [],
          rents2BHK: [],
          rents3BHK: [],
          gatedCount: 0,
          total: 0
        };
      }

      sectorMap[sec].total++;
      if (pin.gated === 'Yes') sectorMap[sec].gatedCount++;

      const val = pin.rent || pin.budget;
      if (val) {
        if (pin.bhk === '1BHK' || pin.bhk === '1RK') sectorMap[sec].rents1BHK.push(val);
        if (pin.bhk === '2BHK') sectorMap[sec].rents2BHK.push(val);
        if (pin.bhk === '3BHK') sectorMap[sec].rents3BHK.push(val);
      }
    });

    const rows = Object.values(sectorMap).map(s => {
      const avg = (arr) => arr.length ? '₹' + Math.round(arr.reduce((a, b) => a + b, 0) / arr.length).toLocaleString('en-IN') : '-';
      const gatedPct = s.total ? Math.round((s.gatedCount / s.total) * 100) + '%' : '0%';

      return {
        sector: s.sectorName,
        city: s.city,
        bhk1Avg: avg(s.rents1BHK),
        bhk2Avg: avg(s.rents2BHK),
        bhk3Avg: avg(s.rents3BHK),
        gatedPct: gatedPct
      };
    });

    return rows;
  }
}

window.tricityStatsEngine = new TricityStatsEngine(window.rentDataManager);
