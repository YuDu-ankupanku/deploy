
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists('./uploads/profiles');
createDirIfNotExists('./uploads/posts');
createDirIfNotExists('./uploads/stories');
createDirIfNotExists('./uploads/messages');
createDirIfNotExists('./uploads/reels');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = './uploads/';
    
    if (req.baseUrl.includes('/users')) {
      uploadPath += 'profiles/';
    } else if (req.baseUrl.includes('/posts')) {
      uploadPath += 'posts/';
    } else if (req.baseUrl.includes('/stories')) {
      uploadPath += 'stories/';
    } else if (req.baseUrl.includes('/messages')) {
      uploadPath += 'messages/';
    } else if (req.baseUrl.includes('/reels')) {
      uploadPath += 'reels/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Unsupported file format'));
  }
};

// Create multer instance with configuration
const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Export configured middleware functions
module.exports = {
  upload: multerUpload.single('media'),
  uploadMultiple: multerUpload.array('media', 10), // Allow up to 10 files
  profileUpload: multerUpload.single('profileImage'),
  userSettingsUpload: multerUpload.fields([
    { name: 'profileImage', maxCount: 1 }
  ])
};
