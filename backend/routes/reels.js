const express = require('express');
const { body, validationResult } = require('express-validator');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');

const router = express.Router();

// Create a new reel
router.post(
  '/',
  protect,
  upload,
  [
    body('caption').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a video file' });
      }
      
      // Create reel
      const reel = new Reel({
        user: req.user._id,
        video: req.file.path,
        caption: req.body.caption,
        audioName: req.body.audioName,
        audioAuthor: req.body.audioAuthor
      });
      
      await reel.save();
      
      // Populate user info
      await reel.populate('user', '_id username profileImage');
      
      res.status(201).json(reel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get all reels for feed
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get reels with populated user data
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', '_id username profileImage');
      
    // Format reels with additional info
    const formattedReels = await Promise.all(
      reels.map(async (reel) => {
        const isLiked = reel.likes.includes(req.user._id);
        
        // Check if user saved this reel
        const user = await User.findById(req.user._id);
        const isSaved = user.savedPosts.includes(reel._id);
        
        return {
          id: reel._id,
          userId: reel.user._id,
          username: reel.user.username,
          userAvatar: reel.user.profileImage,
          videoUrl: reel.video,
          caption: reel.caption,
          likes: reel.likes.length,
          comments: reel.comments.length,
          timestamp: reel.createdAt,
          liked: isLiked,
          saved: isSaved,
          audioName: reel.audioName,
          audioAuthor: reel.audioAuthor,
          viewCount: reel.viewCount
        };
      })
    );
    
    res.json({
      reels: formattedReels,
      hasMore: reels.length === limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a reel
router.post('/like/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    // Check if already liked
    if (reel.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Reel already liked' });
    }
    
    // Add like
    reel.likes.push(req.user._id);
    await reel.save();
    
    // Create notification (if not user's own reel)
    if (reel.user.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: reel.user,
        sender: req.user._id,
        type: 'like',
        post: reel._id
      });
      
      await notification.save();
    }
    
    res.json({ message: 'Reel liked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike a reel
router.post('/unlike/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    // Check if liked
    if (!reel.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Reel not liked' });
    }
    
    // Remove like
    reel.likes = reel.likes.filter(
      like => like.toString() !== req.user._id.toString()
    );
    
    await reel.save();
    
    res.json({ message: 'Reel unliked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save a reel
router.post('/save/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if already saved
    if (user.savedPosts.includes(reel._id)) {
      return res.status(400).json({ error: 'Reel already saved' });
    }
    
    // Add to saved posts
    user.savedPosts.push(reel._id);
    await user.save();
    
    res.json({ message: 'Reel saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsave a reel
router.post('/unsave/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if saved
    if (!user.savedPosts.includes(reel._id)) {
      return res.status(400).json({ error: 'Reel not saved' });
    }
    
    // Remove from saved posts
    user.savedPosts = user.savedPosts.filter(
      post => post.toString() !== reel._id.toString()
    );
    
    await user.save();
    
    res.json({ message: 'Reel unsaved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reels by user ID
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const reels = await Reel.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', '_id username profileImage');
      
    // Format reels with additional info
    const formattedReels = await Promise.all(
      reels.map(async (reel) => {
        const isLiked = reel.likes.includes(req.user._id);
        
        // Check if user saved this reel
        const user = await User.findById(req.user._id);
        const isSaved = user.savedPosts.includes(reel._id);
        
        return {
          id: reel._id,
          userId: reel.user._id,
          username: reel.user.username,
          userAvatar: reel.user.profileImage,
          videoUrl: reel.video,
          caption: reel.caption,
          likes: reel.likes.length,
          comments: reel.comments.length,
          timestamp: reel.createdAt,
          liked: isLiked,
          saved: isSaved,
          audioName: reel.audioName,
          audioAuthor: reel.audioAuthor,
          viewCount: reel.viewCount
        };
      })
    );
    
    res.json(formattedReels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a reel
router.delete('/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    // Check ownership
    if (reel.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized to delete this reel' });
    }
    
    // Remove from users who saved
    await User.updateMany(
      { savedPosts: reel._id },
      { $pull: { savedPosts: reel._id } }
    );
    
    // Delete notifications related to this reel
    await Notification.deleteMany({ post: reel._id });
    
    // Delete reel
    await reel.remove();
    
    res.json({ message: 'Reel deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Increment view count
router.post('/view/:id', protect, async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    res.json({ viewCount: reel.viewCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
