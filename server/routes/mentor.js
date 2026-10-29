const router = require('express').Router();
const User = require('../models/User');
const { ExamTable, ExamScore, SemesterTable, SemesterResult, Counselling } = require('../models/Tables');
const { protect, allow } = require('../middleware/auth');
const { pick, studentFull } = require('../utils/helpers');

router.use(protect, allow('mentor'));

// Profile (email locked)
router.put('/me', async (req, res) => {
  const u = await User.findByIdAndUpdate(req.user._id, pick(req.body, ['name', 'phone', 'department', 'photo']), { new: true }).select('-password');
  res.json(u);
});

// Assigned students
router.get('/students', async (req, res) => {
  res.json(await User.find({ mentor: req.user._id, role: 'student' }).select('name photo registerNumber').sort('name'));
});
router.get('/students/:id', async (req, res) => {
  const s = await User.findOne({ _id: req.params.id, mentor: req.user._id });
  if (!s) return res.status(403).json({ message: 'This student is not assigned to you' });
  res.json(await studentFull(s._id));
});

// Same CRUD for both table types
const tableRoutes = (path, Model) => {
  router.get(`/${path}`, async (req, res) => res.json(await Model.find({ mentor: req.user._id }).sort('-createdAt')));
  router.post(`/${path}`, async (req, res) => {
    if (!(await User.exists({ mentor: req.user._id, role: 'student' })))
      return res.status(400).json({ message: 'You can create tables only after the admin assigns students to you' });
    const { title, rows } = req.body;
    if (!title) return res.status(400).json({ message: 'Give the table a title' });
    res.status(201).json(await Model.create({ mentor: req.user._id, title, rows: (rows || []).map(r => pick(r, ['subject', 'subjectCode'])) }));
  });
  // Edit allowed even after publish. Existing row _ids are kept so student entries are not lost.
  router.put(`/${path}/:id`, async (req, res) => {
    const t = await Model.findOne({ _id: req.params.id, mentor: req.user._id });
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (req.body.title) t.title = req.body.title;
    if (Array.isArray(req.body.rows))
      t.rows = req.body.rows.map(r => ({ ...(r._id ? { _id: r._id } : {}), ...pick(r, ['subject', 'subjectCode']) }));
    await t.save(); res.json(t);
  });
  router.patch(`/${path}/:id/publish`, async (req, res) => {
    const t = await Model.findOneAndUpdate({ _id: req.params.id, mentor: req.user._id }, { published: req.body.published !== false }, { new: true });
    if (!t) return res.status(404).json({ message: 'Not found' });
    res.json(t);
  });
  router.delete(`/${path}/:id`, async (req, res) => {
    await Model.deleteOne({ _id: req.params.id, mentor: req.user._id });
    res.json({ message: 'Deleted' });
  });
};
tableRoutes('exam-tables', ExamTable);
tableRoutes('semester-tables', SemesterTable);
// ---- Edit access ----
const SCORE = { exam: ExamScore, semester: SemesterResult };

// Allow / lock editing for one student's saved entry
router.patch('/students/:sid/access/:kind/:id', async (req, res) => {
  const Score = SCORE[req.params.kind];
  if (!Score) return res.status(400).json({ message: 'Invalid type' });
  const s = await User.findOne({ _id: req.params.sid, mentor: req.user._id });
  if (!s) return res.status(403).json({ message: 'This student is not assigned to you' });
  const doc = await Score.findOne({ _id: req.params.id, student: s._id }).populate('table', 'mentor');
  if (!doc || String(doc.table?.mentor) !== String(req.user._id)) return res.status(404).json({ message: 'Not found' });
  doc.editAllowed = !!req.body.allowed;
  await doc.save();
  res.json({ editAllowed: doc.editAllowed });
});

// Allow every assigned student who has saved this table
const allowAll = (Table, Score) => async (req, res) => {
  const t = await Table.findOne({ _id: req.params.id, mentor: req.user._id });
  if (!t) return res.status(404).json({ message: 'Not found' });
  const ids = (await User.find({ mentor: req.user._id, role: 'student' }).select('_id')).map((u) => u._id);
  const r = await Score.updateMany({ table: t._id, student: { $in: ids } }, { editAllowed: true });
  res.json({ count: r.matchedCount });
};
router.patch('/exam-tables/:id/allow-all', allowAll(ExamTable, ExamScore));
router.patch('/semester-tables/:id/allow-all', allowAll(SemesterTable, SemesterResult));

// Counselling
router.get('/counselling', async (req, res) => {
  const q = { mentor: req.user._id };
  if (['pending', 'accepted'].includes(req.query.status)) q.status = req.query.status;
  res.json(await Counselling.find(q).populate('student', 'name photo').sort('-createdAt'));
});
router.post('/counselling', async (req, res) => {
  const { title, description, student } = req.body;
  if (!title || !description || !student) return res.status(400).json({ message: 'Title, description and student are required' });
  const s = await User.findOne({ _id: student, mentor: req.user._id });
  if (!s) return res.status(403).json({ message: 'This student is not assigned to you' });
  res.status(201).json(await Counselling.create({ mentor: req.user._id, student, title, description }));
});

module.exports = router;
