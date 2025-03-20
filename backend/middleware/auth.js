
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted from Authorization header:', token ? `${token.substring(0, 10)}...` : 'No token');
    }
    
    // Check if token exists
    if (!token) {
      console.log('Auth failed: No token provided');
      return res.status(401).json({ error: 'Not authorized to access this route' });
    }
    
    try {
      // Verify the JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is missing in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      // Validate token format before attempting to verify
      if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
        console.error('Token appears to be malformed:', token.substring(0, 10) + '...');
        return res.status(401).json({ error: 'Invalid token format' });
      }
      
      // Log token format for debugging
      console.log('Token format check:', {
        length: token.length,
        format: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token) ? 'valid JWT format' : 'invalid JWT format'
      });
      
      // Verify token
      console.log('Verifying token with secret:', process.env.JWT_SECRET ? 'JWT_SECRET exists' : 'JWT_SECRET is missing');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      
      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('Auth failed: User not found for decoded token ID:', decoded.id);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('Auth successful for user ID:', user._id);
      
      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      // Provide more specific error messages based on the error type
      if (error.name === 'JsonWebTokenError' && error.message === 'jwt malformed') {
        console.log('Token appears to be malformed. Actual token format:', token ? token.substring(0, 10) + '...' : 'No token');
        return res.status(401).json({ error: 'Invalid token format' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired. Please log in again' });
      }
      
      return res.status(401).json({ error: 'Not authorized to access this route - Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message, error.stack);
    return res.status(500).json({ error: 'Server error in auth middleware' });
  }
};
