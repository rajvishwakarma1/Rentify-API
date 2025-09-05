function paginationMeta({ page, limit, total }) {
  const pages = Math.ceil((total || 0) / (limit || 1)) || 1;
  return { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 };
}

function successResponse(res, data, pageInfo, status = 200) {
  const body = { success: true, data };
  if (pageInfo && typeof pageInfo.total === 'number') body.meta = paginationMeta(pageInfo);
  return res.status(status).json(body);
}

function errorResponse(res, status, message, details) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

function formatProperty(doc) {
  if (!doc) return doc;
  const { _id, title, type, status, address, city, pricing, capacity, rating, images, createdAt, updatedAt } = doc;
  return {
    id: _id,
    title,
    type,
    status,
    address,
    city: city && { id: city._id, name: city.name, country: city.country, state: city.state },
    pricing,
    capacity,
    rating,
    images,
    createdAt,
    updatedAt,
  };
}

module.exports = { successResponse, errorResponse, paginationMeta, formatProperty };
