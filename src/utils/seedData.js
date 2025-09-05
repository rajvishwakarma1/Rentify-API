#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('./logger');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { City, User, Property } = require('../models');

const CITIES = [
  { name: 'Mumbai', state: 'MH', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [72.8777, 19.0760] } },
  { name: 'Delhi', state: 'DL', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.1025, 28.7041] } },
  { name: 'Bengaluru', state: 'KA', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.5946, 12.9716] } },
  { name: 'Hyderabad', state: 'TG', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [78.4867, 17.3850] } },
  { name: 'Ahmedabad', state: 'GJ', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [72.5714, 23.0225] } },
  { name: 'Chennai', state: 'TN', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [80.2707, 13.0827] } },
  { name: 'Kolkata', state: 'WB', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [88.3639, 22.5726] } },
  { name: 'Pune', state: 'MH', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [73.8567, 18.5204] } },
  { name: 'Jaipur', state: 'RJ', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [75.7873, 26.9124] } },
  { name: 'Surat', state: 'GJ', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [72.8311, 21.1702] } },
  { name: 'Lucknow', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [80.9462, 26.8467] } },
  { name: 'Kanpur', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [80.3319, 26.4499] } },
  { name: 'Nagpur', state: 'MH', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [79.0882, 21.1458] } },
  { name: 'Indore', state: 'MP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [75.8577, 22.7196] } },
  { name: 'Thane', state: 'MH', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [72.9770, 19.2183] } },
  { name: 'Bhopal', state: 'MP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.4126, 23.2599] } },
  { name: 'Visakhapatnam', state: 'AP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [83.2185, 17.6868] } },
  { name: 'Vadodara', state: 'GJ', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [73.1812, 22.3072] } },
  { name: 'Ghaziabad', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.4538, 28.6692] } },
  { name: 'Noida', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.3910, 28.5355] } },
  { name: 'Ludhiana', state: 'PB', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [75.8573, 30.9009] } },
  { name: 'Agra', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [78.0081, 27.1767] } },
  { name: 'Nashik', state: 'MH', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [73.7898, 19.9975] } },
  { name: 'Faridabad', state: 'HR', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.3090, 28.4089] } },
  { name: 'Meerut', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [77.7064, 28.9845] } },
  { name: 'Rajkot', state: 'GJ', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [70.8022, 22.3039] } },
  { name: 'Varanasi', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [82.9739, 25.3176] } },
  { name: 'Gorakhpur', state: 'UP', country: 'India', timezone: 'Asia/Kolkata', location: { type: 'Point', coordinates: [83.3732, 26.7606] } },
];

async function seedCities() {
  logger.info('Seeding cities');
  for (const city of CITIES) {
    await City.updateOne(
      { name: city.name, country: city.country },
      { $setOnInsert: city },
      { upsert: true }
    );
  }
  const count = await City.countDocuments();
  logger.info(`Cities count: ${count}`);
}

async function seedUsers() {
  logger.info('Seeding users');
  const exists = await User.findOne({ email: 'demo@rentify.local' });
  if (!exists) {
    const user = new User({ firstName: 'Demo', lastName: 'User', email: 'demo@rentify.local', passwordHash: '' });
    await user.setPassword('password123');
    user.emailVerified = true;
    await user.save();
  }
  const hostExists = await User.findOne({ email: 'host@rentify.local' });
  if (!hostExists) {
    const host = new User({ firstName: 'Demo', lastName: 'Host', email: 'host@rentify.local', role: 'host', passwordHash: '' });
    await host.setPassword('password123');
    host.emailVerified = true;
    await host.save();
  }
  const count = await User.countDocuments();
  logger.info(`Users count: ${count}`);
}

async function seedProperties() {
  logger.info('Seeding properties');
  const entries = [
    // Mumbai (more variety)
    { title: 'Modern Mumbai Apartment', city: 'Mumbai', country: 'India', address: { line1: 'Bandra West', postalCode: '400050' }, rate: 90, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
    { title: 'Mumbai Sea View Studio', city: 'Mumbai', country: 'India', address: { line1: 'Marine Drive', postalCode: '400020' }, rate: 120, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
    { title: 'South Mumbai Heritage Flat', city: 'Mumbai', country: 'India', address: { line1: 'Fort Area', postalCode: '400001' }, rate: 150, currency: 'INR', bedrooms: 3, bathrooms: 2, maxGuests: 5 },
    { title: 'Andheri Co-living Room', city: 'Mumbai', country: 'India', address: { line1: 'Andheri East', postalCode: '400069' }, rate: 40, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 1 },
    { title: 'Powai Lakeside 2BHK', city: 'Mumbai', country: 'India', address: { line1: 'Powai', postalCode: '400076' }, rate: 95, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
    { title: 'Bandra Cozy 1BHK', city: 'Mumbai', country: 'India', address: { line1: 'Pali Hill', postalCode: '400050' }, rate: 70, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },

    // Delhi & others
  // Delhi (expanded)
  { title: 'Delhi Central Studio', city: 'Delhi', country: 'India', address: { line1: 'Connaught Place', postalCode: '110001' }, rate: 70, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Delhi South Extension 2BHK', city: 'Delhi', country: 'India', address: { line1: 'South Ex', postalCode: '110049' }, rate: 95, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
  { title: 'Delhi Hauz Khas Village Loft', city: 'Delhi', country: 'India', address: { line1: 'Hauz Khas', postalCode: '110016' }, rate: 110, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Delhi Karol Bagh Family Suite', city: 'Delhi', country: 'India', address: { line1: 'Karol Bagh', postalCode: '110005' }, rate: 80, currency: 'INR', bedrooms: 2, bathrooms: 1, maxGuests: 4 },
  { title: 'Delhi Aerocity Business Stay', city: 'Delhi', country: 'India', address: { line1: 'Aerocity', postalCode: '110037' }, rate: 130, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Delhi Lajpat Nagar Budget Room', city: 'Delhi', country: 'India', address: { line1: 'Lajpat Nagar', postalCode: '110024' }, rate: 45, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 1 },
    { title: 'Bengaluru Tech Hub Condo', city: 'Bengaluru', country: 'India', address: { line1: 'HSR Layout', postalCode: '560102' }, rate: 80, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 3 },
    { title: 'Chennai Beach House', city: 'Chennai', country: 'India', address: { line1: 'ECR Road', postalCode: '600041' }, rate: 110, currency: 'INR', bedrooms: 3, bathrooms: 2, maxGuests: 6 },
  { title: 'Hyderabad HiTech City Flat', city: 'Hyderabad', country: 'India', address: { line1: 'HITEC City', postalCode: '500081' }, rate: 85, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
    { title: 'Pune Koregaon Park Suite', city: 'Pune', country: 'India', address: { line1: 'Koregaon Park', postalCode: '411001' }, rate: 75, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
    { title: 'Ahmedabad Heritage Home', city: 'Ahmedabad', country: 'India', address: { line1: 'Pol Area', postalCode: '380001' }, rate: 65, currency: 'INR', bedrooms: 2, bathrooms: 1, maxGuests: 3 },
    { title: 'Kolkata Park Street Loft', city: 'Kolkata', country: 'India', address: { line1: 'Park Street', postalCode: '700016' }, rate: 95, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
  { title: 'Jaipur Hawa Mahal View', city: 'Jaipur', country: 'India', address: { line1: 'MI Road', postalCode: '302001' }, rate: 60, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },

  // Ghaziabad (expanded)
  { title: 'Ghaziabad Raj Nagar Extension 2BHK', city: 'Ghaziabad', country: 'India', address: { line1: 'Raj Nagar Ext', postalCode: '201017' }, rate: 55, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
  { title: 'Ghaziabad Indirapuram Studio', city: 'Ghaziabad', country: 'India', address: { line1: 'Indirapuram', postalCode: '201014' }, rate: 48, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Ghaziabad Vasundhara Family Apt', city: 'Ghaziabad', country: 'India', address: { line1: 'Vasundhara', postalCode: '201012' }, rate: 60, currency: 'INR', bedrooms: 2, bathrooms: 1, maxGuests: 4 },
  { title: 'Ghaziabad Kaushambi Business Stay', city: 'Ghaziabad', country: 'India', address: { line1: 'Kaushambi', postalCode: '201010' }, rate: 75, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },

  // Noida (new + expanded)
  { title: 'Noida Sector 18 Central Studio', city: 'Noida', country: 'India', address: { line1: 'Sector 18', postalCode: '201301' }, rate: 65, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Noida Sector 62 IT Park 2BHK', city: 'Noida', country: 'India', address: { line1: 'Sector 62', postalCode: '201309' }, rate: 80, currency: 'INR', bedrooms: 2, bathrooms: 2, maxGuests: 4 },
  { title: 'Noida Sector 137 Expressway Apt', city: 'Noida', country: 'India', address: { line1: 'Sector 137', postalCode: '201305' }, rate: 55, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
  { title: 'Noida Sector 76 Family 3BHK', city: 'Noida', country: 'India', address: { line1: 'Sector 76', postalCode: '201306' }, rate: 95, currency: 'INR', bedrooms: 3, bathrooms: 2, maxGuests: 6 },
    // Gorakhpur (more variety)
    { title: 'Gorakhpur City Center Apartment', city: 'Gorakhpur', country: 'India', address: { line1: 'Golghar', postalCode: '273001' }, rate: 55, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
    { title: 'Gorakhpur Railway Junction Stay', city: 'Gorakhpur', country: 'India', address: { line1: 'Railway Station Road', postalCode: '273012' }, rate: 45, currency: 'INR', bedrooms: 1, bathrooms: 1, maxGuests: 2 },
    { title: 'Ramgarhtal Lake House', city: 'Gorakhpur', country: 'India', address: { line1: 'Ramgarhtal', postalCode: '273008' }, rate: 65, currency: 'INR', bedrooms: 2, bathrooms: 1, maxGuests: 3 },
  ];

  for (const e of entries) {
    const city = await City.findOne({ name: e.city, country: e.country });
    if (!city) { logger.warn(`${e.city} not found, skipping property "${e.title}"`); continue; }
    const exists = await Property.findOne({ title: e.title });
    if (!exists) {
      await Property.create({
        title: e.title,
        description: `Stay in ${e.city} near top attractions`,
        type: 'apartment',
        status: 'active',
        address: { line1: e.address.line1, cityText: e.city, postalCode: e.address.postalCode, country: e.country },
        city: city._id,
        location: { type: 'Point', coordinates: city.location.coordinates },
        pricing: { dailyRate: e.rate, cleaningFee: 20, currency: e.currency },
        capacity: { bedrooms: e.bedrooms, bathrooms: e.bathrooms, maxGuests: e.maxGuests },
        amenities: ['wifi', 'kitchen', 'air_conditioning'],
        images: [{ url: 'https://example.com/img.jpg', caption: 'Living room' }],
        availability: { instantBook: true, minNights: 1 },
      });
    }
  }
  const count = await Property.countDocuments();
  logger.info(`Properties count: ${count}`);
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function jitterCoordinates(baseLng, baseLat, maxDeltaDeg = 0.02) {
  const dlng = (Math.random() * 2 - 1) * maxDeltaDeg;
  const dlat = (Math.random() * 2 - 1) * maxDeltaDeg;
  return [Number((baseLng + dlng).toFixed(6)), Number((baseLat + dlat).toFixed(6))];
}

function priceRangeForCity(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('mumbai') || n.includes('thane')) return [60, 200];
  if (n.includes('delhi')) return [45, 150];
  if (n.includes('noida')) return [35, 110];
  if (n.includes('ghaziabad')) return [30, 100];
  if (n.includes('gorakhpur')) return [25, 80];
  return [40, 120];
}

function sampleAreasForCity(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('mumbai')) return ['Bandra', 'Andheri', 'Powai', 'Dadar', 'Worli', 'Lower Parel'];
  if (n.includes('delhi')) return ['Connaught Place', 'Hauz Khas', 'South Ex', 'Karol Bagh', 'Dwarka', 'Saket'];
  if (n.includes('noida')) return ['Sector 18', 'Sector 62', 'Sector 137', 'Sector 76', 'Sector 150'];
  if (n.includes('ghaziabad')) return ['Indirapuram', 'Raj Nagar Ext', 'Vasundhara', 'Kaushambi'];
  if (n.includes('gorakhpur')) return ['Golghar', 'Ramgarhtal', 'Rustampur'];
  return ['City Center', 'Old Town', 'East Block', 'West End'];
}

async function seedPropertiesBulk(perCity = 50, targetCities = []) {
  logger.info(`Bulk seeding properties: perCity=${perCity} targets=${targetCities.join(', ') || 'ALL (limited set)'}`);
  const filter = targetCities.length ? { name: { $in: targetCities } } : { name: { $in: ['Mumbai', 'Delhi', 'Ghaziabad', 'Noida', 'Gorakhpur'] } };
  const cities = await City.find(filter).lean();
  let totalCreated = 0;
  for (const c of cities) {
    const [lng, lat] = c.location && Array.isArray(c.location.coordinates) ? c.location.coordinates : [77.209, 28.6139];
    const [minP, maxP] = priceRangeForCity(c.name);
    const areas = sampleAreasForCity(c.name);
    const types = ['apartment', 'house', 'condo', 'studio', 'villa', 'loft'];
    const docs = [];
    for (let i = 0; i < perCity; i++) {
      const type = choice(types);
      const bedrooms = Math.max(1, type === 'studio' ? 1 : randInt(1, 3));
      const bathrooms = randInt(1, Math.min(2, bedrooms));
      const rate = randInt(minP, maxP);
      const area = choice(areas);
      const coords = jitterCoordinates(lng, lat, 0.03);
      const title = `${c.name} ${area} ${type} #${i + 1}`;
      docs.push({
        title,
        description: `Comfortable ${type} in ${area}, ${c.name}`,
        type,
        status: 'active',
        address: { line1: area, cityText: c.name, postalCode: '', country: c.country },
        city: c._id,
        location: { type: 'Point', coordinates: coords },
        pricing: { dailyRate: rate, cleaningFee: 0, securityDeposit: 0, currency: 'INR' },
        capacity: { bedrooms, bathrooms, maxGuests: Math.max(2, bedrooms * 2) },
        amenities: ['wifi', 'kitchen', ...(Math.random() > 0.5 ? ['air_conditioning'] : [])],
        images: [{ url: 'https://example.com/img.jpg', caption: `${c.name} ${area}` }],
        availability: { instantBook: true, minNights: 1, maxNights: 365 },
      });
    }
    try {
      const res = await Property.insertMany(docs, { ordered: false });
      totalCreated += res.length;
      logger.info(`Bulk seeded ${res.length} properties for ${c.name}`);
    } catch (e) {
      // ordered:false means duplicates or validation errors won't stop the batch
      logger.warn(`Bulk insert for ${c.name} completed with warnings`, { error: e.message });
    }
  }
  logger.info(`Bulk seeding complete. Created ~${totalCreated} documents (some may be skipped if duplicates).`);
}

async function clearAll() {
  logger.warn('Clearing all data...');
  await Promise.all([
    Property.deleteMany({}),
    User.deleteMany({}),
    City.deleteMany({}),
  ]);
}

async function run() {
  const arg = (process.argv[2] || '').toLowerCase();
  try {
    await connectDatabase();
    if (arg === 'clear') {
      await clearAll();
    } else if (arg === 'cities') {
      await seedCities();
    } else if (arg === 'users') {
      await seedUsers();
    } else if (arg === 'properties') {
      await seedProperties();
    } else if (arg === 'bulk') {
      const perCity = Number(process.argv[3]) && Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 50;
      const targets = process.argv.slice(4).filter(Boolean);
      await seedCities();
      await seedPropertiesBulk(perCity, targets);
    } else if (arg === 'all' || !arg) {
      await seedCities();
      await seedUsers();
      await seedProperties();
    }
  } catch (e) {
    logger.error('Seeding error', { error: e.message });
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  run().then(() => {
    logger.info('Seeding script finished');
    // ensure process exits in some CI shells where open handles may linger
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  });
}

module.exports = { seedCities, seedUsers, seedProperties, clearAll };
