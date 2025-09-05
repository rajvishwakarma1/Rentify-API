const { City, Property } = require('../models');
const { logger } = require('../utils/logger');

function normStr(s) { return (s || '').toString().trim(); }

async function ensureCityByName(name, country = 'India', location) {
  const query = { name: normStr(name), country: normStr(country) };
  const update = { ...query };
  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    update.location = { type: 'Point', coordinates: location.coordinates.map(Number) };
  }
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  const city = await City.findOneAndUpdate(query, { $setOnInsert: update }, opts);
  return city;
}

function mapListingToProperty(listing = {}, city) {
  const lng = Number(listing.lng ?? listing.longitude ?? listing.lon);
  const lat = Number(listing.lat ?? listing.latitude);
  const price = Number(listing.price ?? listing.rent ?? listing.amount ?? listing.dailyRate);
  const currency = normStr(listing.currency) || 'INR';
  const bedrooms = Number(listing.bedrooms ?? listing.bhk ?? listing.beds ?? 1);
  const bathrooms = Number(listing.bathrooms ?? listing.baths ?? 1);
  const maxGuests = Math.max(1, Number(listing.maxGuests ?? 2));
  const addressText = normStr(listing.address) || normStr(listing.locality) || normStr(listing.location) || city.name;
  const type = ['apartment', 'house', 'condo', 'studio', 'villa', 'loft'].includes(normStr(listing.type)) ? normStr(listing.type) : 'apartment';
  const title = normStr(listing.title) || `${city.name} ${type}`;

  return {
    title,
    description: normStr(listing.description) || title,
    type,
    status: 'active',
    address: { line1: addressText, cityText: city.name, country: city.country, postalCode: normStr(listing.postalCode) },
    city: city._id,
    location: (Number.isFinite(lng) && Number.isFinite(lat)) ? { type: 'Point', coordinates: [lng, lat] } : { type: 'Point', coordinates: city.location.coordinates },
    pricing: { dailyRate: Number.isFinite(price) ? price : 0, cleaningFee: 0, securityDeposit: 0, currency },
    capacity: { bedrooms: Number.isFinite(bedrooms) ? bedrooms : 1, bathrooms: Number.isFinite(bathrooms) ? bathrooms : 1, maxGuests },
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    images: Array.isArray(listing.images) && listing.images.length ? listing.images.map((u) => ({ url: u.url || u, caption: '' })) : [],
    availability: { instantBook: true, minNights: 1, maxNights: 365 },
  };
}

async function importListings(listings = [], { source = 'apify', cityName, country = 'India' } = {}) {
  if (!Array.isArray(listings) || !listings.length) return { created: 0, skipped: 0 };
  const first = listings[0];
  const inferredCity = cityName || normStr(first.city || first.cityName || first.city_text || first.location_city);
  if (!inferredCity) throw new Error('City could not be inferred; pass cityName');
  const sampleCoords = (first.lng != null && first.lat != null) ? { coordinates: [Number(first.lng), Number(first.lat)] } : undefined;
  const city = await ensureCityByName(inferredCity, country, sampleCoords);

  let created = 0, skipped = 0;
  for (const raw of listings) {
    try {
      const sourceUrl = normStr(raw.url || raw.link || raw.pageUrl || raw.detail_url);
      if (sourceUrl) {
        const dup = await Property.findOne({ 'images.caption': sourceUrl });
        if (dup) { skipped++; continue; }
      }
      const doc = mapListingToProperty(raw, city);
      // store source URL inside an image caption as a simple provenance tag if available
      const sUrl = normStr(raw.url || raw.link || raw.pageUrl || raw.detail_url);
      if (sUrl) { doc.images = [...(doc.images || []), { url: 'https://placeholder.invalid/src', caption: sUrl }]; }
      await Property.create(doc);
      created++;
    } catch (e) {
      skipped++;
      logger.warn('Import listing skipped', { error: e.message });
    }
  }
  return { created, skipped, city: city.name };
}

module.exports = { importListings };
