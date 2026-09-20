import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, login } from "../api";
import { setToken } from "../auth";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password);
      // Auto-login right after registering, so the user lands straight in /tasks
      const { token } = await login(email, password);
      setToken(token);
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section-card">
      <h2>Register</h2>
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
          minLength={6}
        />
        <br />
        <br />
        <button className="tip-btn" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      <p style={{ marginTop: "12px" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}

export default Register;
