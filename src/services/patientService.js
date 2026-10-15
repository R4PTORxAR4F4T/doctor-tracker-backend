const Patient = require('../models/Patient');
const { escapeRegex, getSort, dateRangeFilter, paginate, pageMeta } = require('../utils/query');

const buildPatientFilter = (q, fixedDoctorId) => {
  const filter = { ...dateRangeFilter(q) };

  if (fixedDoctorId) filter.doctor = fixedDoctorId;
  else if (q.doctor) filter.doctor = q.doctor;

  if (q.condition) filter.condition = q.condition;
  if (q.status) filter.status = q.status;
  if (q.gender) filter.gender = q.gender;

  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: re }, { condition: re }, { phone: re }, { email: re }];
  }

  return filter;
};

// Shared by GET /patients and GET /doctors/:id/patients.
async function queryPatients(q, fixedDoctorId) {
  const filter = buildPatientFilter(q, fixedDoctorId);
  const { skip, limit } = paginate(q.page, q.limit);

  const [data, total] = await Promise.all([
    Patient.find(filter)
      .sort(getSort(q.sort))
      .skip(skip)
      .limit(limit)
      .populate('doctor', 'name specialization hospital')
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return { data, meta: pageMeta(total, q.page, limit) };
}

module.exports = { queryPatients };
