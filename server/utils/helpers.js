const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ExamScore, SemesterResult, Counselling } = require('../models/Tables');

exports.token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Assign (or unassign with null) a mentor. Old mentor goes into pastMentors.
exports.setMentor = async (studentId, mentorId) => {
  const s = await User.findById(studentId);
  if (!s || s.role !== 'student') return;
  const next = mentorId ? String(mentorId) : null;
  if (String(s.mentor || '') === String(next || '')) return;
  if (s.mentor) s.pastMentors.push({ mentor: s.mentor, to: new Date() });
  s.mentor = next;
  await s.save();
};

// Everything a mentor/admin sees in the student "View" popup
exports.studentFull = async (id) => {
  const student = await User.findById(id).select('-password -otp')
    .populate('mentor', 'name email').populate('pastMentors.mentor', 'name email deleted');
  if (!student) return null;
  const [exams, semesters, counselling] = await Promise.all([
    ExamScore.find({ student: id }).populate('table'),
    SemesterResult.find({ student: id }).populate('table'),
    Counselling.find({ student: id }).populate('mentor', 'name deleted').sort('-createdAt')
  ]);
  return { student, exams, semesters, counselling };
};

exports.pick = (obj, keys) =>
  keys.reduce((o, k) => (obj[k] !== undefined ? { ...o, [k]: obj[k] } : o), {});
