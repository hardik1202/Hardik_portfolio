import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn, clearToken } from "../auth";

function NavBar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link className="nav-link" to="/">Home</Link>
        <Link className="nav-link" to="/projects">Projects</Link>
        <Link className="nav-link" to="/contact">Contact</Link>
        <Link className="nav-link" to="/tasks">Tasks</Link>
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
          <Link className="nav-link" to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
