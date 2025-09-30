
require('dotenv').config();
const { City, User, Property, Reservation } = require('../src/models');
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../src/utils/database');

const citiesData = [
	{ name: 'Mumbai', state: 'Maharashtra', country: 'India', coordinates: { type: 'Point', coordinates: [72.8777, 19.0760] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Delhi', state: 'Delhi', country: 'India', coordinates: { type: 'Point', coordinates: [77.1025, 28.7041] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Bangalore', state: 'Karnataka', country: 'India', coordinates: { type: 'Point', coordinates: [77.5946, 12.9716] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: { type: 'Point', coordinates: [78.4867, 17.3850] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Chennai', state: 'Tamil Nadu', country: 'India', coordinates: { type: 'Point', coordinates: [80.2707, 13.0827] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Kolkata', state: 'West Bengal', country: 'India', coordinates: { type: 'Point', coordinates: [88.3639, 22.5726] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Pune', state: 'Maharashtra', country: 'India', coordinates: { type: 'Point', coordinates: [73.8567, 18.5204] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Ahmedabad', state: 'Gujarat', country: 'India', coordinates: { type: 'Point', coordinates: [72.5714, 23.0225] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Jaipur', state: 'Rajasthan', country: 'India', coordinates: { type: 'Point', coordinates: [75.7873, 26.9124] }, timezone: 'Asia/Kolkata', isActive: true },
	{ name: 'Lucknow', state: 'Uttar Pradesh', country: 'India', coordinates: { type: 'Point', coordinates: [80.9462, 26.8467] }, timezone: 'Asia/Kolkata', isActive: true }
];

const usersData = [
	{ firstName: 'Raj', lastName: 'Sharma', email: 'raj.sharma@example.com', password: 'Password123', phone: '+919876543210', role: 'host', isVerified: true, isActive: true, profile: { bio: 'Experienced Mumbai host', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' } },
	{ firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@example.com', password: 'Password123', phone: '+919876543211', role: 'host', isVerified: true, isActive: true, profile: { bio: 'Ahmedabad property owner', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' } },
	{ firstName: 'Amit', lastName: 'Kumar', email: 'amit.kumar@example.com', password: 'Password123', phone: '+919876543212', role: 'host', isVerified: true, isActive: true, profile: { bio: 'Delhi superhost', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' } },
	{ firstName: 'Sneha', lastName: 'Reddy', email: 'sneha.reddy@example.com', password: 'Password123', phone: '+919876543213', role: 'host', isVerified: true, isActive: true, profile: { bio: 'Hyderabad villa specialist', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' } },
	{ firstName: 'Arjun', lastName: 'Singh', email: 'arjun.singh@example.com', password: 'Password123', phone: '+919876543214', role: 'host', isVerified: true, isActive: true, profile: { bio: 'Jaipur heritage stays', avatar: 'https://randomuser.me/api/portraits/men/5.jpg' } },
	{ firstName: 'Meera', lastName: 'Joshi', email: 'meera.joshi@example.com', password: 'Password123', phone: '+919876543215', role: 'guest', isVerified: true, isActive: true, profile: { bio: 'Travel enthusiast', avatar: 'https://randomuser.me/api/portraits/women/6.jpg' } },
	{ firstName: 'Vikram', lastName: 'Desai', email: 'vikram.desai@example.com', password: 'Password123', phone: '+919876543216', role: 'guest', isVerified: true, isActive: true, profile: { bio: 'Business traveler', avatar: 'https://randomuser.me/api/portraits/men/7.jpg' } },
	{ firstName: 'Anjali', lastName: 'Nair', email: 'anjali.nair@example.com', password: 'Password123', phone: '+919876543217', role: 'guest', isVerified: true, isActive: true, profile: { bio: 'Foodie and explorer', avatar: 'https://randomuser.me/api/portraits/women/8.jpg' } },
	{ firstName: 'Rohan', lastName: 'Kapoor', email: 'rohan.kapoor@example.com', password: 'Password123', phone: '+919876543218', role: 'guest', isVerified: true, isActive: true, profile: { bio: 'Frequent flyer', avatar: 'https://randomuser.me/api/portraits/men/9.jpg' } },
	{ firstName: 'Pooja', lastName: 'Gupta', email: 'pooja.gupta@example.com', password: 'Password123', phone: '+919876543219', role: 'guest', isVerified: true, isActive: true, profile: { bio: 'Solo traveler', avatar: 'https://randomuser.me/api/portraits/women/10.jpg' } }
];

const propertyTypes = ['apartment', 'house', 'villa', 'studio', 'room'];
const amenitiesList = ['wifi', 'ac', 'kitchen', 'parking', 'tv', 'washing_machine', 'geyser', 'balcony', 'power_backup', 'security'];
const propertyTitles = [
	'Luxury 2BHK in Bandra',
	'Cozy Studio near MG Road',
	'Spacious Villa in Jubilee Hills',
	'Modern Apartment in Powai',
	'Charming House in Koregaon Park',
	'Elegant Room in Salt Lake',
	'Premium Studio in Banjara Hills',
	'Family Home in Whitefield',
	'Boutique Villa in Vastrapur',
	'Heritage Stay in Pink City',
	'Urban Flat in Connaught Place',
	'Peaceful Retreat in Anna Nagar',
	'Smart Studio in Hinjewadi',
	'Classic Bungalow in Alipore',
	'Trendy Loft in Indiranagar',
	'Budget Room in Gomti Nagar',
	'Executive Suite in Hitech City',
	'Garden House in Aundh',
	'Lakeview Apartment in Powai',
	'Sunny Studio in Jubilee Hills'
];

const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
	try {
		await connectDatabase();
		console.log('[seed] Connected to MongoDB');
		const reservationsDeleted = await Reservation.deleteMany({});
		console.log(`[seed] Deleted ${reservationsDeleted.deletedCount} reservations`);
		await City.deleteMany({});
		await User.deleteMany({});
		await Property.deleteMany({});
		console.log('[seed] Cleared existing data');

			const cities = await City.insertMany(citiesData);
			// Hash passwords before inserting users
			const usersDataHashed = await Promise.all(usersData.map(async user => ({
				...user,
				password: await bcrypt.hash(user.password, 10)
			})));
			const users = await User.insertMany(usersDataHashed);

		const hostUsers = users.filter(u => u.role === 'host');
		const propertiesData = propertyTitles.map((title, i) => {
			const city = getRandom(cities);
			const host = getRandom(hostUsers);
			return {
				title,
				description: `A beautiful property in ${city.name}, perfect for families and business travelers. Close to major attractions and transport.`,
				type: getRandom(propertyTypes),
				city: city._id,
				host: host._id,
				address: {
					street: `${getRandomInt(1, 200)}, ${getRandom(['Main Road', 'MG Road', 'Park Street', 'Ring Road', 'High Street'])}`,
					area: getRandom(['Bandra', 'Powai', 'Jubilee Hills', 'Koregaon Park', 'Salt Lake', 'Whitefield', 'Vastrapur', 'Connaught Place', 'Anna Nagar', 'Gomti Nagar']),
					pincode: getRandomInt(110000, 700000).toString(),
					location: { type: 'Point', coordinates: city.coordinates.coordinates }
				},
				pricing: {
					basePrice: getRandomInt(1500, 15000),
					cleaningFee: getRandomInt(500, 2000),
					securityDeposit: getRandomInt(5000, 20000),
					currency: 'INR'
				},
				capacity: {
					guests: getRandomInt(1, 8),
					bedrooms: getRandomInt(0, 4),
					bathrooms: getRandomInt(1, 3),
					beds: getRandomInt(1, 6)
				},
				amenities: amenitiesList.slice(0, getRandomInt(4, amenitiesList.length)),
				images: [
					{ url: `https://source.unsplash.com/800x600/?house,india,${i}`, isMain: true },
					{ url: `https://source.unsplash.com/800x600/?apartment,india,${i}` }
				],
				status: i % 7 === 0 ? 'draft' : 'active',
				ratings: { average: (Math.random() * 1.5 + 3.5).toFixed(2), count: getRandomInt(0, 50) },
				rules: { checkIn: '2:00 PM', checkOut: '11:00 AM', houseRules: 'No loud music after 10 PM. No smoking indoors.' }
			};
		});

		const properties = await Property.insertMany(propertiesData);
		console.log(`[seed] Seeded ${cities.length} cities, ${users.length} users, ${properties.length} properties`);
		await disconnectDatabase();
		console.log('[seed] Disconnected from database');
		process.exit(0);
	} catch (err) {
		console.error('[seed] Error:', err);
		await disconnectDatabase();
		process.exit(1);
	}
}

seed();
