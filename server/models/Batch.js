const mongoose = require('mongoose');
module.exports = mongoose.model('Batch', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // optional: batch stays even if mentor is removed
}, { timestamps: true }));
