import { useState } from "react";
import Header from "../components/Header";
import About from "../components/About";
import Skills from "../components/Skills";
import Footer from "../components/Footer";

function Home() {
  const [showTip, setShowTip] = useState(false);
  const skills = ["HTML", "CSS", "JavaScript", "React", "Vite"];

  return (
    <>
      <Header name="Hardik" themeColor="teal" />
      <div className="section-card">
        <About name="Hardik" />
        <button className="tip-btn" onClick={() => setShowTip(!showTip)}>
          {showTip ? "Hide Tip" : "Show Tip"}
        </button>
        {showTip && <p className="tip-text">💡 Check out my Projects and Contact pages!</p>}
      </div>
      <Skills skillList={skills} />
      <Footer />
    </>
  );
}

export default Home;