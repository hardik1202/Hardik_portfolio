import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";

function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRepos = () => {
    setLoading(true);
    setError(null);

    fetch("https://api.github.com/users/hardik1202/repos?sort=updated")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setRepos(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchRepos} />;

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="section-card">
      <h2>My Projects</h2>

      <input
        type="text"
        className="contact-input"
        placeholder="Search repositories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ul className="projects-list">
        {filteredRepos.length === 0 ? (
          <p>No repositories match "{searchTerm}".</p>
        ) : (
          filteredRepos.map((repo) => (
            <li key={repo.id}>
              <strong>{repo.name}</strong>: {" "}
              <a href={repo.html_url} target="_blank" rel="noreferrer">
                {repo.html_url}
              </a>
              <span className="star-count"> ⭐ {repo.stargazers_count}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default Projects;