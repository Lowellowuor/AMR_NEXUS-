import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto px-4 sm:px-6 pb-4">
      {/* Floating footer card â€“ same style as header */}
      <div className="mx-auto bg-[var(--bg-secondary)]/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left: Brand & Copyright */}
            <div className="text-sm text-[var(--text-muted)]">
              Â© {currentYear} AMRâ€‘Nexus One Health. All rights reserved.
            </div>

            {/* Center: Quick links â€“ pill shaped */}
            <div className="flex flex-wrap justify-center gap-2">
              <Link 
                to="/about" 
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/60 hover:shadow-sm rounded-full transition-all"
              >
                About
              </Link>
              <Link 
                to="/privacy" 
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/60 hover:shadow-sm rounded-full transition-all"
              >
                Privacy
              </Link>
              <Link 
                to="/terms" 
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/60 hover:shadow-sm rounded-full transition-all"
              >
                Terms
              </Link>
              <Link 
                to="/contact" 
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/60 hover:shadow-sm rounded-full transition-all"
              >
                Contact
              </Link>
            </div>

            {/* Right: Version / Status â€“ pill shaped */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)]/40 rounded-full">
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--status-success)] animate-pulse"></span>
              <span className="text-xs text-[var(--text-muted)]">API v1.0 | Model v1.2</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}