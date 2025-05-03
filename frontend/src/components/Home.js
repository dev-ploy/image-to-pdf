import React, { useState, useRef } from 'react'; // Added useRef
import { toast } from 'react-toastify';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [selectedFile, setSelectedFile] = useState(null); // Renamed for clarity
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Added error state
  // Store PDF filename or path for download link
  const [pdfFilename, setPdfFilename] = useState(null);
  const fileInputRef = useRef(null); // Ref for clearing file input

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    // Reset state if no file is selected
    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      setPdfFilename(null); // Clear previous results
      setError(null);
      return;
    }

    // Basic client-side validation (backend also validates)
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please select a JPG or PNG image.');
      // Clear the invalid file selection
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setSelectedFile(file);
    setError(null); // Clear previous errors
    setPdfFilename(null); // Clear previous results

    // Create image preview
    const reader = new FileReader();
    reader.onloadend = () => { // Use onloadend for completion
      setPreview(reader.result);
    };
    reader.onerror = () => { // Handle reader errors
        console.error("FileReader error");
        toast.error("Error reading file preview.");
        setPreview(null);
    }
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    if (!selectedFile) {
      toast.error('Please select an image file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setPdfFilename(null); // Reset previous results

    const formData = new FormData();
    // Ensure the key matches what multer expects on the backend ('image')
    formData.append('image', selectedFile);

    // Construct the correct API URL from environment variable
    const apiUrl = process.env.REACT_APP_API_URL;
    // The backend route is POST /api/convert
    const uploadUrl = `${apiUrl}/api/convert`;

    console.log('Uploading to URL:', uploadUrl); // Log the URL for debugging

    try {
      const response = await axios.post(uploadUrl, formData, {
        // Axios typically sets multipart/form-data automatically for FormData,
        // but explicitly setting it can sometimes help.
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Optional: Add timeout
        // timeout: 30000, // 30 seconds
      });

      console.log('Upload successful:', response.data);
      toast.success(response.data.message || 'Image successfully converted!');

      // Store the filename received from the backend response
      if (response.data.pdfFilename) {
        setPdfFilename(response.data.pdfFilename);
      } else {
          console.warn("Backend did not return a pdfFilename in the response.");
          // Optionally try pdfPath if backend sends that instead
          // if (response.data.pdfPath) setPdfFilename(response.data.pdfPath.split('/').pop());
      }

      // Clear file input and preview after successful upload
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }

    } catch (err) {
      console.error('Upload error:', err); // Log the full error
      // Extract meaningful error message
      let message = 'Error uploading image.'; // Default message
      if (err.response) {
        // Server responded with a status code outside 2xx range
        message = err.response.data?.error?.message || err.response.data?.message || `Server Error: ${err.response.status}`;
        console.error('Server Response Data:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        message = 'No response from server. Please check network connection or server status.';
        console.error('No response received:', err.request);
      } else {
        // Something happened in setting up the request
        message = err.message;
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Function to construct download URL and trigger download
  const handleDownload = () => {
    if (!pdfFilename) {
        toast.error("No PDF filename available for download.");
        return;
    };

    // Construct the download URL using the backend API endpoint
    const apiUrl = process.env.REACT_APP_API_URL;
    // The backend download route is GET /api/convert/download/:filename
    const downloadUrl = `${apiUrl}/api/convert/download/${pdfFilename}`;

    console.log('Attempting download from URL:', downloadUrl);

    // Option 1: Direct navigation (simplest, works well if backend sets Content-Disposition)
    window.location.href = downloadUrl;

    // Option 2: Fetch and create blob (more control, handles errors better, but more complex)
    /*
    axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'blob', // Important
    }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', pdfFilename); // Set the filename for download
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link); // Clean up
        window.URL.revokeObjectURL(url); // Free up memory
        toast.success("Download started.");
    }).catch((error) => {
        console.error('Download error:', error);
        const message = error.response?.data?.error?.message || error.message || 'Error downloading PDF.';
        toast.error(message);
    });
    */
  };

  return (
    <div className="home-container">
      <div className="converter-card">
        <h1>Image to PDF Converter</h1>
        <p>Upload a JPG or PNG image and convert it to a downloadable PDF file.</p>

        <form onSubmit={handleSubmit}>
          <div className="file-input-container">
            <label htmlFor="imageUpload" className="file-input-label">
              {selectedFile ? selectedFile.name : 'Choose Image'}
            </label>
            <input
              ref={fileInputRef} // Assign ref
              type="file"
              id="imageUpload"
              onChange={handleFileChange}
              accept="image/jpeg, image/png" // Be specific with accept types
              className="file-input"
              aria-label="Image Upload"
            />
          </div>

          {preview && (
            <div className="image-preview">
              <img src={preview} alt="Selected file preview" />
            </div>
          )}

          {error && ( // Display error message
            <p className="error-message">{error}</p>
          )}

          <button
            type="submit"
            className="convert-button"
            disabled={!selectedFile || loading} // Disable if no file or loading
            aria-busy={loading}
          >
            {loading ? 'Converting...' : 'Convert to PDF'}
          </button>
        </form>

        {pdfFilename && !loading && ( // Show download button only if filename exists and not loading
          <button
            onClick={handleDownload}
            className="download-button"
            aria-label="Download Converted PDF"
          >
            Download PDF ({pdfFilename})
          </button>
        )}
      </div>

      <div className="instructions">
        <h2>How it works</h2>
        <ol>
          <li>Click "Choose Image" to select a JPG or PNG file.</li>
          <li>Click the "Convert to PDF" button.</li>
          <li>Once converted, click the "Download PDF" button.</li>
        </ol>
      </div>
    </div>
  );
};

export default Home;