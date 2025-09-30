
require('dotenv').config();
const { City, User, Property, Reservation } = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/utils/database');

async function clearSeededData() {
	try {
		if (process.env.NODE_ENV === 'production') {
			console.error('[seed:clear] Refusing to run in production environment. Set NODE_ENV to development to proceed.');
			process.exit(1);
		}
		await connectDatabase();
		console.log('[seed:clear] Connected to MongoDB');
		console.log('[seed:clear] ⚠️  WARNING: Clearing all data...');

		const reservationCount = await Reservation.countDocuments();
		const propertyCount = await Property.countDocuments();
		const userCount = await User.countDocuments();
		const cityCount = await City.countDocuments();

		await Reservation.deleteMany({});
		console.log(`[seed:clear] Deleted ${reservationCount} reservations`);
		await Property.deleteMany({});
		console.log(`[seed:clear] Deleted ${propertyCount} properties`);
		await User.deleteMany({});
		console.log(`[seed:clear] Deleted ${userCount} users`);
		await City.deleteMany({});
		console.log(`[seed:clear] Deleted ${cityCount} cities`);

		console.log('[seed:clear] ✅ All data cleared successfully');
		await disconnectDatabase();
		console.log('[seed:clear] Disconnected from database');
		process.exit(0);
	} catch (err) {
		console.error('[seed:clear] Error:', err);
		await disconnectDatabase();
		process.exit(1);
	}
}

clearSeededData();
