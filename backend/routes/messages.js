const express = require('express');
const { body, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');

const router = express.Router();

// Get all conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .sort({ updatedAt: -1 })
    .populate('participants', '_id username fullName profileImage')
    .populate('lastMessage');
    
    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new conversation
router.post(
  '/conversations',
  protect,
  [
    body('participants').isArray({ min: 1 }),
    body('isGroup').optional().isBoolean(),
    body('groupName').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { participants, isGroup, groupName } = req.body;
      
      if (!participants.includes(req.user._id.toString())) {
        participants.push(req.user._id.toString());
      }
      
      if (!isGroup && participants.length === 2) {
        const existingConversation = await Conversation.findOne({
          isGroup: false,
          participants: { $all: participants, $size: 2 }
        });
        
        if (existingConversation) {
          await existingConversation.populate('participants', '_id username fullName profileImage');
          return res.json(existingConversation);
        }
      }
      
      const conversation = new Conversation({
        participants,
        isGroup: isGroup || false,
        groupName: isGroup ? groupName : null
      });
      
      await conversation.save();
      
      await conversation.populate('participants', '_id username fullName profileImage');
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get messages for a conversation
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const messages = await Message.find({ conversation: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', '_id username profileImage');
    
    const sortedMessages = [...messages].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    res.json({
      messages: sortedMessages,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post(
  '/conversations/:id',
  protect,
  upload,
  [
    body('text').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        participants: req.user._id
      });
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      if (!req.body.text && !req.file) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }
      
      const message = new Message({
        conversation: req.params.id,
        sender: req.user._id,
        text: req.body.text || null,
        media: req.file ? req.file.path : null,
        readBy: [req.user._id]
      });
      
      await message.save();
      
      conversation.lastMessage = message._id;
      await conversation.save();
      
      await message.populate('sender', '_id username profileImage');
      
      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Mark messages as read
router.put('/conversations/:id/read', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    await Message.updateMany(
      {
        conversation: req.params.id,
        readBy: { $ne: req.user._id }
      },
      {
        $push: { readBy: req.user._id }
      }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
