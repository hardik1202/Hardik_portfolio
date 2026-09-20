function Header({ name }) {
  return (
    <header className="site-header">
      <span className="header-badge"><span aria-hidden="true">✦</span> STUDENT PORTFOLIO / 2026</span>
      <h1>
        {name}
        <span className="header-accent-dot">.</span>
      </h1>
      <p className="header-subtitle">Web developer in training, turning small ideas into useful digital experiences.</p>
    </header>
  );
}

export default Header;
