const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `_id` is a tie-breaker so pagination order is stable when sort keys collide.
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
};

const getSort = (key) => SORTS[key] || SORTS.newest;

// from / to are YYYY-MM-DD strings (inclusive, UTC).
const dateRangeFilter = ({ from, to }) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return { createdAt: range };
};

const paginate = (page, limit) => ({ skip: (page - 1) * limit, limit });

const pageMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { escapeRegex, getSort, dateRangeFilter, paginate, pageMeta };
