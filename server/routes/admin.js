const router = require('express').Router();
const User = require('../models/User');
const Batch = require('../models/Batch');
const { Counselling, ExamScore, SemesterResult } = require('../models/Tables');
const { destroyPhoto } = require('../utils/cloudinary');
const { protect, allow } = require('../middleware/auth');
const { setMentor, studentFull, pick } = require('../utils/helpers');
const { passwordProblem } = require('../utils/password');

router.use(protect, allow('admin'));

const live = { deleted: { $ne: true } };
const pageOpts = (q, def = 20, max = 50) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(q.limit, 10) || def));
  return { page, limit, skip: (page - 1) * limit };
};
const meta = (total, page, limit) => ({ total, page, pages: Math.max(1, Math.ceil(total / limit)) });
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
// students admitted in or before this year have finished 4 years (alumni from 1 July)
const maxAdmissionYear = () => { const d = new Date(); return d.getMonth() >= 6 ? d.getFullYear() - 4 : d.getFullYear() - 5; };
const findManaged = (id) => User.findOne({ _id: id, role: { $in: ['student', 'mentor'] }, ...live });

router.get('/stats', async (req, res) => {
  const [users, students, mentors, batches] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' }, ...live }), User.countDocuments({ role: 'student', ...live }),
    User.countDocuments({ role: 'mentor', ...live }), Batch.countDocuments()
  ]);
  res.json({ users, students, mentors, batches });
});

// ---- Users ----
router.get('/users', async (req, res) => {
  const { page, limit, skip } = pageOpts(req.query);
  const q = { role: { $ne: 'admin' }, ...live };
  if (['student', 'mentor'].includes(req.query.role)) q.role = req.query.role;
  if (req.query.search) { const r = rx(req.query.search); q.$or = [{ name: r }, { email: r }, { registerNumber: r }]; }
  const [items, total] = await Promise.all([
    User.find(q).select('name email role photo registerNumber department mentor disabled profile.yearOfAdmission')
      .populate('mentor', 'name').sort('name').skip(skip).limit(limit).lean(),
    User.countDocuments(q)
  ]);
  if (req.query.role === 'student' && items.length) {
    const bs = await Batch.find({ students: { $in: items.map((i) => i._id) } }).select('name students').lean();
    const map = {};
    bs.forEach((b) => b.students.forEach((s) => { map[String(s)] = { _id: b._id, name: b.name }; }));
    items.forEach((i) => { i.currentBatch = map[String(i._id)] || null; });
  }
  res.json({ items, ...meta(total, page, limit) });
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['student', 'mentor'].includes(role)) return res.status(400).json({ message: 'Role must be student or mentor' });
  const u = await User.findById(req.params.id);
  if (!u || u.role === 'admin' || u.deleted) return res.status(404).json({ message: 'User not found' });
  if (u.role === role) return res.json(u);
  if (u.role === 'mentor' && await User.exists({ mentor: u._id }))
    return res.status(400).json({ message: 'Move this mentor\'s students to another mentor first' });
  if (u.role === 'mentor' && await Batch.exists({ mentor: u._id }))
    return res.status(400).json({ message: 'This mentor is assigned to a batch. Change the batch mentor first' });
  if (role === 'mentor' && u.mentor) await setMentor(u._id, null);
  u.role = role; await u.save();
  res.json({ _id: u._id, role: u.role });
});

router.get('/users/:id/view', async (req, res) => {
  const u = await User.findById(req.params.id).select('-password -otp');
  if (!u || u.role === 'admin') return res.status(404).json({ message: 'User not found' });
  if (u.role === 'student') return res.json({ type: 'student', ...(await studentFull(u._id)) });
  const [pending, completed, studentCount] = await Promise.all([
    Counselling.countDocuments({ mentor: u._id, status: 'pending' }),
    Counselling.countDocuments({ mentor: u._id, status: 'accepted' }),
    User.countDocuments({ mentor: u._id })
  ]);
  res.json({ type: 'mentor', mentor: u, pending, completed, studentCount });
});

// ---- Edit (email, scores and grades are not editable here) ----
router.patch('/users/:id', async (req, res) => {
  const u = await findManaged(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  const b = req.body;
  if (b.name !== undefined) {
    if (!String(b.name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    u.name = String(b.name).trim();
  }
  if (b.phone !== undefined) u.phone = b.phone;
  if (b.department !== undefined) u.department = b.department;
  if (u.role === 'student') {
    if (b.registerNumber !== undefined) {
      const reg = String(b.registerNumber).trim().toUpperCase();
      if (reg !== (u.registerNumber || '')) {
        if (reg && await User.exists({ registerNumber: reg, _id: { $ne: u._id } }))
          return res.status(400).json({ message: 'This register number is already used by another student' });
        u.registerNumber = reg || undefined;
      }
    }
    if (b.profile) Object.assign(u.profile, pick(b.profile, ['section', 'batch', 'yearOfAdmission', 'address']));
  }
  await u.save();
  res.json({ _id: u._id, name: u.name });
});

// ---- Disable / enable ----
router.patch('/users/:id/disabled', async (req, res) => {
  const u = await findManaged(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  u.disabled = !!req.body.disabled;
  await u.save();
  res.json({ _id: u._id, disabled: u.disabled });
});

// ---- Reset password ----
router.post('/users/:id/reset-password', async (req, res) => {
  const u = await findManaged(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  const pwErr = passwordProblem(req.body.password, { name: u.name, email: u.email });
  if (pwErr) return res.status(400).json({ message: pwErr });
  u.password = req.body.password; u.otp = undefined;
  await u.save();
  res.json({ message: 'Password changed' });
});

// ---- Allow / lock a student's editing of saved scores ----
router.patch('/access/:kind/:id', async (req, res) => {
  const Score = { exam: ExamScore, semester: SemesterResult }[req.params.kind];
  if (!Score) return res.status(400).json({ message: 'Invalid type' });
  const doc = await Score.findByIdAndUpdate(req.params.id, { editAllowed: !!req.body.allowed }, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ editAllowed: doc.editAllowed });
});

// ---- Delete ----
// Student: removed for good, with scores, grades and counselling.
// Mentor: soft delete. Tables, scores and counselling stay; the mentor's name becomes "(removed)".
router.delete('/users/:id', async (req, res) => {
  const u = await findManaged(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  if (String(req.body?.confirmName || '').trim().toLowerCase() !== u.name.trim().toLowerCase())
    return res.status(400).json({ message: 'Type the exact name to confirm' });

  if (u.role === 'mentor') {
    const students = await User.find({ mentor: u._id }).select('_id');
    for (const s of students) await setMentor(s._id, null);          // mentor goes into each student's past mentors
    await Batch.updateMany({ mentor: u._id }, { mentor: null });     // batches stay, without a mentor
    await destroyPhoto(u._id);
    u.formerEmail = u.email;
    u.email = `deleted-${u._id}@removed.invalid`;                    // frees the real email
    u.deleted = true; u.disabled = true; u.deletedAt = new Date(); u.photo = undefined;
    await u.save();
    return res.json({ message: 'Mentor removed', studentsUnassigned: students.length });
  }

  await Promise.all([
    ExamScore.deleteMany({ student: u._id }),
    SemesterResult.deleteMany({ student: u._id }),
    Counselling.deleteMany({ student: u._id }),
    Batch.updateMany({ students: u._id }, { $pull: { students: u._id } })
  ]);
  await destroyPhoto(u._id);
  await u.deleteOne();
  res.json({ message: 'Student deleted' });
});

// ---- Batches ----
const syncBatch = async (batch, oldStudents = [], oldMentor = null) => {
  const ids = batch.students.map(String);
  await Batch.updateMany({ _id: { $ne: batch._id } }, { $pull: { students: { $in: ids } } });
  for (const id of ids) await setMentor(id, batch.mentor || null);
  for (const id of oldStudents.map(String).filter((x) => !ids.includes(x))) {
    const s = await User.findById(id);
    if (s && oldMentor && String(s.mentor) === String(oldMentor)) await setMentor(id, null);
  }
};

router.get('/batches', async (req, res) => {
  const { page, limit, skip } = pageOpts(req.query, 10, 30);
  const q = {};
  if (req.query.search) {
    const r = rx(req.query.search);
    const ids = (await User.find({ role: { $ne: 'admin' }, ...live, name: r }).select('_id').lean()).map((u) => u._id);
    q.$or = [{ name: r }, { mentor: { $in: ids } }, { students: { $in: ids } }];
  }
  const [items, total] = await Promise.all([
    Batch.find(q).populate('mentor', 'name photo').populate('students', 'name photo registerNumber')
      .sort('-createdAt').skip(skip).limit(limit),
    Batch.countDocuments(q)
  ]);
  res.json({ items, ...meta(total, page, limit) });
});
router.post('/batches', async (req, res) => {
  const { name, students = [], mentor } = req.body;
  if (!name) return res.status(400).json({ message: 'Batch name is required' });
  if (mentor && !(await User.exists({ _id: mentor, role: 'mentor', ...live }))) return res.status(400).json({ message: 'Select a valid mentor' });
  const b = await Batch.create({ name, students, mentor: mentor || null });
  await syncBatch(b);
  res.status(201).json(b);
});
router.put('/batches/:id', async (req, res) => {
  const b = await Batch.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Batch not found' });
  const oldStudents = b.students, oldMentor = b.mentor;
  Object.assign(b, pick(req.body, ['name', 'students', 'mentor']));
  if (!b.mentor) b.mentor = null;
  await b.save();
  await syncBatch(b, oldStudents, oldMentor);
  res.json(b);
});
router.delete('/batches/:id', async (req, res) => {
  const b = await Batch.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Batch not found' });
  for (const id of b.students) {
    const s = await User.findById(id);
    if (s && b.mentor && String(s.mentor) === String(b.mentor)) await setMentor(id, null);
  }
  await b.deleteOne();
  res.json({ message: 'Deleted' });
});

// ---- Mentors ----
router.get('/mentors', async (req, res) => {
  const { page, limit, skip } = pageOpts(req.query);
  const [allIds, studentCounts, batchMentors] = await Promise.all([
    User.find({ role: 'mentor', ...live }).select('_id').lean(),
    User.aggregate([{ $match: { mentor: { $ne: null } } }, { $group: { _id: '$mentor', n: { $sum: 1 } } }]),
    Batch.distinct('mentor')
  ]);
  const countMap = Object.fromEntries(studentCounts.map((c) => [String(c._id), c.n]));
  const inBatch = new Set(batchMentors.filter(Boolean).map(String));
  const isAssigned = (id) => (countMap[String(id)] || 0) > 0 || inBatch.has(String(id));
  const assignedCount = allIds.filter((m) => isAssigned(m._id)).length;

  const q = { role: 'mentor', ...live };
  if (req.query.search) { const r = rx(req.query.search); q.$or = [{ name: r }, { department: r }, { email: r }]; }
  const [items, total] = await Promise.all([
    User.find(q).select('name email photo department phone disabled').sort('name').skip(skip).limit(limit).lean(),
    User.countDocuments(q)
  ]);
  items.forEach((m) => { m.studentCount = countMap[String(m._id)] || 0; m.assigned = isAssigned(m._id); });
  res.json({ items, assignedCount, unassignedCount: allIds.length - assignedCount, ...meta(total, page, limit) });
});

router.get('/mentor-options', async (req, res) => {
  res.json(await User.find({ role: 'mentor', disabled: { $ne: true }, ...live }).select('name').sort('name'));
});

// ---- Alumni: admission year + 4 reached (from 1 July) ----
router.get('/alumni', async (req, res) => {
  const rows = await User.aggregate([
    { $match: { role: 'student', deleted: { $ne: true }, 'profile.yearOfAdmission': { $lte: maxAdmissionYear() } } },
    { $group: { _id: '$profile.yearOfAdmission', count: { $sum: 1 } } },
    { $sort: { _id: -1 } }
  ]);
  res.json(rows.map((r) => ({ batch: `${r._id}-${r._id + 4}`, count: r.count })));
});

router.get('/alumni/:batch', async (req, res) => {
  const y = parseInt(req.params.batch, 10);
  if (!y || y > maxAdmissionYear()) return res.status(400).json({ message: 'Invalid batch' });
  const { page, limit, skip } = pageOpts(req.query);
  const q = { role: 'student', ...live, 'profile.yearOfAdmission': y };
  if (req.query.search) { const r = rx(req.query.search); q.$or = [{ name: r }, { registerNumber: r }]; }
  const [items, total] = await Promise.all([
    User.find(q).select('name photo registerNumber').sort('name').skip(skip).limit(limit),
    User.countDocuments(q)
  ]);
  res.json({ items, ...meta(total, page, limit) });
});

module.exports = router; 