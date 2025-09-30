# Rentify API

A scalable RESTful API for a multi-city rental platform in India, built with Node.js, Express, and MongoDB.

**Author:** Raj Vishwakarma  
**Time to Complete:** ~8–10 hours

## Introduction

Production-ready rental platform API for India. Built with Node.js >= 18, Express.js 4, MongoDB 6 + Mongoose 8. Deployable to Render + MongoDB Atlas. Features JWT auth, Joi validation, and centralized error handling.

## Features
- Express server with Helmet, CORS, Morgan logging, request ID propagation
- Joi validation for all request bodies
- JWT authentication scaffold for secure endpoints
- MongoDB models: City, User, Property, Reservation
- Properties CRUD with advanced search (city, price, amenities)
- Reservations management with availability checking and calendar
- Analytics endpoints (properties, amenities, cities, revenue)
- Centralized error handling middleware
- Seeding utilities for development and testing

## Tech Stack
- Node.js >= 18
- Express.js 4
- MongoDB 6 + Mongoose 8
- Joi validation
- JWT authentication
- Helmet (security)
- CORS
- Morgan (logging)

## Getting Started

**Installation:**
```bash
git clone https://github.com/rajvishwakarma1/rentify-api.git
cd rentify-api
npm install
cp .env.example .env
```

**Environment Setup:**
- Edit `.env` file
- Fill in `MONGODB_URI` with MongoDB Atlas connection string
- Set `JWT_SECRET` to a secure random string
- Configure other variables as needed

**Run Locally:**
```bash
npm run dev
```
- Server: http://localhost:3000
- Health check: http://localhost:3000/health

## API Endpoints

**Base URL:** `http://localhost:3000/api/v1`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check (API + DB status) | ❌ |
| GET | `/properties` | List properties (with filters) | ❌ |
| GET | `/properties/:id` | Get property by ID | ❌ |
| POST | `/properties` | Create property | ✅ |
| PUT | `/properties/:id` | Update property | ✅ |
| DELETE | `/properties/:id` | Delete property | ✅ |
| GET | `/properties/city/:name/under/:price` | Properties by city under price | ❌ |
| GET | `/search` | Advanced search (text, amenities, price, city) | ❌ |
| GET | `/reservations` | List reservations | ✅ |
| GET | `/reservations/:id` | Get reservation by ID | ✅ |
| POST | `/reservations` | Create reservation | ✅ |
| PUT | `/reservations/:id` | Update reservation | ✅ |
| DELETE | `/reservations/:id` | Cancel reservation | ✅ |
| GET | `/reservations/property/:propertyId/availability` | Check property availability | ✅ |
| GET | `/reservations/property/:propertyId/calendar` | Get property calendar | ✅ |
| GET | `/analytics/properties` | Property statistics | ✅ |
| GET | `/analytics/amenities` | Amenity popularity | ✅ |
| GET | `/analytics/cities` | City performance metrics | ✅ |
| GET | `/analytics/revenue` | Revenue analysis | ✅ |

## Seeding Data

Populate the database with sample data:

```bash
# Seed basic data (10 cities, 10 users, 20 properties)
npm run seed

# Seed bulk data (20 cities, 100 users, 500 properties)
npm run seed:bulk

# Clear all seeded data
npm run seed:clear
```

## Deployment

**Deploy to Render:**
1. Create MongoDB Atlas cluster (M0 free tier)
2. Whitelist all IPs (0.0.0.0/0) in Atlas Network Access
3. Create database user and get connection string
4. Create new Web Service on Render
5. Connect GitHub repository
6. Set environment variables in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `DEFAULT_COUNTRY=India`
7. Deploy and test with `/health` endpoint

**Environment Variables for Render:**
The following environment variables are required (see `.env.example`):

- `PORT` - Default development port (e.g., 3000)
- `NODE_ENV` - Environment mode (`development`, `production`)
- `MONGODB_URI` - MongoDB Atlas connection string
- `DB_NAME` - Database name for the rental platform
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration time (e.g., 7d, 24h)
- `DEFAULT_COUNTRY` - Default country for the rental platform (e.g., India)
- `API_VERSION` - API versioning (e.g., v1)
- `CORS_ORIGIN` - Allowed origins for CORS (comma-separated for multiple)
- `LOG_LEVEL` - Logging level for production (e.g., info, warn, error)

## Project Structure
```
rentify-api/
├── src/
│   ├── routes/          # API routes
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose models
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utilities (database, logger)
│   └── app.js           # Express app setup
├── scripts/             # Seeding scripts
├── tests/               # Test files (future)
├── .env.example         # Environment template
├── package.json         # Dependencies
└── README.md            # Documentation
```

## License

MIT
