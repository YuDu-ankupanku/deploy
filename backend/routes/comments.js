
const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create a comment
router.post(
  '/:postId',
  protect,
  [
    body('text').notEmpty().trim().isLength({ max: 1000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const post = await Post.findById(req.params.postId);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      // Create comment
      const comment = new Comment({
        user: req.user._id,
        post: req.params.postId,
        text: req.body.text
      });
      
      await comment.save();
      
      // Add comment to post
      post.comments.push(comment._id);
      await post.save();
      
      // Populate user info
      await comment.populate('user', '_id username profileImage');
      
      // Create notification (if not user's own post)
      if (post.user.toString() !== req.user._id.toString()) {
        const notification = new Notification({
          recipient: post.user,
          sender: req.user._id,
          type: 'comment',
          post: post._id,
          comment: comment._id
        });
        
        await notification.save();
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get comments for a post
router.get('/post/:postId', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', '_id username profileImage');
      
    res.json({
      comments,
      hasMore: comments.length === limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a comment
router.post('/like/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if already liked
    if (comment.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Comment already liked' });
    }
    
    // Add like
    comment.likes.push(req.user._id);
    await comment.save();
    
    // Create notification (if not user's own comment)
    if (comment.user.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: comment.user,
        sender: req.user._id,
        type: 'like',
        comment: comment._id
      });
      
      await notification.save();
    }
    
    res.json({ message: 'Comment liked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike a comment
router.post('/unlike/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if liked
    if (!comment.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Comment not liked' });
    }
    
    // Remove like
    comment.likes = comment.likes.filter(
      like => like.toString() !== req.user._id.toString()
    );
    
    await comment.save();
    
    res.json({ message: 'Comment unliked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a comment
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      // Get post to check if post owner
      const post = await Post.findById(comment.post);
      
      if (!post || post.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ error: 'Not authorized to delete this comment' });
      }
    }
    
    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });
    
    // Delete notifications related to comment
    await Notification.deleteMany({ comment: comment._id });
    
    // Delete comment
    await comment.deleteOne();
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
