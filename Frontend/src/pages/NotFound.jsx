import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section style={{ padding: "20px", textAlign: "center" }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Go back Home</Link>
    </section>
  );
}

export default NotFound;