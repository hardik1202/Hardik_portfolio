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
    <section className="page-section projects-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Selected work</p>
          <h2>Things I&apos;ve built</h2>
        </div>
        <p className="section-description">A living collection of experiments, exercises, and useful little systems.</p>
      </div>

      <input
        type="text"
        className="contact-input"
        placeholder="Search repositories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ul className="projects-list project-grid">
        {filteredRepos.length === 0 ? (
          <p>No repositories match "{searchTerm}".</p>
        ) : (
          filteredRepos.map((repo) => (
            <li key={repo.id} className="project-card">
              <div className="project-card-top"><span className="project-index">0{filteredRepos.indexOf(repo) + 1}</span><span className="star-count">★ {repo.stargazers_count}</span></div>
              <strong>{repo.name}</strong>
              <p>{repo.description || "A project built while learning and experimenting with the web."}</p>
              <a className="project-link" href={repo.html_url} target="_blank" rel="noreferrer">
                View repository <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default Projects;