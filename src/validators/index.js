const { z } = require('zod');
const { GENDERS, PATIENT_STATUSES, SORT_KEYS } = require('../constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const phone = z
  .string()
  .trim()
  .regex(/^[+()\d\s-]{7,20}$/, 'Enter a valid phone number');
const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format');
const shortText = (label, min = 2, max = 100) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const atLeastOneField = (obj) => Object.keys(obj).length > 0;

// ---------- Auth ----------
const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});

// ---------- Doctors ----------
const doctorBody = z.object({
  name: shortText('Name'),
  specialization: shortText('Specialization'),
  hospital: shortText('Hospital', 2, 150),
  phone,
  email,
});

const doctorUpdateBody = doctorBody.partial().refine(atLeastOneField, 'No fields provided');

// ---------- Patients ----------
const patientBody = z.object({
  name: shortText('Name'),
  age: z.coerce.number({ invalid_type_error: 'Age must be a number' }).int().min(0).max(150),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Select a gender' }) }),
  phone,
  // Optional: empty string is allowed, otherwise it must be a valid email.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address')
    .optional(),
  condition: shortText('Condition'),
  status: z.enum(PATIENT_STATUSES).default('active'),
  notes: z.string().trim().max(1000).optional(),
  doctor: objectId,
});

const doctorScopedPatientBody = patientBody.omit({ doctor: true });
const patientUpdateBody = patientBody.partial().refine(atLeastOneField, 'No fields provided');

// ---------- Query strings ----------
const listBase = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(SORT_KEYS).default('newest'),
});

const doctorListQuery = listBase.extend({
  specialization: z.string().trim().max(100).optional(),
  hospital: z.string().trim().max(150).optional(),
});

const patientListQuery = listBase.extend({
  condition: z.string().trim().max(100).optional(),
  status: z.enum(PATIENT_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  doctor: objectId.optional(),
});

const doctorPatientsQuery = patientListQuery.omit({ doctor: true });

const dashboardQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

module.exports = {
  loginBody,
  doctorBody,
  doctorUpdateBody,
  patientBody,
  doctorScopedPatientBody,
  patientUpdateBody,
  doctorListQuery,
  patientListQuery,
  doctorPatientsQuery,
  dashboardQuery,
};
