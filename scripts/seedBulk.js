
require('dotenv').config();
const { City, User, Property, Reservation } = require('../src/models');
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../src/utils/database');
const { faker } = require('@faker-js/faker');

const CITIES_COUNT = 20;
const USERS_COUNT = 100;
const PROPERTIES_COUNT = 500;
const BATCH_SIZE = 100;

const realCities = [
	{ name: 'Mumbai', state: 'Maharashtra', coordinates: [72.8777, 19.0760] },
	{ name: 'Delhi', state: 'Delhi', coordinates: [77.1025, 28.7041] },
	{ name: 'Bangalore', state: 'Karnataka', coordinates: [77.5946, 12.9716] },
	{ name: 'Hyderabad', state: 'Telangana', coordinates: [78.4867, 17.3850] },
	{ name: 'Chennai', state: 'Tamil Nadu', coordinates: [80.2707, 13.0827] },
	{ name: 'Kolkata', state: 'West Bengal', coordinates: [88.3639, 22.5726] },
	{ name: 'Pune', state: 'Maharashtra', coordinates: [73.8567, 18.5204] },
	{ name: 'Ahmedabad', state: 'Gujarat', coordinates: [72.5714, 23.0225] },
	{ name: 'Jaipur', state: 'Rajasthan', coordinates: [75.7873, 26.9124] },
	{ name: 'Lucknow', state: 'Uttar Pradesh', coordinates: [80.9462, 26.8467] }
];

const propertyTypes = ['apartment', 'house', 'villa', 'studio', 'room'];
const amenitiesList = ['wifi', 'ac', 'kitchen', 'parking', 'tv', 'washing_machine', 'geyser', 'balcony', 'power_backup', 'security', 'pool', 'gym', 'garden', 'lift', 'cctv', 'fire_extinguisher'];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomIndianCoordinates() {
	// India bounds: lat 8-35, lng 68-97
	return [parseFloat((68 + Math.random() * 29).toFixed(4)), parseFloat((8 + Math.random() * 27).toFixed(4))];
}

async function seedBulk() {
	try {
		const start = Date.now();
		await connectDatabase();
		console.log('[seed:bulk] Connected to MongoDB');
		const reservationsDeleted = await Reservation.deleteMany({});
		console.log(`[seed:bulk] Deleted ${reservationsDeleted.deletedCount} reservations`);
		await City.deleteMany({});
		await User.deleteMany({});
		await Property.deleteMany({});
		console.log('[seed:bulk] Cleared existing data');

		// Cities
		const citiesData = [];
		for (let i = 0; i < CITIES_COUNT; i++) {
			if (i < realCities.length) {
				const c = realCities[i];
				citiesData.push({
					name: c.name,
					state: c.state,
					country: 'India',
					coordinates: { type: 'Point', coordinates: c.coordinates },
					timezone: 'Asia/Kolkata',
					isActive: true
				});
			} else {
				citiesData.push({
					name: faker.location.city(),
					state: faker.location.state(),
					country: 'India',
					coordinates: { type: 'Point', coordinates: randomIndianCoordinates() },
					timezone: 'Asia/Kolkata',
					isActive: true
				});
			}
		}
			const cities = await City.insertMany(citiesData);

			// Users
			const usersData = [];
			for (let i = 0; i < USERS_COUNT; i++) {
				const isHost = Math.random() < 0.7;
				usersData.push({
					firstName: faker.person.firstName(),
					lastName: faker.person.lastName(),
					email: faker.internet.email().toLowerCase(),
					password: 'Password123',
					phone: '+91' + getRandomInt(6000000000, 9999999999),
					role: isHost ? 'host' : 'guest',
					isVerified: true,
					isActive: true,
					profile: {
						bio: faker.person.bio(),
						avatar: faker.image.avatar()
					}
				});
			}
			// Hash passwords before inserting users
			const usersDataHashed = await Promise.all(usersData.map(async user => ({
				...user,
				password: await bcrypt.hash(user.password, 10)
			})));
			const users = await User.insertMany(usersDataHashed);
			const hostUsers = users.filter(u => u.role === 'host');

		// Properties
			let inserted = 0;
			let allPropertyIds = [];
			for (let batch = 0; batch < Math.ceil(PROPERTIES_COUNT / BATCH_SIZE); batch++) {
				const propertiesData = [];
				for (let i = 0; i < BATCH_SIZE && inserted < PROPERTIES_COUNT; i++, inserted++) {
					const city = getRandom(cities);
					const host = getRandom(hostUsers);
					const type = getRandom(propertyTypes);
					const amenities = amenitiesList.sort(() => 0.5 - Math.random()).slice(0, getRandomInt(4, amenitiesList.length));
					propertiesData.push({
						title: `${getRandom(['Luxury', 'Cozy', 'Spacious', 'Modern', 'Charming', 'Elegant', 'Premium', 'Family', 'Boutique', 'Heritage', 'Urban', 'Peaceful', 'Smart', 'Classic', 'Trendy', 'Budget', 'Executive', 'Garden', 'Lakeview', 'Sunny'])} ${type} in ${city.name}`,
						description: faker.lorem.paragraphs(2),
						type,
						city: city._id,
						host: host._id,
						address: {
							street: `${getRandomInt(1, 200)}, ${faker.location.street()}`,
							area: faker.location.city(),
							pincode: getRandomInt(110000, 700000).toString(),
							location: { type: 'Point', coordinates: city.coordinates.coordinates }
						},
						pricing: {
							basePrice: getRandomInt(1000, 25000),
							cleaningFee: getRandomInt(300, 3000),
							securityDeposit: getRandomInt(3000, 30000),
							currency: 'INR'
						},
						capacity: {
							guests: getRandomInt(1, 10),
							bedrooms: getRandomInt(0, 5),
							bathrooms: getRandomInt(1, 4),
							beds: getRandomInt(1, 8)
						},
						amenities,
						images: [
							{ url: `https://source.unsplash.com/800x600/?house,india,${inserted}`, isMain: true },
							{ url: `https://source.unsplash.com/800x600/?apartment,india,${inserted}` }
						],
						status: inserted % 20 === 0 ? 'draft' : (inserted % 20 === 1 ? 'inactive' : 'active'),
						ratings: { average: (Math.random() * 2 + 3).toFixed(2), count: getRandomInt(0, 100) },
						rules: { checkIn: '2:00 PM', checkOut: '11:00 AM', houseRules: 'No loud music after 10 PM. No smoking indoors.' }
					});
				}
				const insertedProps = await Property.insertMany(propertiesData, { validateBeforeSave: false });
				allPropertyIds.push(...insertedProps.map(p => p._id));
				console.log(`[seed:bulk] Inserted batch ${batch + 1}/${Math.ceil(PROPERTIES_COUNT / BATCH_SIZE)}`);
			}
			const elapsed = ((Date.now() - start) / 1000).toFixed(1);
			console.log(`[seed:bulk] Bulk seeding completed in ${elapsed} seconds`);
			await disconnectDatabase();
			process.exit(0);
		} catch (err) {
			console.error('[seed:bulk] Error:', err);
			// Rollback: remove all inserted data
			try {
				await Property.deleteMany({});
				await User.deleteMany({});
				await City.deleteMany({});
				console.log('[seed:bulk] Rollback: All inserted data removed');
			} catch (rollbackErr) {
				console.error('[seed:bulk] Rollback failed:', rollbackErr);
			}
			await disconnectDatabase();
			process.exit(1);
		}
}

seedBulk();
