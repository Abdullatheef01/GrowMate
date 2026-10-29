const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const academicSchema = new mongoose.Schema({
  level: String,          // School / Degree
  institution: String,
  yearOfPassing: String,
  score: String           // percentage
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  emailVerified: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },   // mentors are soft-deleted, so their tables and counselling stay
  deletedAt: Date,
  formerEmail: String,
  otp: { hash: String, purpose: String, expires: Date, attempts: { type: Number, default: 0 }, lastSent: Date },

  photo: String,
  phone: String,
  department: String,

  // student only
  registerNumber: { type: String, trim: true },
  registerNumberEdited: { type: Boolean, default: false }, // can be changed only once
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pastMentors: [{
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: Date
  }],
  profile: {
    section: String, batch: String, yearOfAdmission: Number,
    dob: String, gender: String, religion: String, community: String,
    nationality: String, bloodGroup: String, address: String,
    aadhar: String, fatherName: String, motherName: String, parentNumber: String,
    admissionType: { type: String, enum: ['', 'Counselling', 'Management', '7.5', 'PMSS', 'SC/ST'], default: '' },
    scholarship: String
  },
  previousAcademics: [academicSchema]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password); };
userSchema.index(
  { registerNumber: 1 },
  { unique: true, partialFilterExpression: { registerNumber: { $type: 'string', $gt: '' } } }
);
userSchema.index({ role: 1, name: 1 });
userSchema.index({ mentor: 1 });
userSchema.index({ 'profile.yearOfAdmission': 1 });
module.exports = mongoose.model('User', userSchema);
