// utils/notifications.js (server)
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET all notifications
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
   

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', '_id username profileImage')
      .populate('post')
      .populate('comment')
      .populate('message');
    
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id,
      read: false
    });
    
    
    res.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] GET Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark single notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      console.log(`[NOTIFICATIONS] Notification ${req.params.id} not found for user ${req.user._id}`);
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id,
      read: false
    });
    
    
    res.json({ message: 'Notification marked as read', unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS] PUT /:id/read Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', protect, async (req, res) => {
  try {
    
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    console.log(`[NOTIFICATIONS] All notifications marked as read for user ${req.user._id}`);
    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    console.error('[NOTIFICATIONS] PUT /read-all Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete single notification
router.delete('/:id', protect, async (req, res) => {
  try {
   
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.deleteOne();
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });
    console.log(`[NOTIFICATIONS] Notification ${req.params.id} deleted. New unread count: ${unreadCount}`);
    res.json({ message: 'Notification deleted', unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS] DELETE /:id Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all notifications
router.delete('/', protect, async (req, res) => {
  try {
    console.log(`[NOTIFICATIONS] Deleting all notifications for user ${req.user._id}`);
    await Notification.deleteMany({ recipient: req.user._id });
    console.log(`[NOTIFICATIONS] All notifications deleted for user ${req.user._id}`);
    res.json({ message: 'All notifications deleted', unreadCount: 0 });
  } catch (error) {
    console.error('[NOTIFICATIONS] DELETE / Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread notifications count
router.get('/unread-count', protect, async (req, res) => {
  try {
    console.log(`[NOTIFICATIONS] Fetching unread count for user ${req.user._id}`);
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    console.log(`[NOTIFICATIONS] Unread count for user ${req.user._id}: ${count}`);
    res.json({ count });
  } catch (error) {
    console.error('[NOTIFICATIONS] GET /unread-count Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
