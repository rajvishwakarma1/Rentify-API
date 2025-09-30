// Properties Controller
const { Property, City, User } = require('../models');
const mongoose = require('mongoose');

// List properties with filtering, pagination, sorting
exports.getProperties = async (req, res, next) => {
  try {
    const { city, minPrice, maxPrice, type, status, amenities, guests, bedrooms, bathrooms, sort, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (city) filter.city = city;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (minPrice || maxPrice) filter['pricing.basePrice'] = {};
    if (minPrice) filter['pricing.basePrice'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.basePrice'].$lte = Number(maxPrice);
    if (amenities) filter.amenities = { $all: Array.isArray(amenities) ? amenities : [amenities] };
    if (guests) filter['capacity.guests'] = { $gte: Number(guests) };
    if (bedrooms) filter['capacity.bedrooms'] = { $gte: Number(bedrooms) };
    if (bathrooms) filter['capacity.bathrooms'] = { $gte: Number(bathrooms) };
    const sortObj = sort ? { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } : { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('city host')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));
    res.json({
      data: properties,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) { next(err); }
};

// Get property by ID
exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate('city host');
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });
    res.json(property);
  } catch (err) { next(err); }
};

// Create property
exports.createProperty = async (req, res, next) => {
  try {
    const host = req.user && req.user.sub;
    if (!host) return res.status(401).json({ message: 'Unauthorized', requestId: req.id });
    const property = new Property({ ...req.body, host });
    await property.save();
    res.status(201).json(property);
  } catch (err) { next(err); }
};

// Update property
exports.updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });
    if (String(property.host) !== req.user.sub) return res.status(403).json({ message: 'Forbidden', requestId: req.id });
    Object.assign(property, req.body);
    await property.save();
    res.json(property);
  } catch (err) { next(err); }
};

// Delete property (soft delete)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found', requestId: req.id });
    if (String(property.host) !== req.user.sub) return res.status(403).json({ message: 'Forbidden', requestId: req.id });
    property.status = 'inactive';
    await property.save();
    res.status(204).end();
  } catch (err) { next(err); }
};

// Get properties by city
exports.getPropertiesByCity = async (req, res, next) => {
  try {
    const city = await City.findOne({ name: req.params.name });
    if (!city) return res.status(404).json({ message: 'City not found', requestId: req.id });
    const properties = await Property.find({ city: city._id, status: 'active' });
    res.json(properties);
  } catch (err) { next(err); }
};

// Get properties under price in city
exports.getPropertiesUnderPrice = async (req, res, next) => {
  try {
    const city = await City.findOne({ name: req.params.name });
    if (!city) return res.status(404).json({ message: 'City not found', requestId: req.id });
    const properties = await Property.find({ city: city._id, 'pricing.basePrice': { $lte: Number(req.params.price) }, status: 'active' });
    res.json(properties);
  } catch (err) { next(err); }
};
