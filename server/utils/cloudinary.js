const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.destroyPhoto = async (userId) => {
  try { await cloudinary.uploader.destroy(`growmate/profiles/${userId}`, { invalidate: true }); }
  catch (e) { console.error('Cloudinary delete failed:', e.message); } // never block the delete because of this
};