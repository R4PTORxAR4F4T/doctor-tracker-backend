const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { queryPatients } = require('../services/patientService');

const assertDoctorExists = async (id) => {
  if (!(await Doctor.exists({ _id: id }))) throw new ApiError(404, 'Doctor not found');
};

exports.list = asyncHandler(async (req, res) => {
  const result = await queryPatients(req.query);
  res.json({ success: true, ...result });
});

// Distinct conditions used to populate the filter dropdown.
exports.meta = asyncHandler(async (req, res) => {
  const conditions = await Patient.distinct('condition');
  res.json({ success: true, conditions: conditions.sort((a, b) => a.localeCompare(b)) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('doctor', 'name specialization hospital')
    .lean();
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient });
});

exports.create = asyncHandler(async (req, res) => {
  await assertDoctorExists(req.body.doctor);
  const patient = await Patient.create(req.body);
  res.status(201).json({ success: true, data: patient });
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.doctor) await assertDoctorExists(req.body.doctor);
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, data: patient });
});

exports.remove = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, message: 'Patient deleted' });
});
