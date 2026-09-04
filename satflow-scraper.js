const axios = require('axios');

const TRPC_BASE = 'https://backend.satflow.com/trpc';

async function fetchSatflowStats() {
  try {
    const res = await axios.get(TRPC_BASE + '/collectionStats.collectionFloors', {
      params: { batch: 1, input: JSON.stringify({ '0': { json: { slugs: ['bitmap'], type: 'ordinals' } } }) },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    const data = res.data;
    if (Array.isArray(data) && data[0]?.result?.data?.json) {
      const stats = data[0].result.data.json[0];
      return {
        floor: stats.floor || 0,
        topBid: stats.topBid || 0,
        listedCount: stats.listedCount || 0,
        oneDayChange: stats.oneDayChange || 0,
        sevenDayChange: stats.sevenDayChange || 0,
        thirtyDayChange: stats.thirtyDayChange || 0
      };
    }
  } catch (e) {
    console.error('[SF-SCRAPER] Stats error: ' + e.message);
  }
  return null;
}

async function fetchSatflowSales(limit) {
  limit = limit || 100;
  try {
    const res = await axios.get(TRPC_BASE + '/activity.list', {
      params: { batch: 1, input: JSON.stringify({ '0': { json: { collectionId: 'bitmap', limit: limit } } }) },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    const data = res.data;
    if (Array.isArray(data) && data[0]?.result?.data?.json?.sales) {
      return data[0].result.data.json.sales;
    }
  } catch (e) {
    console.error('[SF-SCRAPER] Sales error: ' + e.message);
  }
  return [];
}

async function scrapeSatflowData() {
  console.error('[SF-SCRAPER] Fetching Satflow data via tRPC backend...');

  const stats = await fetchSatflowStats();
  if (stats) {
    console.error('[SF-SCRAPER] Stats: floor=' + stats.floor + ', listed=' + stats.listedCount + ', topBid=' + stats.topBid);
  }

  const sales = await fetchSatflowSales(100);
  console.error('[SF-SCRAPER] Got ' + sales.length + ' sales');

  return { stats, sales };
}

module.exports = { scrapeSatflowData, fetchSatflowStats, fetchSatflowSales };
