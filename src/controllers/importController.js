const { runActorSyncGetItems } = require('../utils/apifyClient');
const { importListings } = require('../services/importer');
const { successResponse } = require('../utils/responseHelpers');

function ensureEnabled() {
  if (String(process.env.ENABLE_IMPORTERS || 'false').toLowerCase() !== 'true') {
    const e = new Error('Importers are disabled'); e.status = 403; throw e;
  }
}

// POST /api/v1/import/housing-search
// body: { urls: ["https://housing.com/in/buy/projects/<query>"] , max_items_per_url?: number, cityName?: string }
exports.housingSearch = async (req, res, next) => {
  try {
    ensureEnabled();
    const { urls = [], max_items_per_url = 20, cityName } = req.body || {};
    const input = { urls, max_items_per_url, max_retries_per_url: 2, proxy: { useApifyProxy: false } };
    const items = await runActorSyncGetItems('ecomscrape~housing-property-search-scraper', input);
    const result = await importListings(Array.isArray(items) ? items : (items.items || []), { source: 'apify:housing', cityName });
    return successResponse(res, result);
  } catch (e) { return next(e); }
};

// POST /api/v1/import/magicbricks-details
// body: { urls: [ "https://www.magicbricks.com/propertyDetails/..." ], cityName?: string }
exports.magicbricksDetails = async (req, res, next) => {
  try {
    ensureEnabled();
    const { urls = [], cityName } = req.body || {};
    const input = { urls, max_retries_per_url: 2, proxy: { useApifyProxy: true } };
    const items = await runActorSyncGetItems('ecomscrape~magicbricks-property-details-page-scraper', input);
    const result = await importListings(Array.isArray(items) ? items : (items.items || []), { source: 'apify:magicbricks', cityName });
    return successResponse(res, result);
  } catch (e) { return next(e); }
};
