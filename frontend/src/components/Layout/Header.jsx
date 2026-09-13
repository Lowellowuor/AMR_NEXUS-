import { useRef } from 'react';
import { Sun, Moon, MapPin, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SearchBar from '../header/SearchBar';
import NotificationsBell from '../header/NotificationsBell';
import UserMenu from '../header/UserMenu';
import Breadcrumbs from '../header/Breadcrumbs';
import OfflineIndicator from '../header/OfflineIndicator';
import KeyboardShortcuts from '../header/KeyboardShortcuts';
import RecentActivity from '../header/RecentActivity';

export default function Header({
  onMenuClick,
  role,
  onToggleRole,
  darkMode,
  onToggleDark,
  counties = [],
  countiesLoading = false,
  selectedCounty,
  onCountyChange,
}) {
  const searchInputRef = useRef(null);
  const { user } = useAuth();

  const focusSearch = () => {
    searchInputRef.current?.querySelector('input')?.focus();
  };

  const isNational = role === 'national';

  return (
    <header className="sticky top-0 z-30 px-2 sm:px-4 md:px-6 pt-2 sm:pt-4">
      <div className="mx-auto bg-[var(--bg-secondary)]/80 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-[var(--border-primary)]">
        <div className="flex flex-wrap items-center justify-between gap-y-2 px-2 sm:px-4 md:px-5 py-2 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-none">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex-shrink-0"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 sm:flex-none min-w-0">
              <SearchBar ref={searchInputRef} onFocus={focusSearch} />
            </div>

            <div className="hidden sm:block flex-shrink-0">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onToggleDark}
              className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={onToggleRole}
              className="p-2 rounded-full text-[var(--accent-teal)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-1"
              aria-label="Toggle view"
              title={`Switch to ${isNational ? 'County' : 'National'} view`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-medium hidden md:inline">
                {isNational ? 'County' : 'National'}
              </span>
            </button>

            {!isNational && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-tertiary)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent-teal)]" />
                <label className="text-xs font-medium text-[var(--text-muted)]">County:</label>
                {countiesLoading ? (
                  <span className="text-xs text-[var(--text-muted)]">Loading...</span>
                ) : counties.length > 0 ? (
                  <select
                    value={selectedCounty}
                    onChange={(e) => onCountyChange(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-medium text-[var(--text-primary)] cursor-pointer w-full max-w-[120px] sm:w-full max-w-[160px]"
                  >
                    {counties.map((county) => (
                      <option key={county.code} value={county.code}>
                        {county.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No counties</span>
                )}
              </div>
            )}

            <OfflineIndicator />
            <div className="hidden md:block">
              <RecentActivity />
            </div>
            <div className="hidden md:block">
              <KeyboardShortcuts onFocusSearch={focusSearch} />
            </div>
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}