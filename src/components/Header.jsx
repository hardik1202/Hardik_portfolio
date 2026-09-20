function Header({ name, themeColor }) {
  return (
    <header className="site-header">
      <span className="header-badge">✦ STUDENT PORTFOLIO</span>
      <h1>
        {name}
        <span className="header-accent-dot">.</span>
      </h1>
      <p className="header-subtitle">Web Developer in training — building with React &amp; Node</p>
    </header>
  );
}

export default Header;
