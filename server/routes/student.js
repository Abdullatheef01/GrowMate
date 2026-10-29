const router = require('express').Router();
const User = require('../models/User');
const { ExamTable, ExamScore, SemesterTable, SemesterResult, Counselling } = require('../models/Tables');
const { protect, allow } = require('../middleware/auth');
const { pick } = require('../utils/helpers');

router.use(protect, allow('student'));

// ---------- Profile ----------
router.put('/profile', async (req, res) => {
  const me = await User.findById(req.user._id);
  const b = req.body;
  // email is locked -> ignored
  if (b.name) me.name = b.name;
  me.phone = b.phone ?? me.phone;
  me.department = b.department ?? me.department;

  // register number: editable only once, and must be unique
  if (b.registerNumber !== undefined) {
    const reg = String(b.registerNumber).trim().toUpperCase();
    if (reg && reg !== (me.registerNumber || '')) {
      if (me.registerNumberEdited) return res.status(400).json({ message: 'Register number can be changed only once and is now locked' });
      if (await User.exists({ registerNumber: reg, _id: { $ne: me._id } }))
        return res.status(400).json({ message: 'This register number is already used by another student' });
      me.registerNumber = reg;
      me.registerNumberEdited = true;
    }
  }
  if (b.profile) Object.assign(me.profile, pick(b.profile, [
    'section', 'batch', 'yearOfAdmission', 'dob', 'gender', 'religion', 'community', 'nationality',
    'bloodGroup', 'address', 'fatherName', 'motherName', 'parentNumber', 'admissionType', 'scholarship'
  ])); 
  
  // Aadhar: the full number is never stored, only the last 4 digits
  if (b.profile && b.profile.aadhar !== undefined) {
    const raw = String(b.profile.aadhar).trim();
    const digits = raw.replace(/\D/g, '');
    if (raw === '') me.profile.aadhar = '';
    else if (/^XXXX XXXX \d{4}$/.test(raw)) { /* already masked, keep as it is */ }
    else if (digits.length === 12) me.profile.aadhar = `XXXX XXXX ${digits.slice(-4)}`;
    else return res.status(400).json({ message: 'Aadhar number must have 12 digits' });
  }



  if (Array.isArray(b.previousAcademics))
    me.previousAcademics = b.previousAcademics.map(a => pick(a, ['level', 'institution', 'yearOfPassing', 'score']));
  await me.save();
  const out = me.toObject(); delete out.password;
  res.json(out);
});

// ---------- Counselling ----------
router.get('/counselling', async (req, res) => {
  res.json(await Counselling.find({ student: req.user._id }).populate('mentor', 'name deleted').sort('-createdAt'));
});
router.patch('/counselling/:id/accept', async (req, res) => {
  const c = await Counselling.findOne({ _id: req.params.id, student: req.user._id });
  if (!c) return res.status(404).json({ message: 'Not found' });
  c.status = 'accepted'; c.acceptedAt = new Date();
  await c.save();
  res.json(c);
});

// ---------- CIAT / Model exam ----------
// Current mentor's published tables, plus old tables the student already has scores in (view only)
// Current mentor's published tables, plus old tables the student already has scores in (view only)
router.get('/exam-tables', async (req, res) => {
  const mine = await ExamScore.find({ student: req.user._id }).select('table');
  const or = [{ _id: { $in: mine.map((m) => m.table) } }];
  if (req.user.mentor) or.push({ mentor: req.user.mentor, published: true });
  const tables = await ExamTable.find({ $or: or }).sort('createdAt');
  const docs = await ExamScore.find({ student: req.user._id, table: { $in: tables.map((t) => t._id) } });
  const current = String(req.user.mentor || '');
  res.json(tables.map((t) => {
    const d = docs.find((x) => String(x.table) === String(t._id));
    return {
      table: t,
      editable: !!current && String(t.mentor) === current && t.published,
      saved: !!d,
      editAllowed: !!d?.editAllowed,
      scores: d?.scores || []
    };
  }));
});

router.put('/exam-tables/:id/scores', async (req, res) => {
  const t = await ExamTable.findOne({ _id: req.params.id, mentor: req.user.mentor, published: true });
  if (!t) return res.status(404).json({ message: 'Table not available' });
  const existing = await ExamScore.findOne({ table: t._id, student: req.user._id });
  if (existing && !existing.editAllowed)
    return res.status(403).json({ message: 'Editing is locked. Ask your mentor to allow editing.' });

  const rowIds = t.rows.map((r) => String(r._id));
  let invalid = false;
  // marks: a number from 0 to 100, AB (absent) or U (fail)
  const clean = (v) => {
    const s = String(v ?? '').trim().toUpperCase();
    if (s === '') return '';
    if (s === 'AB' || s === 'U') return s;
    const n = Number(s);
    if (Number.isNaN(n) || n < 0 || n > 100) { invalid = true; return ''; }
    return String(n);
  };
  const scores = (req.body.scores || []).filter((s) => rowIds.includes(String(s.row)))
    .map((s) => ({ row: s.row, ciat1: clean(s.ciat1), ciat2: clean(s.ciat2), model: clean(s.model) }));
  if (invalid) return res.status(400).json({ message: 'Marks must be 0 to 100, AB (absent) or U (fail)' });

  // saving locks it again until the mentor/admin allows editing
  const doc = await ExamScore.findOneAndUpdate({ table: t._id, student: req.user._id },
    { scores, editAllowed: false }, { upsert: true, new: true });
  res.json(doc);
});

router.get('/semester-tables', async (req, res) => {
  const mine = await SemesterResult.find({ student: req.user._id }).select('table');
  const or = [{ _id: { $in: mine.map((m) => m.table) } }];
  if (req.user.mentor) or.push({ mentor: req.user.mentor, published: true });
  const tables = await SemesterTable.find({ $or: or }).sort('createdAt');
  const results = await SemesterResult.find({ student: req.user._id, table: { $in: tables.map((t) => t._id) } });
  const current = String(req.user.mentor || '');
  res.json(tables.map((t) => {
    const d = results.find((r) => String(r.table) === String(t._id));
    return {
      table: t,
      editable: !!current && String(t.mentor) === current && t.published,
      saved: !!d,
      editAllowed: !!d?.editAllowed,
      result: d || null
    };
  }));
});

router.put('/semester-tables/:id/result', async (req, res) => {
  const t = await SemesterTable.findOne({ _id: req.params.id, mentor: req.user.mentor, published: true });
  if (!t) return res.status(404).json({ message: 'Table not available' });
  const existing = await SemesterResult.findOne({ table: t._id, student: req.user._id });
  if (existing && !existing.editAllowed)
    return res.status(403).json({ message: 'Editing is locked. Ask your mentor to allow editing.' });

  const rowIds = t.rows.map((r) => String(r._id));
  const grades = (req.body.grades || []).filter((g) => rowIds.includes(String(g.row)))
    .map((g) => ({ row: g.row, grade: String(g.grade || '').toUpperCase() }));
  if (grades.some((g) => g.grade && !/^[A-Z+]{1,2}$/.test(g.grade)))
    return res.status(400).json({ message: 'Grade can have only 1-2 letters, like O, A+, B, AB (absent) or U (fail)' });
  const arrears = Math.min(50, Math.max(0, parseInt(req.body.arrears || 0, 10) || 0));
  const cg = String(req.body.cgpa ?? '').trim();
  if (cg && (Number.isNaN(Number(cg)) || Number(cg) < 0 || Number(cg) > 10))
    return res.status(400).json({ message: 'CGPA must be between 0 and 10' });

  const doc = await SemesterResult.findOneAndUpdate({ table: t._id, student: req.user._id },
    { grades, arrears, cgpa: cg, editAllowed: false }, { upsert: true, new: true });
  res.json(doc);
});


module.exports = router;
