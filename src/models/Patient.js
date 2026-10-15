const mongoose = require('mongoose');
const { GENDERS, PATIENT_STATUSES } = require('../constants');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    age: { type: Number, required: true, min: 0, max: 150 },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    condition: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: PATIENT_STATUSES, default: 'active' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true }
);

patientSchema.index({ doctor: 1, createdAt: -1, _id: -1 }); // doctor detail page + patients-per-doctor
patientSchema.index({ createdAt: -1, _id: -1 }); // global list + date statistics
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ status: 1, createdAt: -1 });
patientSchema.index({ name: 1, _id: 1 });

module.exports = mongoose.model('Patient', patientSchema);
