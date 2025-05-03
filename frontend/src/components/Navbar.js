import { Link } from 'react-router-dom';
const Navbar = () => {
    return (
      <nav className="navbar">
        <div className="container navbar-container">
          <Link to="/" className="navbar-logo">
            <i className="fas fa-file-pdf"></i> Image2PDF
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <a 
              href="https://github.com/dev-ploy/image-to-pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="nav-link"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>
    );
  };
  
  export default Navbar;
  