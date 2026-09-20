import { useState } from "react";
import Header from "../components/Header";
import About from "../components/About";
import Skills from "../components/Skills";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

function Home() {
  const [showTip, setShowTip] = useState(false);
  const skills = ["HTML", "CSS", "JavaScript", "React", "Vite"];

  return (
    <>
      <Header name="Hardik" themeColor="teal" />
      <section className="home-intro">
        <div className="intro-copy">
          <p className="eyebrow">Available for learning, building, and collaborating</p>
          <h2>Interfaces with a little more <em>intention.</em></h2>
          <p className="intro-text">I build thoughtful web experiences while growing with React, JavaScript, and Node.</p>
          <div className="intro-actions">
            <Link className="primary-action" to="/projects">Explore projects <span aria-hidden="true">↗</span></Link>
            <Link className="text-action" to="/contact">Say hello <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="intro-orbit" aria-hidden="true">
          <span className="orbit-label orbit-label-one">React</span>
          <span className="orbit-label orbit-label-two">Curious</span>
          <span className="orbit-label orbit-label-three">Build / learn</span>
          <div className="orbit-core"><span>H.</span></div>
        </div>
      </section>
      <div className="home-grid">
        <div className="section-card about-card">
          <About name="Hardik" />
          <button className="tip-btn" onClick={() => setShowTip(!showTip)}>
            {showTip ? "Hide note" : "A small note"}
          </button>
          {showTip && <p className="tip-text">Start with the Projects page, then come say hello.</p>}
        </div>
        <aside className="quick-card">
          <p className="eyebrow">Currently exploring</p>
          <strong>Accessible UI, useful interactions, and the details between.</strong>
          <div className="stat-row"><span>05</span><small>core skills</small></div>
        </aside>
      </div>
      <Skills skillList={skills} />
      <Footer />
    </>
  );
}

export default Home;