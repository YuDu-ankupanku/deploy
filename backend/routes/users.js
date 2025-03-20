const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { profileUpload } = require('../utils/fileUpload');
const { sendFollowNotification } = require('../utils/socket');

const router = express.Router();

// Get all users
router.get('/all', protect, async (req, res) => {
  try {
    console.log('GET /api/users/all endpoint hit by user:', req.user._id);
    // Get all users except the current user
    const users = await User.find({
      _id: { $ne: req.user._id }
    })
      .select('_id username fullName profileImage isPrivate')
      .limit(20);
    
    console.log(`Returning ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user suggestions
router.get('/suggestions/list', protect, async (req, res) => {
  try {
    console.log('GET /api/users/suggestions/list endpoint hit by user:', req.user._id);
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.error('User not found for suggestions:', req.user._id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Current user following count:', user.following.length);
    
    // Get users not followed by current user, limit to 20
    const users = await User.find({
      _id: { $ne: req.user._id, $nin: user.following },
    })
      .select('_id username fullName profileImage isPrivate')
      .limit(20);
    
    console.log(`Returning ${users.length} user suggestions`);
    
    if (users.length === 0) {
      console.log('No filtered suggestions, fetching all users except current');
      const allUsers = await User.find({
        _id: { $ne: req.user._id },
      })
        .select('_id username fullName profileImage isPrivate')
        .limit(20);
      
      console.log(`Returning ${allUsers.length} total users instead`);
      return res.json(allUsers);
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users
router.get('/search/:query', protect, async (req, res) => {
  try {
    const { query } = req.params;
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('_id username fullName profileImage isPrivate')
      .limit(20);
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put(
  '/profile',
  protect,
  profileUpload,
  [
    body('fullName').optional().trim(),
    body('bio').optional().trim().isLength({ max: 150 }),
    body('website').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { fullName, bio, website, isPrivate } = req.body;
      
      // Build profile object
      const profileFields = {};
      if (fullName) profileFields.fullName = fullName;
      if (bio) profileFields.bio = bio;
      if (website) profileFields.website = website;
      if (isPrivate !== undefined) profileFields.isPrivate = isPrivate === 'true';
      if (req.file) profileFields.profileImage = req.file.path;
      
      // Update user
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: profileFields },
        { new: true }
      ).select('-password');
      
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Follow user
router.post('/follow/:id', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }
    
    const userToFollow = await User.findById(req.params.id);
    
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userToFollow.followers.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    const io = req.app.get('io');
    
    if (userToFollow.isPrivate) {
      if (userToFollow.followRequests.includes(req.user._id)) {
        return res.status(400).json({ error: 'Follow request already sent' });
      }
      
      await User.findByIdAndUpdate(req.params.id, {
        $push: { followRequests: req.user._id }
      });
      
      const notification = new Notification({
        recipient: req.params.id,
        sender: req.user._id,
        type: 'follow_request'
      });
      
      await notification.save();
      
      if (io) {
        sendFollowNotification(io, 'follow_request', req.user._id, req.params.id);
      }
      
      return res.json({ message: 'Follow request sent', status: 'requested' });
    }
    
    await User.findByIdAndUpdate(req.params.id, {
      $push: { followers: req.user._id }
    });
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { following: req.params.id }
    });
    
    const notification = new Notification({
      recipient: req.params.id,
      sender: req.user._id,
      type: 'follow'
    });
    
    await notification.save();
    
    if (io) {
      sendFollowNotification(io, 'follow', req.user._id, req.params.id);
    }
    
    res.json({ message: 'User followed successfully', status: 'following' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unfollow user
router.post('/unfollow/:id', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Invalid operation' });
    }
    
    const userToUnfollow = await User.findById(req.params.id);
    
    if (!userToUnfollow) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userToUnfollow.followers.includes(req.user._id)) {
      return res.status(400).json({ error: 'You are not following this user' });
    }
    
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { followers: req.user._id }
    });
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { following: req.params.id }
    });
    
    res.json({ message: 'User unfollowed successfully', status: 'not_following' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel follow request
router.post('/cancel-request/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.followRequests.includes(req.user._id)) {
      return res.status(400).json({ error: 'No follow request found' });
    }
    
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { followRequests: req.user._id }
    });
    
    await Notification.deleteOne({
      recipient: req.params.id,
      sender: req.user._id,
      type: 'follow_request'
    });
    
    res.json({ message: 'Follow request canceled', status: 'not_following' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept follow request
router.post('/accept-follow/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.followRequests.includes(req.params.id)) {
      return res.status(400).json({ error: 'No follow request from this user' });
    }
    
    const io = req.app.get('io');
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { followRequests: req.params.id },
      $push: { followers: req.params.id }
    });
    
    await User.findByIdAndUpdate(req.params.id, {
      $push: { following: req.user._id }
    });
    
    await Notification.deleteOne({
      recipient: req.user._id,
      sender: req.params.id,
      type: 'follow_request'
    });
    
    const notification = new Notification({
      recipient: req.params.id,
      sender: req.user._id,
      type: 'follow_request_accepted'
    });
    
    await notification.save();
    
    if (io) {
      sendFollowNotification(io, 'follow_request_accepted', req.user._id, req.params.id);
    }
    
    res.json({ message: 'Follow request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline follow request
router.post('/decline-follow/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.followRequests.includes(req.params.id)) {
      return res.status(400).json({ error: 'No follow request from this user' });
    }
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { followRequests: req.params.id }
    });
    
    await Notification.deleteOne({
      recipient: req.user._id,
      sender: req.params.id,
      type: 'follow_request'
    });
    
    res.json({ message: 'Follow request declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile by username
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', '_id username profileImage')
      .populate('following', '_id username profileImage');
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('user', '_id username profileImage');
      
    const isFollowing = user.followers.some(
      follower => follower._id.toString() === req.user._id.toString()
    );
    
    const isFollowedBy = user.following.some(
      following => following._id.toString() === req.user._id.toString()
    );
    
    const hasFollowRequest = user.followRequests.includes(req.user._id);
    
    res.json({
      user,
      posts,
      isFollowing,
      isFollowedBy,
      hasFollowRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
