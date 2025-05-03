require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs'); // Use base fs for existsSync/mkdirSync
const rateLimit = require('express-rate-limit');

// --- Route Imports ---
console.log("Requiring routes...");
const convertRoutes = require('./routes/convert'); // Ensure this path is correct
console.log("Successfully required './routes/convert'. Type:", typeof convertRoutes);

// --- Initialize Express App ---
const app = express();
console.log("Express app initialized.");

// --- Define Base Directories ---
const uploadsDir = path.join(__dirname, 'uploads');
const pdfsDir = path.join(__dirname, 'pdfs');

// --- Ensure Required Directories Exist ---
try {
  console.log(`Checking/creating directory: ${uploadsDir}`);
  if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir); console.log(`Created directory: ${uploadsDir}`); }
  console.log(`Checking/creating directory: ${pdfsDir}`);
  if (!fs.existsSync(pdfsDir)) { fs.mkdirSync(pdfsDir); console.log(`Created directory: ${pdfsDir}`); }
  console.log("Required directories verified/created successfully.");
} catch (dirError) {
  console.error("FATAL ERROR: Could not create required directories (uploads/ or pdfs/).", dirError);
  process.exit(1); // Exit if we can't create essential folders
}

// --- Core Middleware (Order Matters) ---
console.log("Applying core middleware...");
// Enable All CORS Requests for development, restrict in production if needed
app.use(cors()); console.log("CORS middleware applied.");
// Basic security headers
app.use(helmet()); console.log("Helmet middleware applied.");
// Logging HTTP requests
app.use(morgan('dev')); console.log("Morgan middleware applied.");
// Body parsing for JSON (though not strictly needed for file upload route, good practice)
app.use(express.json()); console.log("express.json middleware applied.");
// Basic rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter); console.log("Rate limiter middleware applied.");

// --- Static File Serving ---
// Serve the generated PDFs statically from the /pdfs URL path
console.log(`Serving static files from ${pdfsDir} at /pdfs`);
app.use('/pdfs', express.static(pdfsDir));

// --- API Routes ---
console.log("Mounting API routes...");
// Mount the conversion routes under the /api/convert prefix
app.use('/api/convert', convertRoutes);
console.log("Mounted /api/convert routes.");

// --- Health Check Route ---
console.log("Defining /api/health route...");
app.get('/api/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/health`);
  res.status(200).json({
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
console.log("/api/health route defined.");

// --- 404 Handler ---
// This MUST come AFTER all valid route definitions
console.log("Defining 404 handler...");
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  error.status = 404;
  console.log(`[${new Date().toISOString()}] 404 Not Found: ${req.method} ${req.originalUrl}`);
  next(error); // Pass the error to the global error handler
});
console.log("404 handler defined.");

// --- Global Error Handler ---
// This should generally be the LAST app.use() call
console.log("Defining global error handler...");
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Global Error Handler Caught: ${err.status || 500} ${err.message}`, err.stack);

  // If headers have already been sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      // Optionally include stack trace in development
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});
console.log("Global error handler defined.");

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
  process.exit(1);
}
console.log("Attempting to connect to MongoDB...");
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully.');

    // --- Start Server ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server listening successfully on port ${PORT}`);
    });

  })
  .catch((err) => {
    console.error('FATAL ERROR: MongoDB Connection Failed.', err.message);
    process.exit(1); // Exit if DB connection fails
  });

// --- Export App (Optional - useful for testing, not needed for basic running) ---
// module.exports = app;
console.log("Server setup complete. Attempting to start listening...");