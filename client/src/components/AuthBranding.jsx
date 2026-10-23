export default function AuthBranding({
  eyebrow = 'TODOFLOW',
  headlineLead = 'Make space for',
  headlineAccent = 'what matters.',
  copy = 'A calmer way to organize your day, one task at a time.',
}) {
  return (
    <section className="brand-panel" aria-label="TodoFlow Branding">
      <div className="brand-panel-inner">
        {/* Main Branding Block: Logo + Name + Headline + Copy */}
        <div className="brand-main">
          <div className="brand-mark" aria-hidden="true">
            <svg
              className="brand-check-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p className="brand-name">{eyebrow}</p>
          <h1 className="brand-headline">
            {headlineLead}
            <br />
            <em className="brand-accent">{headlineAccent}</em>
          </h1>
          <p className="brand-copy">{copy}</p>
        </div>

        {/* Bottom: Minimal decorative progress indicators (Cream, Orange, Muted Brown) */}
        <div className="brand-bottom" aria-hidden="true">
          <div className="brand-decoration">
            <span className="brand-pill pill-cream" />
            <span className="brand-pill pill-orange" />
            <span className="brand-pill pill-muted" />
          </div>
        </div>
      </div>
    </section>
  )
}
