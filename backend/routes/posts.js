
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const { uploadMultiple } = require('../utils/fileUpload');

// Create a new post
router.post('/', protect, uploadMultiple, async (req, res) => {
  try {
    const { caption, location } = req.body;
    
    // Check if media was uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Media file is required' });
    }
    
    // Get media paths
    const mediaPaths = req.files.map(file => file.path);
    
    // Create the post
    const post = new Post({
      user: req.user._id,
      media: mediaPaths,
      caption,
      location
    });
    
    await post.save();
    
    // Populate user details
    const populatedPost = await Post.findById(post._id).populate('user', 'username profileImage');
    
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get feed posts
router.get('/feed', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get current user
    const user = await User.findById(req.user._id);
    
    // FIX: Modified query to show all posts for now, not just from followed users
    // This ensures users can see content from all users in the platform
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profileImage');
    
    // Check if each post is liked and saved by current user
    const postsWithStatus = await Promise.all(posts.map(async (post) => {
      const isLiked = post.likes.includes(req.user._id);
      
      // Check if post is saved
      const currentUser = await User.findById(req.user._id);
      const isSaved = currentUser.savedPosts.includes(post._id);
      
      return {
        ...post._doc,
        isLiked,
        isSaved
      };
    }));
    
    // Check if there are more posts
    const totalPosts = await Post.countDocuments();
    
    const hasMore = totalPosts > skip + posts.length;
    
    res.json({
      posts: postsWithStatus,
      hasMore,
      page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get posts for explore page (only from public accounts)
router.get('/explore', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    console.log(`[EXPLORE] Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    const postsAgg = await Post.aggregate([
      // Join posts with users collection
      {
        $lookup: {
          from: 'users', // Ensure the collection name matches your DB (typically "users")
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      // Unwind the userData array into a single object
      { $unwind: '$userData' },
      // Filter out posts from users with private accounts using explicit Boolean comparison
      { $match: { $expr: { $eq: [ "$userData.isPrivate", false ] } } },
      // Sort posts descending by createdAt
      { $sort: { createdAt: -1 } },
      // Apply pagination
      { $skip: skip },
      { $limit: limit },
      // Project the fields you need and re-map userData to "user"
      {
        $project: {
          _id: 1,
          caption: 1,
          media: 1,
          likes: 1,
          createdAt: 1,
          user: "$userData"
        }
      }
    ]);
    console.log(`[EXPLORE] Aggregation returned ${postsAgg.length} posts`);

    // Count total posts matching the filter
    const countAgg = await Post.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      { $match: { $expr: { $eq: [ "$userData.isPrivate", false ] } } },
      { $count: 'total' }
    ]);
    const totalPosts = countAgg.length ? countAgg[0].total : 0;
    console.log(`[EXPLORE] Total posts count: ${totalPosts}`);
    const hasMore = totalPosts > skip + postsAgg.length;
    console.log(`[EXPLORE] Has more posts: ${hasMore}`);

    res.json({ posts: postsAgg, hasMore, page });
  } catch (error) {
    console.error('[EXPLORE] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});





// Get a single post
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profileImage')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profileImage'
        },
        options: { sort: { createdAt: -1 } }
      });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if post is liked by current user
    const isLiked = post.likes.includes(req.user._id);
    
    // Check if post is saved
    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.includes(post._id);
    
    res.json({
      ...post._doc,
      isLiked,
      isSaved
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a post
router.post('/like/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if already liked
    if (post.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Post already liked' });
    }
    
    // Add like
    post.likes.push(req.user._id);
    await post.save();
    
    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike a post
router.post('/unlike/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if liked
    if (!post.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Post not liked' });
    }
    
    // Remove like
    post.likes = post.likes.filter(
      id => id.toString() !== req.user._id.toString()
    );
    await post.save();
    
    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save a post
router.post('/save/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if already saved
    if (user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({ error: 'Post already saved' });
    }
    
    // Add to saved posts
    user.savedPosts.push(req.params.id);
    await user.save();
    
    res.json({ message: 'Post saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsave a post
router.post('/unsave/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Check if saved
    if (!user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({ error: 'Post not saved' });
    }
    
    // Remove from saved posts
    user.savedPosts = user.savedPosts.filter(
      id => id.toString() !== req.params.id.toString()
    );
    await user.save();
    
    res.json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get saved posts
router.get('/saved/list', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get saved posts
    const savedPosts = await Post.find({
      _id: { $in: user.savedPosts }
    })
    .sort({ createdAt: -1 })
    .populate('user', 'username profileImage');
    
    // Add isLiked and isSaved status to each post
    const postsWithStatus = savedPosts.map(post => ({
      ...post._doc,
      isLiked: post.likes.includes(req.user._id),
      isSaved: true // Since these are saved posts
    }));
    
    res.json({ posts: postsWithStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get liked posts
router.get('/liked/list', protect, async (req, res) => {
  try {
    // Find posts that the user has liked
    const likedPosts = await Post.find({
      likes: req.user._id
    })
    .sort({ createdAt: -1 })
    .populate('user', 'username profileImage');
    
    // Get saved posts for checking
    const user = await User.findById(req.user._id);
    
    // Add isLiked and isSaved status to each post
    const postsWithStatus = likedPosts.map(post => ({
      ...post._doc,
      isLiked: true, // Since these are liked posts
      isSaved: user.savedPosts.includes(post._id)
    }));
    
    res.json({ posts: postsWithStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized to delete this post' });
    }
    
    await post.deleteOne();
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
