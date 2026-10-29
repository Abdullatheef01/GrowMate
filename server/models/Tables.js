const mongoose = require('mongoose');
const { Schema } = mongoose;

const rowSchema = new Schema({ subject: String, subjectCode: String });

// ---- CIAT / Model exam ----
const ExamTable = mongoose.model('ExamTable', new Schema({
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },     // e.g. "Semester 3"
  rows: [rowSchema],
  published: { type: Boolean, default: false }
}, { timestamps: true }));

const ExamScore = mongoose.model('ExamScore', new Schema({
  table: { type: Schema.Types.ObjectId, ref: 'ExamTable', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scores: [{ row: Schema.Types.ObjectId, ciat1: String, ciat2: String, model: String }],
  editAllowed: { type: Boolean, default: false },  // student can edit again only when mentor/admin allows
}, { timestamps: true }));

// ---- Semester result ----
const SemesterTable = mongoose.model('SemesterTable', new Schema({
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  rows: [rowSchema],
  published: { type: Boolean, default: false }
}, { timestamps: true }));

const SemesterResult = mongoose.model('SemesterResult', new Schema({
  table: { type: Schema.Types.ObjectId, ref: 'SemesterTable', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  grades: [{ row: Schema.Types.ObjectId, grade: String }],
  arrears: { type: Number, default: 0 },
  cgpa: String,
  editAllowed: { type: Boolean, default: false },
}, { timestamps: true }));

// ---- Counselling ----
const Counselling = mongoose.model('Counselling', new Schema({
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  acceptedAt: Date
}, { timestamps: true })); // createdAt = auto date/time, mentor cannot type it

module.exports = { ExamTable, ExamScore, SemesterTable, SemesterResult, Counselling };
