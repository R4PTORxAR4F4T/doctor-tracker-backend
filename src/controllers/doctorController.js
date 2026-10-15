const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, getSort, dateRangeFilter, paginate, pageMeta } = require('../utils/query');
const { queryPatients } = require('../services/patientService');

const buildFilter = (q) => {
  const filter = { ...dateRangeFilter(q) };
  if (q.specialization) filter.specialization = q.specialization;
  if (q.hospital) filter.hospital = q.hospital;
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: re }, { specialization: re }, { hospital: re }, { email: re }, { phone: re }];
  }
  return filter;
};

// One grouped query (served by the { doctor, createdAt } index) instead of N count queries.
const withPatientCounts = async (doctors) => {
  if (!doctors.length) return doctors;
  const counts = await Patient.aggregate([
    { $match: { doctor: { $in: doctors.map((d) => d._id) } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  const byDoctor = new Map(counts.map((c) => [String(c._id), c.count]));
  return doctors.map((d) => ({ ...d, patientCount: byDoctor.get(String(d._id)) || 0 }));
};

const findDoctorOrThrow = async (id) => {
  const doctor = await Doctor.findById(id).lean();
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  return doctor;
};

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q);
  const { skip, limit } = paginate(q.page, q.limit);

  const [doctors, total] = await Promise.all([
    Doctor.find(filter).sort(getSort(q.sort)).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  res.json({ success: true, data: await withPatientCounts(doctors), meta: pageMeta(total, q.page, limit) });
});

// Distinct values used to populate filter dropdowns.
exports.meta = asyncHandler(async (req, res) => {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct('specialization'),
    Doctor.distinct('hospital'),
  ]);
  const sort = (arr) => arr.sort((a, b) => a.localeCompare(b));
  res.json({ success: true, specializations: sort(specializations), hospitals: sort(hospitals) });
});

// Lightweight id + name list for <select> inputs.
exports.options = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find().select('name specialization').sort({ name: 1 }).limit(500).lean();
  res.json({ success: true, data: doctors });
});

exports.getOne = asyncHandler(async (req, res) => {
  const doctor = await findDoctorOrThrow(req.params.id);
  const [withCount] = await withPatientCounts([doctor]);
  res.json({ success: true, data: withCount });
});

exports.create = asyncHandler(async (req, res) => {
  const doctor = await Doctor.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: doctor });
});

exports.update = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  res.json({ success: true, data: doctor });
});

// Deleting a doctor also removes their patients so no orphans are left behind.
exports.remove = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  const { deletedCount } = await Patient.deleteMany({ doctor: doctor._id });
  res.json({ success: true, message: 'Doctor deleted', deletedPatients: deletedCount });
});

// ---------- Patients nested under a doctor ----------
exports.listPatients = asyncHandler(async (req, res) => {
  await findDoctorOrThrow(req.params.id);
  const result = await queryPatients(req.query, req.params.id);
  res.json({ success: true, ...result });
});

exports.addPatient = asyncHandler(async (req, res) => {
  await findDoctorOrThrow(req.params.id);
  const patient = await Patient.create({ ...req.body, doctor: req.params.id });
  res.status(201).json({ success: true, data: patient });
});

exports.removePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndDelete({ _id: req.params.patientId, doctor: req.params.id });
  if (!patient) throw new ApiError(404, 'Patient not found for this doctor');
  res.json({ success: true, message: 'Patient removed' });
});
