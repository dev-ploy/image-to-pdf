const express = require('express');
const router = express.Router(); // Create router instance FIRST
const multer = require('multer');
const path = require('path');
// Ensure this points to the file with uploadAndConvert, downloadPdfByFilename
const convertController = require('../controllers/convertControllers');

// Configure multer
const upload = multer({
    dest: 'uploads/', // Temporary storage directory
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // Accept JPG/PNG
        } else {
            // Reject other types with an error for the middleware
            cb(new Error('Invalid file type. Only JPG and PNG allowed.'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// --- Define Routes ---

// POST /api/convert (Handles the upload and conversion)
router.post(
    '/', // Path is relative to '/api/convert' prefix in server.js
    (req, res, next) => { // Middleware for multer error handling
        upload.single('image')(req, res, (err) => { // 'image' is the field name
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                const error = new Error(`File upload error: ${err.message}`);
                error.status = 400;
                return next(error);
            } else if (err) {
                console.error('File filter or unknown upload error:', err);
                const error = new Error(err.message || 'File upload failed');
                error.status = 400;
                return next(error);
            }
            if (!req.file) {
                 console.warn('Multer middleware finished, but req.file is undefined.');
                 const error = new Error('No file uploaded.');
                 error.status = 400;
                 return next(error);
            }
            next(); // Proceed to controller if no error
        });
    },
    convertController.uploadAndConvert // Use the correct controller function
);

// GET /api/convert/download/:filename (Handles download)
router.get(
    '/download/:filename', // Use :filename parameter
    convertController.downloadPdfByFilename // Use the correct controller function
);

// --- Export Router ---
module.exports = router; 