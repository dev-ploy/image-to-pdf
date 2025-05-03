import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p>
          &copy; {new Date().getFullYear()} Image2PDF Converter | 
          Built with MERN Stack
        </p>
      </div>
    </footer>
  );
};

export default Footer;