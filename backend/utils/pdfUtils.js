const fs = require('fs'); // Import the base 'fs' module for createWriteStream
const fsPromises = require('fs').promises; // Keep promises for async operations like access/unlink
const path = require('path');
const PDFDocument = require('pdfkit');

// Define base directories relative to the backend root (one level up from utils)
const BACKEND_ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(BACKEND_ROOT, 'uploads'); // For temp multer files
const PDFS_DIR = path.join(BACKEND_ROOT, 'pdfs'); // For final PDFs

/**
 * Ensures a directory exists, creating it if necessary.
 * Uses fsPromises for async operations.
 * @param {String} dirPath - The absolute path to the directory.
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fsPromises.access(dirPath); // Use fsPromises.access
    console.log(`Helper: Directory already exists: ${dirPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Helper: Directory not found, creating: ${dirPath}`);
      try {
        await fsPromises.mkdir(dirPath, { recursive: true }); // Use fsPromises.mkdir
        console.log(`Helper: Successfully created directory: ${dirPath}`);
      } catch (mkdirError) {
        console.error(`Helper: Error creating directory ${dirPath}:`, mkdirError);
        throw new Error(`Failed to create directory: ${dirPath}`); // Re-throw critical error
      }
    } else {
      // Other error accessing directory (e.g., permissions)
      console.error(`Helper: Error accessing directory ${dirPath}:`, error);
      throw new Error(`Failed to access directory: ${dirPath}`); // Re-throw critical error
    }
  }
};

/**
 * Converts an image file to a PDF file.
 * @param {String} imagePath - Absolute path to the temporary uploaded image.
 * @param {String} originalName - Original name of the uploaded file.
 * @param {String} uniqueFilename - Multer's unique filename for the uploaded image.
 * @param {String} mimetype - Mimetype of the image (e.g., 'image/jpeg').
 * @returns {Promise<String>} - Resolves with the relative path to the created PDF file.
 */
const convertImageToPdf = async (imagePath, originalName, uniqueFilename, mimetype) => {
  console.log(`Helper: convertImageToPdf called for image: ${imagePath}`);
  let pdfPath = null; // Initialize pdfPath
  let writeStream = null; // Initialize writeStream

  try {
    // Ensure the target directory for PDFs exists
    await ensureDirectoryExists(PDFS_DIR);

    // Construct the PDF filename using the unique part of the temp image name
    const pdfFilename = `${path.parse(uniqueFilename).name}.pdf`;
    pdfPath = path.join(PDFS_DIR, pdfFilename); // Absolute path for writing
    const relativePdfPath = path.join('pdfs', pdfFilename); // Relative path for response

    console.log(`Helper: Target PDF path: ${pdfPath}`);

    // Create a new PDF document
    const doc = new PDFDocument({ autoFirstPage: false }); // Don't add a page automatically

    // Create a writable stream to the target PDF file
    // Use the base 'fs' module here
    writeStream = fs.createWriteStream(pdfPath); // <<<< Line 68 (approx) - Use fs.createWriteStream

    // Pipe the PDF document output to the file stream
    doc.pipe(writeStream);

    // Embed the image
    console.log(`Helper: Embedding image ${imagePath} with mimetype ${mimetype}`);
    // Add a page first, sized to the image if possible, or default
    // Note: pdfkit might determine size automatically for common types
    doc.addPage().image(imagePath, {
        fit: [doc.page.width - doc.page.margins.left - doc.page.margins.right, doc.page.height - doc.page.margins.top - doc.page.margins.bottom], // Fit within page margins
        align: 'center',
        valign: 'center'
    });

    // Finalize the PDF document
    doc.end();

    // Return a promise that resolves when the stream finishes writing
    await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            console.log(`Helper: Successfully created PDF: ${pdfPath}`);
            resolve(relativePdfPath); // Resolve with the relative path
        });
        writeStream.on('error', (streamError) => {
            console.error(`Helper: Stream Error writing PDF ${pdfPath}:`, streamError);
            reject(new Error(`Failed to write PDF file: ${streamError.message}`));
        });
        doc.on('error', (docError) => { // Also listen for errors on the document itself
             console.error(`Helper: PDFDocument Error for ${pdfPath}:`, docError);
             reject(new Error(`PDF generation error: ${docError.message}`));
        });
    });

    // Clean up the temporary image file after successful conversion
    try {
        await fsPromises.unlink(imagePath); // Use fsPromises.unlink
        console.log(`Helper: Successfully deleted temp image: ${imagePath}`);
    } catch (unlinkError) {
        console.warn(`Helper: Warning - Failed to delete temp image ${imagePath}:`, unlinkError);
        // Don't fail the whole operation if temp file cleanup fails
    }

    return relativePdfPath; // Return the relative path on success

  } catch (error) {
    console.error(`Helper: Error processing image data for PDF (${imagePath}):`, error);

    // Attempt to clean up partially created PDF if an error occurred
    if (writeStream) {
        writeStream.end(); // Ensure stream is closed
    }
    if (pdfPath) {
        try {
            await fsPromises.access(pdfPath); // Check if file exists before unlinking
            await fsPromises.unlink(pdfPath); // Use fsPromises.unlink
            console.log(`Helper: Cleaned up failed/partial PDF: ${pdfPath}`);
        } catch (cleanupError) {
            // Log if cleanup fails, but don't hide the original error
            if (cleanupError.code !== 'ENOENT') { // Ignore if file didn't exist anyway
                 console.error(`Helper: Error cleaning up failed PDF ${pdfPath}:`, cleanupError);
            }
        }
    }

    // Attempt to clean up the temporary image file if it still exists on error
    if (imagePath) {
        try {
            await fsPromises.access(imagePath);
            await fsPromises.unlink(imagePath);
            console.log(`Helper: Cleaned up temp image on error: ${imagePath}`);
        } catch (cleanupError) {
             if (cleanupError.code !== 'ENOENT') {
                 console.error(`Helper: Error cleaning up temp image ${imagePath} on error:`, cleanupError);
             }
        }
    }


    // Re-throw the original error to be caught by the controller
    throw error;
  }
};

module.exports = {
  ensureDirectoryExists,
  convertImageToPdf,
};