// Search Controller
const { Property, City } = require('../models');
const mongoose = require('mongoose');

exports.searchProperties = async (req, res, next) => {
  try {
    const { text, city, amenities, minPrice, maxPrice, guests, bedrooms, bathrooms, lat, lng, radius, type, minRating, sort, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (text) filter.$text = { $search: text };
    if (city) {
      const cityDoc = await City.findOne({ name: city });
      if (cityDoc) filter.city = cityDoc._id;
    }
    if (type) filter.type = type;
    if (minPrice || maxPrice) filter['pricing.basePrice'] = {};
    if (minPrice) filter['pricing.basePrice'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.basePrice'].$lte = Number(maxPrice);
    if (amenities) filter.amenities = { $all: Array.isArray(amenities) ? amenities : [amenities] };
    if (guests) filter['capacity.guests'] = { $gte: Number(guests) };
    if (bedrooms) filter['capacity.bedrooms'] = { $gte: Number(bedrooms) };
    if (bathrooms) filter['capacity.bathrooms'] = { $gte: Number(bathrooms) };
    if (minRating) filter['ratings.average'] = { $gte: Number(minRating) };
    if (lat && lng && radius) {
      filter['address.location'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius)
        }
      };
    }
    let sortObj;
    if (sort) {
      sortObj = { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 };
    } else if (text) {
      sortObj = { score: { $meta: 'textScore' }, createdAt: -1 };
    } else {
      sortObj = { createdAt: -1 };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const properties = await Property.find(filter, text ? { score: { $meta: 'textScore' } } : {})
      .populate('city host')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));
    const total = await Property.countDocuments(filter);
    res.json({
      data: properties,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) { next(err); }
};
