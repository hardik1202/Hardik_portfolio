import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { setToken } from "../auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { token } = await login(email, password);
      setToken(token);
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="section-card">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          className="contact-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <br />
        <input
          type="password"
          className="contact-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <br />
        <button className="tip-btn" type="submit">
          Log In
        </button>
      </form>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      <p style={{ marginTop: "12px" }}>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

export default Login;
