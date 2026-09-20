import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";
import Home from "./pages/Home";
const Projects = lazy(() => import("./pages/Projects"));
const Contact = lazy(() => import("./pages/Contact"));
import Tasks from "./pages/Tasks";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("portfolio-theme");
    return savedMode ? savedMode === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("portfolio-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className={`app-container ${darkMode ? "dark" : "light"}`}>
      <NavBar />
      <div className="mode-toggle-wrap">
        <button
          className="mode-toggle-btn"
          onClick={() => setDarkMode((currentMode) => !currentMode)}
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          aria-pressed={darkMode}
        >
          <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <main className="page-content">
        <Suspense fallback={<Spinner />}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
