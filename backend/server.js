const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// --- Early Exit if Essential Env Vars Missing ---
if (!process.env.MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI is not defined in .env file.");
    process.exit(1);
}

// --- Import Routes ---
let convertRoutes;
try {
    console.log("Attempting to require('./routes/convert')...");
    convertRoutes = require('./routes/convert'); // Make sure this uses the file saved in Step 1
    console.log("Successfully required('./routes/convert'). Type:", typeof convertRoutes);
    if (typeof convertRoutes !== 'function') {
        console.error("FATAL ERROR: Required './routes/convert' did not export a function (Express Router expected).");
        process.exit(1);
    }
} catch (routeError) {
    console.error("FATAL ERROR: Failed to require './routes/convert'. Check the file for syntax errors.", routeError);
    process.exit(1);
}


// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;
console.log(`Attempting to run server on port: ${PORT}`);

// --- Ensure Required Directories Exist ---
const uploadsDir = path.join(__dirname, 'uploads');
const pdfsDir = path.join(__dirname, 'pdfs');
try {
    console.log(`Checking/creating directory: ${uploadsDir}`);
    if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir); console.log(`Created directory: ${uploadsDir}`); }
    console.log(`Checking/creating directory: ${pdfsDir}`);
    if (!fs.existsSync(pdfsDir)) { fs.mkdirSync(pdfsDir); console.log(`Created directory: ${pdfsDir}`); }
    console.log("Required directories verified/created successfully.");
} catch (dirError) {
    console.error("FATAL ERROR: Could not create required directories ('uploads', 'pdfs'). Check permissions.", dirError);
    process.exit(1);
}

// --- Core Middleware (Order Matters) ---
console.log("Applying core middleware...");
app.use(cors()); console.log("CORS applied.");
app.use(helmet()); console.log("Helmet applied.");
app.use(express.json()); console.log("JSON parser applied.");
app.use(express.urlencoded({ extended: true })); console.log("URL-encoded parser applied.");
app.use(morgan('dev')); console.log("Morgan logging applied.");

// --- Rate Limiting ---
console.log("Applying rate limiting...");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' });
app.use('/api/', limiter); console.log("Rate limiting applied to /api/.");

// --- Static File Serving ---
console.log(`Serving static files from ${pdfsDir} at /pdfs`);
app.use('/pdfs', express.static(pdfsDir));

// --- API Routes ---
console.log("Mounting API routes...");
app.use('/api/convert', convertRoutes); // Mount the conversion routes from Step 1
console.log("Mounted /api/convert routes.");

// --- Health Check Route ---
console.log("Defining /api/health route...");
app.get('/api/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/health`);
  res.status(200).json({ status: 'Server is running', timestamp: new Date().toISOString() });
});
console.log("/api/health route defined.");

// --- 404 Handler ---
console.log("Applying 404 handler...");
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 404 Not Found: ${req.method} ${req.originalUrl}`);
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});
console.log("404 handler applied.");

// --- Global Error Handler ---
console.log("Applying global error handler...");
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Global Error Handler Caught:`, err.status || 500, err.message);
  console.error(err.stack || err); // Log stack trace
  if (res.headersSent) { return next(err); }
  const statusCode = err.status || 500;
  res.status(statusCode).json({ error: { message: err.message || 'Internal Server Error', status: statusCode } });
});
console.log("Global error handler applied.");

// --- MongoDB Connection & Server Start ---
console.log("Attempting to connect to MongoDB...");
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`-----------------------------------------`);
      console.log(`Server listening successfully on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`-----------------------------------------`);
    }).on('error', (serverErr) => {
        console.error(`FATAL ERROR: Failed to start server on port ${PORT}.`, serverErr);
        process.exit(1);
    });
  })
  .catch((err) => {
    console.error('FATAL ERROR: MongoDB Connection Failed. Server not started.', err.message);
    process.exit(1);
  });

console.log("Server setup initiated. Waiting for MongoDB connection and server start...");