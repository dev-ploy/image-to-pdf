Image to PDF Converter


Image to PDF Converter is a robust and user-friendly MERN stack application designed to convert images into downloadable PDF files. The application offers a seamless experience for users, enabling quick and secure image-to-PDF conversion.

🌟 Features

1.Multiple Image Upload: Upload and process multiple images at once.
2.Drag-and-Drop Support: Easily drag and drop images for uploading.
3.PDF Generation: Convert all uploaded images into a single downloadable PDF.
4.Preview Functionality: Preview uploaded images before conversion.

🛠️ Tech Stack

Frontend: React.js, HTML, CSS
Backend: Node.js, Express.js
Database: MongoDB
Styling: CSS for a sleek and modern interface

🚀 How It Works

Upload Images: Select images to upload or drag and drop them into the uploader.
Preview: View uploaded images before generating the PDF.
Convert: Click the convert button to generate a single PDF.
Download: Download the generated PDF directly to your device.

📂 Folder Structure

image-to-pdf/
├── client/             # React frontend
│   ├── public/         # Static assets
│   ├── src/            # React components and pages
├── server/             # Node.js backend
│   ├── models/         # Database schemas
│   ├── routes/         # API endpoints
│   ├── controllers/    # Business logic
├── .env                # Environment variables
├── package.json        # Backend dependencies
├── README.md           # Project documentation


📦 Installation and Setup
Prerequisites
Node.js and npm installed
MongoDB instance (local or cloud)
Steps to Run Locally
Clone the Repository:

git clone https://github.com/dev-ploy/image-to-pdf.git
cd image-to-pdf

Install Backend Dependencies:
npm install

Install Frontend Dependencies:

cd client
npm install
cd ..

Configure Environment Variables: Create a .env file in the root directory and add:

MONGO_URI=your_mongodb_connection_string
PORT=5000

Run the Application:

Start the backend:
npm run server
Start the frontend:
cd client
npm start

Access the Application: Open your browser 
navigate to http://localhost:3000.

📖 API Endpoints
Image Management
POST /api/upload - Upload images to the server.
GET /api/download/:id - Download the generated PDF.
DELETE /api/delete/:id - Delete uploaded images.

🤝 Contribution Guidelines

Fork the Repository: Click the "Fork" button on the top right.
Create a New Branch:
git checkout -b feature/your-feature-name
Commit Your Changes:
git commit -m "Add your feature"
Push to Your Branch:
git push origin feature/your-feature-name

Open a Pull Request: Submit your pull request for review.


📝 License
This project is licensed under the MIT License. See the LICENSE file for details.

👨‍💻 Authors and Acknowledgments
Author: dev-ploy

deployed website is:- https://image-to-pdf-frontend1.vercel.app/











