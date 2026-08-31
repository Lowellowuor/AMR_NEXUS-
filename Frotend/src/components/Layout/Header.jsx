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
    <header className="sticky top-0 z-30 px-4 sm:px-6 pt-4">
      <div className="mx-auto bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <SearchBar ref={searchInputRef} onFocus={focusSearch} />
            <Breadcrumbs />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onToggleDark}
              className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={onToggleRole}
              className="p-2 rounded-full text-teal-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
              aria-label="Toggle view"
              title={`Switch to ${isNational ? 'County' : 'National'} view`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:inline">
                {isNational ? 'County' : 'National'}
              </span>
            </button>

            {!isNational && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <label className="text-xs font-medium text-slate-500">County:</label>
                {countiesLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : counties.length > 0 ? (
                  <select
                    value={selectedCounty}
                    onChange={(e) => onCountyChange(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-medium text-slate-900 cursor-pointer"
                  >
                    {counties.map((county) => (
                      <option key={county.code} value={county.code}>
                        {county.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400">No counties available</span>
                )}
              </div>
            )}

            <OfflineIndicator />
            <RecentActivity />
            <KeyboardShortcuts onFocusSearch={focusSearch} />
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}