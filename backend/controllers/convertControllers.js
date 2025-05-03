const path = require('path');
const fs = require('fs'); // Required for fs.constants
const fsPromises = require('fs').promises; // Promises API for async file operations
const { convertImageToPdf } = require('../utils/pdfUtils'); // Assuming ensureDirectoryExists is handled within pdfUtils or server startup
const File = require('../models/File'); // Import the Mongoose model

// Define base directories relative to the controller file's location
const BACKEND_ROOT = path.join(__dirname, '..');
const PDFS_DIR = path.join(BACKEND_ROOT, 'pdfs'); // Directory where final PDFs are stored

/**
 * Controller to handle image upload, conversion to PDF, and saving metadata.
 */
const uploadAndConvert = async (req, res, next) => {
  console.log("Controller: uploadAndConvert function started.");

  // Check if Multer processed a file
  if (!req.file) {
    console.log("Controller: No file uploaded by Multer.");
    const error = new Error('No image file uploaded.');
    error.status = 400;
    return next(error); // Pass error to global handler
  }

  // Extract file details provided by Multer
  const tempImagePath = req.file.path; // Absolute path to the temporary file in /uploads
  const originalName = req.file.originalname;
  const uniqueFilename = req.file.filename; // Multer's unique name for the temp image
  const mimetype = req.file.mimetype;

  console.log(`Controller: Processing uploaded file: ${originalName}, Temp path: ${tempImagePath}, Mimetype: ${mimetype}`);

  try {
    // Call the utility function to convert the image and save the PDF locally
    // It returns the relative path (e.g., 'pdfs/unique-name.pdf')
    const relativePdfPath = await convertImageToPdf(
      tempImagePath,
      originalName,
      uniqueFilename,
      mimetype
    );

    // Extract just the filename (e.g., 'unique-name.pdf') from the relative path
    const pdfFilename = path.basename(relativePdfPath);
    console.log(`Controller: PDF conversion successful. Relative path: ${relativePdfPath}, Filename: ${pdfFilename}`);

    // --- Database Interaction (Optional but recommended) ---
    try {
      const newFile = new File({
        originalName: originalName,
        filename: uniqueFilename, // Store multer's temp image filename (optional)
        pdfPath: relativePdfPath, // Store the relative path to the PDF
        // createdAt will default and TTL index will apply
      });
      await newFile.save();
      console.log(`Controller: Saved file metadata to DB. ID: ${newFile._id}, PDF Path: ${relativePdfPath}`);
    } catch (dbError) {
      console.error("Controller: Warning - Error saving file metadata to database:", dbError);
      // Decide if this should be a fatal error or just a warning.
      // For now, we log it but allow the request to succeed.
      // Consider adding more robust error handling or cleanup if DB save is critical.
    }
    // --- End Database Interaction ---

    // Send success response back to the frontend
    res.status(201).json({ // 201 Created is appropriate
      message: 'Image uploaded and converted successfully',
      pdfFilename: pdfFilename, // Send the filename needed for constructing the download URL
    });

  } catch (error) {
    console.error("Controller: Error during image conversion or related process:", error);
    // Ensure error has a status code, default to 500 if not set
    error.status = error.status || 500;
    // Pass the error to the global error handler in server.js
    next(error);
  }
};

/**
 * Controller to handle downloading a PDF file by its filename.
 */
const downloadPdfByFilename = async (req, res, next) => {
  const { filename } = req.params;
  console.log(`Controller: Download request received for filename: ${filename}`);

  // Basic validation and sanitization
  if (!filename || typeof filename !== 'string' || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.log(`Controller: Invalid filename detected: ${filename}`);
      const error = new Error('Invalid or missing filename.');
      error.status = 400; // Bad Request
      return next(error);
  }

  // Construct the absolute path to the requested PDF file
  const absolutePdfPath = path.join(PDFS_DIR, filename);
  console.log(`Controller: Attempting to send file from absolute path: ${absolutePdfPath}`);

  try {
      // Check if the file exists AND if the server process has read permissions
      await fsPromises.access(absolutePdfPath, fs.constants.R_OK); // R_OK checks for read permission
      console.log(`Controller: File found and read access verified: ${absolutePdfPath}`);

      // Use res.download() to send the file.
      // It sets appropriate headers (Content-Disposition) for download.
      res.download(absolutePdfPath, filename, (downloadErr) => {
          // This callback handles errors that occur *during* the file transfer
          if (downloadErr) {
              console.error(`Controller: Error sending file ${absolutePdfPath} to client after headers sent:`, downloadErr);
              // Cannot reliably send a JSON error response here as headers might be sent.
              // Express's default error handling might close the connection.
          } else {
              // File transfer initiated successfully
              console.log(`Controller: Successfully initiated download for ${absolutePdfPath} as ${filename}`);
          }
      });

  } catch (error) {
      // Handle errors from fsPromises.access
      console.error(`Controller: Caught error during file access check for ${absolutePdfPath}:`, error); // Log the full error

      if (error.code === 'ENOENT') {
          // File does not exist
          const notFoundError = new Error(`PDF file not found: ${filename}`);
          notFoundError.status = 404; // Not Found
          next(notFoundError);
      } else if (error.code === 'EACCES') {
          // Permission denied
          const accessError = new Error(`Permission denied accessing file: ${filename}`);
          accessError.status = 403; // Forbidden
          next(accessError);
      } else {
          // Other filesystem or unexpected errors
          const genericError = new Error(error.message || `Could not access file: ${filename}`);
          genericError.status = 500; // Internal Server Error
          next(genericError);
      }
  }
};

// Export the controller functions
module.exports = {
  uploadAndConvert,
  downloadPdfByFilename,
};