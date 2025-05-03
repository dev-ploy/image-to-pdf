const express = require('express');
const multer = require('multer');
const path = require('path');
const convertController = require('../controllers/convertControllers'); // Ensure correct filename

const router = express.Router();

// --- Multer Configuration ---
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); // Define uploads dir relative to routes

const upload = multer({
  dest: UPLOADS_DIR, // Save temporary uploads locally
  fileFilter: (req, file, cb) => {
    // Accept only jpg and png
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG and PNG images are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// --- Define Routes ---

// POST /api/convert - Handles image upload and conversion trigger
router.post(
  '/',
  (req, res, next) => { // Middleware for detailed multer error handling
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Handle Multer specific errors
        if (err instanceof multer.MulterError) {
          console.error('Multer error:', err.code, err.message);
          const error = new Error(`File upload error: ${err.message}`);
          error.status = 400; // Bad request for client-side errors like limits
          return next(error);
        }
        // Handle other errors (e.g., fileFilter error)
        console.error('File upload filter error:', err.message);
        const error = new Error(err.message || 'File upload failed.');
        error.status = 400; // Bad request
        return next(error);
      }
      // If no error from multer, proceed to the controller
      next();
    });
  },
  convertController.uploadAndConvert // The main controller logic
);

// GET /api/convert/download/:filename - Handles PDF download
router.get(
  '/download/:filename',
  convertController.downloadPdfByFilename // Controller to handle the download
);

module.exports = router;