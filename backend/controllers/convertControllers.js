const fs = require('fs').promises;
const path = require('path');
// const File = require('../models/File'); // Uncomment if using MongoDB model
const { ensureDirectoryExists, convertImageToPdf } = require('../utils/pdfUtils'); // Import helper

// Define directories relative to controller
const PDFS_DIR = path.join(__dirname, '..', 'pdfs');

// --- Define Controller Functions as Local Constants ---

// Upload Single Image and Convert to PDF
const uploadAndConvert = async (req, res, next) => {
  console.log("Controller: uploadAndConvert function started."); // Add entry log
  let tempImagePath = null;
  try {
    // req.file should be populated by multer middleware in the route
    if (!req.file) {
      console.error('Controller: req.file is missing. Multer did not process a file.');
      const err = new Error('No file uploaded or file processing failed.');
      err.status = 400;
      throw err; // Throw error to be caught and passed to next()
    }
    tempImagePath = req.file.path;
    console.log(`Controller: Received file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, temp path: ${tempImagePath}`);

    // Call the utility function to perform the conversion
    const relativePdfPath = await convertImageToPdf(
      tempImagePath,
      req.file.originalname,
      req.file.filename, // Pass multer's unique filename
      req.file.mimetype
    );
    console.log(`Controller: PDF conversion successful. Relative Path: ${relativePdfPath}`);

    // --- Database Interaction (Placeholder) ---
    // console.log('Controller: Saving file info to database (placeholder)...');
    // const file = new File({ originalName: req.file.originalname, filename: req.file.filename, pdfPath: relativePdfPath, mimetype: req.file.mimetype });
    // await file.save();
    // const fileId = file._id;
    // console.log(`Controller: File info saved with ID: ${fileId}`);
    // --- End DB Placeholder ---

    // Send success response
    res.status(201).json({
      message: 'Image uploaded and converted successfully',
      // fileId: fileId, // Include if using DB
      pdfPath: relativePdfPath, // Relative path for client use
      pdfFilename: path.basename(relativePdfPath) // Extract filename for convenience
    });

  } catch (error) {
    console.error('Controller: Error in uploadAndConvert:', error);
    // Cleanup temp file if it exists, even if conversion failed
    if (tempImagePath) {
        try {
            await fs.unlink(tempImagePath);
            console.log(`Controller: Cleaned up temp file on error: ${tempImagePath}`);
        } catch (cleanupError) {
            // Log cleanup error but don't obscure the original error
            console.error(`Controller: Error cleaning up temp file on error ${tempImagePath}:`, cleanupError);
        }
    }
    // Pass error to the global error handler in server.js
    next(error);
  }
};

// Download PDF by Filename
const downloadPdfByFilename = async (req, res, next) => {
  console.log("Controller: downloadPdfByFilename function started."); // Add entry log
  try {
    const filename = req.params.filename;
    if (!filename) {
      const err = new Error('Filename parameter is missing.');
      err.status = 400;
      throw err;
    }

    // Basic validation to prevent directory traversal
    if (filename.includes('..')) {
        const err = new Error('Invalid filename.');
        err.status = 400;
        throw err;
    }

    const absolutePdfPath = path.join(PDFS_DIR, filename);
    console.log(`Controller: Attempting download for filename ${filename} from path: ${absolutePdfPath}`);

    // Check file existence using stat
    try {
        await fs.stat(absolutePdfPath);
        console.log(`Controller: File found at ${absolutePdfPath}`);
    } catch(statError) {
        if (statError.code === 'ENOENT') {
            console.error(`Controller: PDF file not found at ${absolutePdfPath}`);
            const err = new Error('PDF file not found on server.');
            err.status = 404;
            throw err;
        } else {
            // Other stat error (e.g., permissions)
            console.error(`Controller: Error accessing file stats for ${absolutePdfPath}:`, statError);
            throw statError; // Re-throw other stat errors
        }
    }

    // Send the file for download
    // The third argument (callback) is useful for logging errors after headers might have been sent
    res.download(absolutePdfPath, filename, (downloadErr) => {
      if (downloadErr) {
        // Error occurred during streaming, headers might be sent
        console.error(`Controller: Error sending file ${absolutePdfPath} to client:`, downloadErr);
        // Cannot reliably send a JSON error if headers are sent, Express handles cleanup
      } else {
        // Success
        console.log(`Controller: Successfully initiated download for ${absolutePdfPath} as ${filename}`);
      }
    });

  } catch (error) {
    console.error('Controller: Error in downloadPdfByFilename:', error);
    // Pass error to global handler (if headers not already sent by res.download error)
    if (!res.headersSent) {
        next(error);
    }
  }
};

// Optional: Delete PDF File
const deletePdfFile = async (req, res, next) => {
    // ... (Implementation as before, ensure it's defined if exported) ...
    console.log("Controller: deletePdfFile function started (if implemented).");
    next(new Error("Delete function not fully implemented")); // Placeholder
};


// --- Export the Controller Functions ---
// This MUST be at the end of the file, after all functions are defined
console.log("Controller: Exporting controller functions..."); // Add export log
module.exports = {
    uploadAndConvert,
    downloadPdfByFilename,
    // deletePdfFile // Uncomment if implemented and needed
};
console.log("Controller: Functions exported."); // Add export log