// Analytics Controller
const { Property, Reservation, City } = require('../models');
const mongoose = require('mongoose');

// 1. Properties Analytics
exports.getPropertiesAnalytics = async (req, res, next) => {
  try {
    const [totals, byType, byStatus, pricing, ratings, hosts, capacity, growth] = await Promise.all([
      Property.aggregate([
        { $group: { _id: null, total: { $sum: 1 } } }
      ]),
      Property.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Property.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Property.aggregate([
        { $group: {
          _id: null,
          avg: { $avg: '$pricing.basePrice' },
          min: { $min: '$pricing.basePrice' },
          max: { $max: '$pricing.basePrice' }
        } }
      ]),
      Property.aggregate([
        { $group: {
          _id: null,
          avgRating: { $avg: '$ratings.average' },
          totalReviews: { $sum: '$ratings.count' }
        } }
      ]),
      Property.aggregate([
        { $group: { _id: '$host', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Property.aggregate([
        { $group: {
          _id: null,
          avgGuests: { $avg: '$capacity.guests' },
          avgBedrooms: { $avg: '$capacity.bedrooms' },
          avgBathrooms: { $avg: '$capacity.bathrooms' }
        } }
      ]),
      Property.aggregate([
        { $facet: {
          last30Days: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } } },
            { $count: 'count' }
          ],
          last90Days: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 90*24*60*60*1000) } } },
            { $count: 'count' }
          ],
          last365Days: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 365*24*60*60*1000) } } },
            { $count: 'count' }
          ]
        } }
      ])
    ]);
    res.json({
      totals: totals[0] || {},
      byType,
      byStatus,
      pricing: pricing[0] || {},
      ratings: ratings[0] || {},
      topHosts: hosts,
      capacity: capacity[0] || {},
      growth: {
        last30Days: (growth[0]?.last30Days?.[0]?.count) || 0,
        last90Days: (growth[0]?.last90Days?.[0]?.count) || 0,
        last365Days: (growth[0]?.last365Days?.[0]?.count) || 0
      }
    });
  } catch (err) { next(err); }
};

// 2. Amenities Analytics
exports.getAmenitiesAnalytics = async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { status: 'active' } },
      { $unwind: '$amenities' },
      { $group: {
        _id: '$amenities',
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricing.basePrice' }
      } },
      { $sort: { count: -1 } }
    ];
    const amenities = await Property.aggregate(pipeline);
    const total = await Property.countDocuments({ status: 'active' });
    const result = amenities.map(a => ({
      amenity: a._id,
      count: a.count,
      avgPrice: a.avgPrice,
      percentage: total ? (a.count / total * 100).toFixed(2) : 0
    }));
    res.json({ total, amenities: result });
  } catch (err) { next(err); }
};

// 3. Cities Analytics
exports.getCitiesAnalytics = async (req, res, next) => {
  try {
    // Aggregate property stats per city
    const propertyStatsPipeline = [
      { $lookup: { from: 'cities', localField: 'city', foreignField: '_id', as: 'city' } },
      { $unwind: '$city' },
      { $group: {
        _id: '$city._id',
        cityName: { $first: '$city.name' },
        state: { $first: '$city.state' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricing.basePrice' },
        avgRating: { $avg: '$ratings.average' }
      } },
      { $sort: { count: -1 } }
    ];
    const propertyStats = await Property.aggregate(propertyStatsPipeline);

    // Aggregate reservation stats per city
    const reservationStatsPipeline = [
      { $match: { status: 'completed' } },
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'property' } },
      { $unwind: '$property' },
      { $lookup: { from: 'cities', localField: 'property.city', foreignField: '_id', as: 'city' } },
      { $unwind: '$city' },
      { $group: {
        _id: '$city._id',
        cityName: { $first: '$city.name' },
        state: { $first: '$city.state' },
        bookings: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        totalNights: { $sum: '$nights' },
        totalProperties: { $addToSet: '$property._id' }
      } }
    ];
    const reservationStats = await Reservation.aggregate(reservationStatsPipeline);

    // Merge property and reservation stats
    const cityMap = {};
    for (const prop of propertyStats) {
      cityMap[prop._id.toString()] = {
        cityId: prop._id,
        cityName: prop.cityName,
        state: prop.state,
        propertyCount: prop.count,
        avgPrice: prop.avgPrice,
        avgRating: prop.avgRating,
        bookings: 0,
        totalRevenue: 0,
        occupancy: 0
      };
    }
    for (const res of reservationStats) {
      const city = cityMap[res._id.toString()];
      if (city) {
        city.bookings = res.bookings;
        city.totalRevenue = res.totalRevenue;
        // Occupancy = totalNights / (propertyCount * 365)
        city.occupancy = city.propertyCount ? (res.totalNights / (city.propertyCount * 365)) : 0;
      } else {
        // City with reservations but no properties (shouldn't happen)
        cityMap[res._id.toString()] = {
          cityId: res._id,
          cityName: res.cityName,
          state: res.state,
          propertyCount: 0,
          avgPrice: 0,
          avgRating: 0,
          bookings: res.bookings,
          totalRevenue: res.totalRevenue,
          occupancy: 0
        };
      }
    }
    const cities = Object.values(cityMap).sort((a, b) => b.propertyCount - a.propertyCount);
    res.json({ cities });
  } catch (err) { next(err); }
};

// 4. Revenue Analytics
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.query;
    const match = { status: 'completed' };
    if (startDate) match.checkIn = { $gte: new Date(startDate) };
    if (endDate) match.checkOut = Object.assign(match.checkOut || {}, { $lte: new Date(endDate) });
    let groupId;
    switch (period) {
      case 'daily': groupId = { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } }; break;
      case 'weekly': groupId = { $dateToString: { format: '%G-%V', date: '$checkIn' } }; break;
      case 'yearly': groupId = { $dateToString: { format: '%Y', date: '$checkIn' } }; break;
      default: groupId = { $dateToString: { format: '%Y-%m', date: '$checkIn' } };
    }
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyDoc'
        }
      },
      { $unwind: '$propertyDoc' },
      {
        $lookup: {
          from: 'cities',
          localField: 'propertyDoc.city',
          foreignField: '_id',
          as: 'cityDoc'
        }
      },
      { $unwind: { path: '$cityDoc', preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          timeSeries: [
            { $group: {
              _id: groupId,
              totalRevenue: { $sum: '$pricing.totalAmount' },
              bookings: { $sum: 1 },
              avgBooking: { $avg: '$pricing.totalAmount' }
            } },
            { $sort: { _id: 1 } }
          ],
          byPropertyType: [
            { $group: {
              _id: '$propertyDoc.type',
              totalRevenue: { $sum: '$pricing.totalAmount' },
              bookings: { $sum: 1 },
              avgBooking: { $avg: '$pricing.totalAmount' }
            } },
            { $sort: { totalRevenue: -1 } }
          ],
          byCity: [
            { $group: {
              _id: '$cityDoc.name',
              totalRevenue: { $sum: '$pricing.totalAmount' },
              bookings: { $sum: 1 },
              avgBooking: { $avg: '$pricing.totalAmount' }
            } },
            { $sort: { totalRevenue: -1 } }
          ]
        }
      }
    ];
    const [resultRaw] = await Reservation.aggregate(pipeline);
    const result = resultRaw || { timeSeries: [], byPropertyType: [], byCity: [] };
    res.json({
      period,
      revenue: result.timeSeries || [],
      byPropertyType: result.byPropertyType || [],
      byCity: result.byCity || []
    });
  } catch (err) { next(err); }
};
