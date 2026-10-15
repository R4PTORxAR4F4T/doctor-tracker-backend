const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');

const DAY_MS = 86400000;

const groupCount = (field, limit) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
  { $project: { _id: 0, label: '$_id', count: 1 } },
];

const perDay = (since) => [
  { $match: { createdAt: { $gte: since } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
];

// Mongo only returns days that have data; fill the gaps so charts have a continuous axis.
const toSeries = (days, since, patientRows, doctorRows) => {
  const patients = new Map(patientRows.map((r) => [r._id, r.count]));
  const doctors = new Map(doctorRows.map((r) => [r._id, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, patients: patients.get(date) || 0, doctors: doctors.get(date) || 0 };
  });
};

exports.getStats = asyncHandler(async (req, res) => {
  const { days } = req.query;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (days - 1) * DAY_MS);
  const previousSince = new Date(since.getTime() - days * DAY_MS);

  const [
    totalDoctors,
    totalPatients,
    newPatients,
    previousNewPatients,
    newDoctors,
    patientsPerDoctor,
    patientsByDay,
    doctorsByDay,
    conditions,
    statuses,
    genders,
    specializations,
    recentPatients,
  ] = await Promise.all([
    Doctor.estimatedDocumentCount(),
    Patient.estimatedDocumentCount(),
    Patient.countDocuments({ createdAt: { $gte: since } }),
    Patient.countDocuments({ createdAt: { $gte: previousSince, $lt: since } }),
    Doctor.countDocuments({ createdAt: { $gte: since } }),
    Patient.aggregate([
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 10 },
      { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      {
        $project: {
          _id: 0,
          doctorId: '$_id',
          name: '$doctor.name',
          specialization: '$doctor.specialization',
          count: 1,
        },
      },
    ]),
    Patient.aggregate(perDay(since)),
    Doctor.aggregate(perDay(since)),
    Patient.aggregate(groupCount('condition', 8)),
    Patient.aggregate(groupCount('status')),
    Patient.aggregate(groupCount('gender')),
    Doctor.aggregate(groupCount('specialization', 8)),
    Patient.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .populate('doctor', 'name')
      .select('name condition status createdAt doctor')
      .lean(),
  ]);

  const trend = previousNewPatients
    ? Math.round(((newPatients - previousNewPatients) / previousNewPatients) * 100)
    : null;

  res.json({
    success: true,
    data: {
      range: { days, since },
      totals: {
        doctors: totalDoctors,
        patients: totalPatients,
        avgPatientsPerDoctor: totalDoctors ? Number((totalPatients / totalDoctors).toFixed(1)) : 0,
        newPatients,
        newDoctors,
        newPatientsTrend: trend,
      },
      patientsPerDoctor,
      registrations: toSeries(days, since, patientsByDay, doctorsByDay),
      conditions,
      statuses,
      genders,
      specializations,
      recentPatients,
    },
  });
});
