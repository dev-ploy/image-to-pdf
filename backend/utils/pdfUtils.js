const fs = require('fs'); // Use base fs for createWriteStream
const fsPromises = require('fs').promises; // Use promises for async operations like unlink/access/mkdir
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
    await fsPromises.access(dirPath);
    console.log(`Helper: Directory already exists: ${dirPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Helper: Directory not found, creating: ${dirPath}`);
      try {
        await fsPromises.mkdir(dirPath, { recursive: true });
        console.log(`Helper: Successfully created directory: ${dirPath}`);
      } catch (mkdirError) {
        console.error(`Helper: Error creating directory ${dirPath}:`, mkdirError);
        throw new Error(`Failed to create directory: ${dirPath}`);
      }
    } else {
      console.error(`Helper: Error accessing directory ${dirPath}:`, error);
      throw new Error(`Failed to access directory: ${dirPath}`);
    }
  }
};


/**
 * Converts an image file to a PDF file saved locally.
 * @param {String} imagePath - Absolute path to the temporary uploaded image.
 * @param {String} originalName - Original name of the uploaded file.
 * @param {String} uniqueFilename - Multer's unique filename for the uploaded image.
 * @param {String} mimetype - Mimetype of the image (e.g., 'image/jpeg').
 * @returns {Promise<String>} - Resolves with the relative path to the created PDF file (e.g., 'pdfs/unique-name.pdf').
 */
const convertImageToPdf = async (imagePath, originalName, uniqueFilename, mimetype) => {
  console.log(`Helper: convertImageToPdf called for image: ${imagePath}`);
  let pdfPath = null; // Absolute path for writing
  let writeStream = null;

  try {
    // Ensure the target directory for PDFs exists
    await ensureDirectoryExists(PDFS_DIR);

    // Construct the PDF filename using the unique part of the temp image name
    const pdfFilename = `${path.parse(uniqueFilename).name}.pdf`;
    pdfPath = path.join(PDFS_DIR, pdfFilename); // Absolute path for writing
    const relativePdfPath = path.join('pdfs', pdfFilename); // Relative path for response/DB

    console.log(`Helper: Target PDF path: ${pdfPath}`);

    // Create a new PDF document
    const doc = new PDFDocument({ autoFirstPage: false });

    // Create a writable stream to the target PDF file
    writeStream = fs.createWriteStream(pdfPath);

    // Pipe the PDF document output to the file stream
    doc.pipe(writeStream);

    // Embed the image
    console.log(`Helper: Embedding image ${imagePath} with mimetype ${mimetype}`);
    doc.addPage().image(imagePath, {
      fit: [doc.page.width - doc.page.margins.left - doc.page.margins.right, doc.page.height - doc.page.margins.top - doc.page.margins.bottom],
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
      doc.on('error', (docError) => {
        console.error(`Helper: PDFDocument Error for ${pdfPath}:`, docError);
        reject(new Error(`PDF generation error: ${docError.message}`));
      });
    });

    // Clean up the temporary image file after successful conversion
    try {
      await fsPromises.unlink(imagePath);
      console.log(`Helper: Successfully deleted temp image: ${imagePath}`);
    } catch (unlinkError) {
      console.warn(`Helper: Warning - Failed to delete temp image ${imagePath}:`, unlinkError);
    }

    return relativePdfPath; // Return the relative path on success

  } catch (error) {
    console.error(`Helper: Error processing image data for PDF (${imagePath}):`, error);

    // Attempt cleanup of partial PDF and temp image on error
    if (writeStream) writeStream.end();
    if (pdfPath) {
      try {
        await fsPromises.unlink(pdfPath);
        console.log(`Helper: Cleaned up failed/partial PDF: ${pdfPath}`);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') console.error(`Helper: Error cleaning up failed PDF ${pdfPath}:`, cleanupError);
      }
    }
    if (imagePath) {
      try {
        await fsPromises.unlink(imagePath);
        console.log(`Helper: Cleaned up temp image on error: ${imagePath}`);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') console.error(`Helper: Error cleaning up temp image ${imagePath} on error:`, cleanupError);
      }
    }

    // Re-throw the original error
    throw error;
  }
};

module.exports = {
  ensureDirectoryExists,
  convertImageToPdf,
};