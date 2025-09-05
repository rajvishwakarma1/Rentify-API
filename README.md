# Rentify API

A foundational Node.js/Express API with MongoDB integration, containerized via Docker. This project sets up a scalable structure for a multi-city rental platform.

## Features
- Express.js server with security (Helmet), CORS, and request logging (Morgan)
- Centralized error handling and Joi-based validation middleware
- MongoDB via Mongoose with connection management and graceful shutdown
- Health check endpoint `/health` and API versioning under `/api/v1`
- Structured project layout: routes, controllers, models, middleware, utils
- Dockerfile (prod) and docker-compose (dev) for easy local and containerized runs
 - Redis-backed caching for frequent search and analytics queries

# Rentify API

Scalable Node.js/Express API for a multi-city rental platform, with MongoDB, Redis caching, analytics, and Dockerized dev setup. Default scope is India-only via `DEFAULT_COUNTRY=India`.

## What’s included
- Express app: Helmet, CORS, Morgan, request-id propagation
- Central error handling and Joi validation middleware
- MongoDB (Mongoose 8): models for City, User, Property, Reservation
- Search & filtering (text, geo, amenities, price)
- Reservations, availability, calendar
- Analytics (properties, amenities, city performance, revenue)
- Redis caching for search/analytics (resilient if Redis is down)
- Query monitoring for slow queries (Mongoose hooks)
- Dockerfile + docker-compose for local dev

## Tech stack
- Node.js >= 18, Express 4
- MongoDB 6 + Mongoose 8
- Joi validation
- Redis 7
- Docker & Compose

## Run locally (without Docker)
```powershell
# 1) Copy environment and edit if needed
Copy-Item .env.example .env

# 2) Install deps
npm install

# 3) Start dev server
npm run dev
```

Defaults: http://localhost:3000
- Health: http://localhost:3000/health
- API: http://localhost:3000/api/v1

## Run with Docker (recommended for dev)
```powershell
# build and start (app + mongo + redis)
docker compose up --build

# stop and remove containers
docker compose down
```

Services
- App: http://localhost:3000
- MongoDB: mongodb://localhost:27017 (db: rentify)
- Redis: redis://localhost:6379

## Seed data
Seeds India-focused cities and sample properties.
```powershell
# seed everything (cities, users, properties)
docker exec -it rentify-app npm run seed

# seed specific groups
docker exec -it rentify-app npm run seed:cities
docker exec -it rentify-app npm run seed:users
docker exec -it rentify-app npm run seed:properties

# clear all seeded data
docker exec -it rentify-app npm run seed:clear

# full reset (clear + all)
docker exec -it rentify-app npm run db:reset
 
 # bulk generate many listings per city (default 50 each)
 docker exec -it rentify-app npm run seed:bulk
 
 # bulk generate N per city (e.g., 100)
 docker exec -it rentify-app node src/utils/seedData.js bulk 100
 
 # bulk generate N only for selected cities
 docker exec -it rentify-app node src/utils/seedData.js bulk 75 Mumbai Delhi Noida
```

Local (without Docker): replace the docker exec prefix with plain npm/node, for example:
```powershell
# run from project root
npm run seed:bulk
node src/utils/seedData.js bulk 100 Mumbai Delhi
```

## Environment variables
See `.env.example` for the full list. Key ones:
- PORT: 3000
- NODE_ENV: development | production
- MONGODB_URI: e.g. mongodb://mongo:27017
- DB_NAME: rentify
- REDIS_URL: e.g. redis://redis:6379
- SLOW_QUERY_THRESHOLD_MS, ENABLE_QUERY_MONITORING
- DEFAULT_COUNTRY: India

## API endpoints (v1)
Base path: `/api/v1`

### Health
- `GET /health` → returns server and DB status

### Properties
- `GET /api/v1/properties` — list with filters
  - Query: q, cityId, minPrice, maxPrice, type, status, sort, page, limit
  - Example:
    ```powershell
    # Active apartments in Mumbai cityId with price <= 15000, page 1 limit 10
    (Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/v1/properties?cityId=<CITY_ID>&type=apartment&maxPrice=15000&page=1&limit=10").Content
    ```

- Simple city-name shortcuts
  - `GET /api/v1/properties/city/:name`
  - `GET /api/v1/properties/city/:name/under/:maxPrice`
  - `GET /api/v1/properties/city/:name/max/:max`
  - `GET /api/v1/properties/city/:name/under/:maxPrice/max/:max`
  - Optional query equivalents: `?under=15000&max=10`
  - Examples:
    ```powershell
    # Top 5 Mumbai listings under 15000
    (Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/v1/properties/city/Mumbai/under/15000/max/5").Content

    # Any city by name (India default scope), at most 10 results
    (Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/v1/properties/city/Gorakhpur/max/10").Content
    ```

- `GET /api/v1/properties/:id`
- `POST /api/v1/properties`
- `PUT /api/v1/properties/:id`
- `DELETE /api/v1/properties/:id` (soft delete by default; `?hard=true` for hard delete)

### Search
- `GET /api/v1/search` — advanced search (text, price, amenities, city)
- `GET /api/v1/search/nearby` — by geo point + radius
- `GET /api/v1/search/amenities` — filter by amenity list
- `GET /api/v1/search/filters` — cached filter data for UI

### Reservations
- `GET /api/v1/reservations` (with query filters)
- `GET /api/v1/reservations/:id`
- `POST /api/v1/reservations`
- `PUT /api/v1/reservations/:id`
- `DELETE /api/v1/reservations/:id`
- `GET /api/v1/reservations/user/:userId`
- `GET /api/v1/reservations/property/:propertyId/availability`
- `GET /api/v1/reservations/property/:propertyId/calendar`

### Analytics
- `GET /api/v1/analytics/properties` — basic property stats
- `GET /api/v1/analytics/amenities` — amenity popularity
- `GET /api/v1/analytics/cities` — city performance
- `GET /api/v1/analytics/revenue` — revenue by period/city (cached)
  - Query: period=daily|monthly|yearly, from, to, cityId
  - Example:
    ```powershell
    (Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/v1/analytics/revenue?period=monthly").Content
    ```

## Caching & monitoring
- Redis caching wraps common analytics/search results; auto-invalidates on property changes.
- Slow query monitor logs queries exceeding `SLOW_QUERY_THRESHOLD_MS`.

## Notes
- India-only default: If `DEFAULT_COUNTRY=India` and you don’t pass `cityId`, results are constrained to Indian cities.
- If a specific endpoint returns 404, ensure the service is running and data is seeded.

## Deploy to Vercel (free, serverless)
- Prereqs: GitHub repo, Vercel account, MongoDB Atlas free M0 cluster.
- Files added: `vercel.json`, `api/index.js` (serverless entry -> Express app).
- Steps:
  1. Push this repo to GitHub.
  2. In Vercel, “New Project” → import this repo.
  3. Set env vars in Vercel Project Settings → Environment Variables:
    - NODE_ENV=production
    - MONGODB_URI= your Atlas connection string WITHOUT the DB name (e.g., mongodb+srv://user:pass@cluster/)
    - DB_NAME= rentify
    - DEFAULT_COUNTRY= India
    - LOG_LEVEL= info
    - (Optional) SLOW_QUERY_THRESHOLD_MS, ENABLE_QUERY_MONITORING
    - Leave REDIS_URL empty or remove caching (app tolerates no Redis).
  4. Deploy. Your API will be available at your Vercel domain with HTTPS.
  5. Test endpoints:
    - https://<your-vercel-domain>/health
    - https://<your-vercel-domain>/api/v1/properties/city/Mumbai/max/5

Notes:
- Serverless best practices: avoid long-running tasks; keep responses <10s.
- Seeding: For production, create data via API endpoints or a one-time script run locally pointing to Atlas.

## License
MIT
