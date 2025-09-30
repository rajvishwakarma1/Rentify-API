
const { connectDatabase } = require('../utils/database');
(async () => {
	try {
		await connectDatabase();
	} catch (e) {
		console.error('Failed to connect to database:', e);
		process.exit(1);
	}
})();

const City = require('./City');
const User = require('./User');
const Property = require('./Property');
const Reservation = require('./Reservation');
module.exports = { City, User, Property, Reservation };
