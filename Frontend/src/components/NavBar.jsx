import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { isLoggedIn, clearToken } from "../auth";

function NavBar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearToken();
    setMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <NavLink className="brand-mark" to="/" aria-label="Hardik home">
        H<span>.</span>
      </NavLink>
      <button
        className="nav-menu-btn"
        type="button"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
      >
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
      </button>
      <div className={`nav-links primary-links ${menuOpen ? "is-open" : ""}`} id="primary-navigation">
        <NavLink className="nav-link" to="/" end onClick={closeMenu}>Home</NavLink>
        <NavLink className="nav-link" to="/projects" onClick={closeMenu}>Projects</NavLink>
        <NavLink className="nav-link" to="/contact" onClick={closeMenu}>Contact</NavLink>
        <NavLink className="nav-link" to="/tasks" onClick={closeMenu}>Tasks</NavLink>
      </div>
      <div className="nav-links">
        {loggedIn ? (
          <button
            className="nav-link"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : (
          <NavLink className="nav-link nav-login" to="/login" onClick={closeMenu}>Login</NavLink>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
