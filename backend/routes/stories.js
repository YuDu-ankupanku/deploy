const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Make sure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
const storiesUploadsDir = path.join(uploadsDir, 'stories');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory at:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(storiesUploadsDir)) {
  console.log('Creating stories uploads directory at:', storiesUploadsDir);
  fs.mkdirSync(storiesUploadsDir, { recursive: true });
}

// Get stories for feed
router.get('/feed', protect, async (req, res) => {
  try {
    console.log('[API] Getting stories feed for user', req.user._id);
    
    // FIX: Get all active stories instead of just from followed users
    // This ensures users can see all stories in the platform
    const storiesResults = await User.aggregate([
      {
        $lookup: {
          from: 'stories',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                expiresAt: { $gt: new Date() }
              }
            },
            { $sort: { createdAt: -1 } }
          ],
          as: 'stories'
        }
      },
      {
        $match: { 'stories.0': { $exists: true } }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          profileImage: 1,
          isVerified: 1,
          stories: 1
        }
      }
    ]);
    
    // For each story, check if current user has viewed it
    const storiesWithViewStatus = await Promise.all(
      storiesResults.map(async (userStories) => {
        const storiesWithStatus = await Promise.all(
          userStories.stories.map(async (story) => {
            // Check if current user has viewed this story
            const hasViewed = story.viewers && story.viewers.some(
              viewer => viewer.toString() === req.user._id.toString()
            );
            
            return {
              ...story,
              hasViewed
            };
          })
        );
        
        return {
          ...userStories,
          stories: storiesWithStatus
        };
      })
    );
    
    res.json(storiesWithViewStatus);
  } catch (error) {
    console.error('[API] Error getting stories feed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a story
router.post(
  '/',
  protect,
  upload,
  [
    body('caption').optional().trim().isLength({ max: 2200 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      console.log('[API] Creating story with file:', req.file);
      
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload media' });
      }
      
      const { caption } = req.body;
      console.log('[API] Story caption:', caption);
      
      // Set expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Create story
      const story = new Story({
        user: req.user._id,
        media: req.file.path.replace(/\\/g, '/'),
        caption,
        expiresAt
      });
      
      await story.save();
      console.log('[API] Story created successfully:', story._id);
      
      // Populate user info
      await story.populate('user', '_id username profileImage isVerified');
      
      res.status(201).json(story);
    } catch (error) {
      console.error('[API] Error creating story:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// View a story - Mark story as viewed by current user
router.post('/:id/view', protect, async (req, res) => {
  try {
    console.log(`[API] Marking story ${req.params.id} as viewed by user ${req.user._id}`);
    
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Check if user has already viewed this story
    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }
    
    res.json({ message: 'Story marked as viewed' });
  } catch (error) {
    console.error('[API] Error marking story as viewed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a story
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Check ownership
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized to delete this story' });
    }
    
    // Delete story - Using deleteOne instead of deprecated remove()
    await Story.deleteOne({ _id: story._id });
    
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
