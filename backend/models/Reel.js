
const mongoose = require('mongoose');

const ReelSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2200
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  audioName: {
    type: String,
    trim: true
  },
  audioAuthor: {
    type: String,
    trim: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Reel', ReelSchema);
