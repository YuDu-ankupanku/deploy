const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    throw new Error('Server configuration error: JWT_SECRET missing');
  }
  const payload = { id: id.toString() };
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    });
    if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
      console.error('Generated token has invalid format:', token.substring(0, 10) + '...');
      throw new Error('Failed to generate valid token');
    }
    console.log('Token generated successfully with format validation');
    return token;
  } catch (error) {
    console.error('Token generation error:', error.message);
    throw new Error('Failed to generate authentication token');
  }
};

// Register User
router.post(
  '/register',
  [
    body('username').isLength({ min: 3, max: 30 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password, fullName } = req.body;
    
    try {
      console.log('Registration attempt for:', { email, username });
      
      // Check if user already exists
      let user = await User.findOne({ $or: [{ email }, { username }] });
      
      if (user) {
        console.log('Registration failed: User already exists with email or username');
        return res.status(400).json({
          error: 'User already exists with that email or username'
        });
      }
      
      // Create new user
      user = new User({
        username,
        email,
        password,
        fullName
      });
      
      await user.save();
      console.log('User saved to database:', { id: user._id, email, username });
      
      // Generate token
      const token = generateToken(user._id);
      console.log(`Generated token for new user ${email}:`, token.substring(0, 10) + '...');
      
      // Return user data without password
      const userData = { ...user._doc };
      delete userData.password;
      
      res.status(201).json({
        token,
        user: userData
      });
    } catch (error) {
      console.error('Register error:', error.message, error.stack);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// Login User
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      console.log('Login attempt for email:', req.body.email);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password } = req.body;
      
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log('Login failed: User not found for email:', email);
        return res.status(404).json({ error: 'User not found with this email' });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        console.log('Login failed: Invalid password for user:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate token
      try {
        const token = generateToken(user._id);
        console.log(`Generated token for user ${email}:`, token.substring(0, 10) + '...');
        
        console.log('Login successful for user:', email);
        
        // Return user data without password
        const userData = { ...user._doc };
        delete userData.password;
        
        res.json({
          token,
          user: userData
        });
      } catch (error) {
        console.error('Token generation failed:', error.message);
        return res.status(500).json({ error: 'Failed to generate authentication token' });
      }
    } catch (error) {
      console.error('Login error on server:', error.message, error.stack);
      res.status(500).json({ error: 'Server error during login', message: error.message });
    }
  }
);

// Update Password for Authenticated User
router.put(
  '/update-password',
  protect,
  [
    body('currentPassword')
      .isLength({ min: 6 })
      .withMessage('Current password must be at least 6 characters.'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      // Update password
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get Current User
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request Password Reset (Generate Token & OTP)
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email } = req.body;
    
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        // Do not reveal that the user doesn't exist for security reasons.
        return res.status(200).json({ message: 'If your email is registered, you will receive an OTP' });
      }
      
      // Generate a reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash token and OTP before saving to database
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      
      // Set expiration time (1 hour)
      user.resetPasswordToken = hashedToken;
      user.resetPasswordOTP = hashedOTP;
      user.resetPasswordExpires = Date.now() + 3600000;
      
      await user.save();
      
      // TODO: Send email (and/or SMS) with reset link (containing resetToken) and OTP.
      console.log(`Reset token for ${email}: ${resetToken}`);
      console.log(`OTP for ${email}: ${otp}`);
      
      res.status(200).json({ message: 'If your email is registered, you will receive an OTP' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Confirm Password Reset with OTP
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { token, otp, newPassword } = req.body;
    
    try {
      // Hash the received token and OTP to compare with the stored values
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
      
      // Find user with matching token, OTP and valid expiration
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordOTP: hashedOTP,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired token/OTP' });
      }
      
      // Set new password and clear the reset fields
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      
      await user.save();
      
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
