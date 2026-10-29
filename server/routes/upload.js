const router = require('express').Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Photo stays in memory, then goes straight to Cloudinary. Nothing is saved on the server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only PNG, JPG or WEBP images'))
});

const toCloudinary = (buffer, userId) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    {
      folder: 'growmate/profiles',
      public_id: String(userId),   // one photo per user: a new upload replaces the old one
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
    },
    (err, result) => (err ? reject(err) : resolve(result))
  ).end(buffer);
});

router.post('/photo', protect, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image received' });
  const result = await toCloudinary(req.file.buffer, req.user._id);
  await User.findByIdAndUpdate(req.user._id, { photo: result.secure_url });
  res.json({ photo: result.secure_url });
});

// Remove the profile photo: the user falls back to the letter avatar
router.delete('/photo', protect, async (req, res) => {
  const id = String(req.user._id);
  try {
    const r = await cloudinary.uploader.destroy(`growmate/profiles/${id}`, { invalidate: true });
    if (r.result === 'not found') await cloudinary.uploader.destroy(id, { invalidate: true });
  } catch (e) { console.error('Cloudinary delete failed', e.message); } // still clear it from our database
  await User.findByIdAndUpdate(req.user._id, { $unset: { photo: 1 } });
  res.json({ message: 'Photo removed' });
});

module.exports = router;