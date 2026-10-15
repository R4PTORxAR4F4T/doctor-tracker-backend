// Usage: npm run seed
// WARNING: wipes the doctors and patients collections, then inserts demo data.
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');

const DAY_MS = 86400000;
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const daysAgo = (d) => new Date(Date.now() - d * DAY_MS - rand(DAY_MS));

const DOCTORS = [
  ['Dr. Ayesha Rahman', 'Cardiology', 'Square Hospital'],
  ['Dr. Tanvir Hasan', 'Cardiology', 'United Hospital'],
  ['Dr. Nusrat Jahan', 'Neurology', 'Evercare Hospital'],
  ['Dr. Imran Chowdhury', 'Orthopedics', 'Labaid Hospital'],
  ['Dr. Farzana Akter', 'Pediatrics', 'Dhaka Medical College Hospital'],
  ['Dr. Rafiq Ahmed', 'Dermatology', 'Popular Medical Centre'],
  ['Dr. Sabrina Karim', 'Gynecology', 'Square Hospital'],
  ['Dr. Mahbub Alam', 'Oncology', 'National Cancer Institute'],
  ['Dr. Shirin Sultana', 'Endocrinology', 'BIRDEM General Hospital'],
  ['Dr. Kamal Hossain', 'Gastroenterology', 'Evercare Hospital'],
  ['Dr. Lamia Islam', 'Psychiatry', 'United Hospital'],
  ['Dr. Arif Mahmud', 'Pulmonology', 'Chattogram Medical College Hospital'],
  ['Dr. Mehnaz Haque', 'Ophthalmology', 'Labaid Hospital'],
  ['Dr. Sohel Rana', 'Urology', 'Popular Medical Centre'],
];

const CONDITIONS = {
  Cardiology: ['Hypertension', 'Arrhythmia', 'Heart Failure'],
  Neurology: ['Migraine', 'Epilepsy', 'Stroke Recovery'],
  Orthopedics: ['Fracture', 'Arthritis', 'Back Pain'],
  Pediatrics: ['Asthma', 'Fever', 'Allergy'],
  Dermatology: ['Eczema', 'Acne', 'Psoriasis'],
  Gynecology: ['Pregnancy Care', 'PCOS', 'Anemia'],
  Oncology: ['Breast Cancer', 'Lymphoma', 'Chemotherapy Follow-up'],
  Endocrinology: ['Type 2 Diabetes', 'Thyroid Disorder', 'Obesity'],
  Gastroenterology: ['Gastritis', 'IBS', 'Hepatitis'],
  Psychiatry: ['Anxiety', 'Depression', 'Insomnia'],
  Pulmonology: ['COPD', 'Pneumonia', 'Asthma'],
  Ophthalmology: ['Cataract', 'Glaucoma', 'Dry Eye'],
  Urology: ['Kidney Stones', 'UTI', 'Prostatitis'],
};

const FIRST = ['Rahim', 'Karim', 'Sumaiya', 'Nadia', 'Jahid', 'Mim', 'Sakib', 'Tania', 'Rony', 'Mitu', 'Fahim', 'Rima', 'Shuvo', 'Anika', 'Noman', 'Sadia', 'Tareq', 'Lubna', 'Arman', 'Puja'];
const LAST = ['Khan', 'Uddin', 'Begum', 'Das', 'Mia', 'Sarker', 'Roy', 'Ali', 'Haque', 'Paul', 'Bhuiyan', 'Talukder'];
const STATUSES = ['active', 'active', 'active', 'follow_up', 'follow_up', 'discharged'];
const GENDERS = ['male', 'female', 'female', 'male', 'other'];

const phone = () => `+8801${pick(['3', '5', '6', '7', '8', '9'])}${String(rand(100000000)).padStart(8, '0')}`;
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

async function seed() {
  await connectDB(env.mongoUri);

  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);
  await Promise.all([Doctor.syncIndexes(), Patient.syncIndexes()]);

  const doctors = DOCTORS.map(([name, specialization, hospital]) => {
    const createdAt = daysAgo(20 + rand(70));
    return {
      _id: new mongoose.Types.ObjectId(),
      name,
      specialization,
      hospital,
      phone: phone(),
      email: `${slug(name.replace('Dr. ', ''))}@carehospital.test`,
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
  });
  await Doctor.collection.insertMany(doctors);

  // Doctors earlier in the list are busier, which makes the "patients per doctor" chart interesting.
  const weighted = doctors.flatMap((d, i) => Array(Math.max(1, doctors.length - i)).fill(d));

  const patients = Array.from({ length: 160 }, (_, i) => {
    const doctor = pick(weighted);
    // Skew registrations towards recent days so the time-series chart has a visible trend.
    const createdAt = daysAgo(Math.floor(Math.pow(Math.random(), 1.6) * 75));
    const first = pick(FIRST);
    const last = pick(LAST);
    return {
      _id: new mongoose.Types.ObjectId(),
      name: `${first} ${last}`,
      age: 3 + rand(85),
      gender: pick(GENDERS),
      phone: phone(),
      email: `${first}.${last}${i}@mail.test`.toLowerCase(),
      condition: pick(CONDITIONS[doctor.specialization]),
      status: pick(STATUSES),
      notes: '',
      doctor: doctor._id,
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
  });
  await Patient.collection.insertMany(patients);

  const email = (env.adminEmail || 'admin@doctortracker.com').toLowerCase();
  if (!(await User.exists({ email }))) {
    await User.create({
      name: env.adminName,
      email,
      password: env.adminPassword || 'Admin@12345',
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  }

  console.log(`Seeded ${doctors.length} doctors and ${patients.length} patients`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
