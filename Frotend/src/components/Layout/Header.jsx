import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  UserCircleIcon, 
  MoonIcon, 
  SunIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../../stores/themeStore';

export default function Header({ onMenuClick }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-20 px-4 sm:px-6 pt-4">
      {/* Floating header card – same glassmorphic style as sidebar */}
      <div className="mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button – pill shape */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-full text-gray-500 hover:bg-white/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search bar – pill shape, floating feel */}
            <div className="hidden sm:block relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients, isolates, reports..."
                className="pl-9 pr-4 py-2 w-80 rounded-full border-0 bg-gray-100/70 focus:bg-white focus:ring-2 focus:ring-primary-500/30 text-sm transition-all"
              />
            </div>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="sm:hidden p-2 rounded-full text-gray-500 hover:bg-white/60"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Right section – all pill shaped */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-white/60 hover:shadow-sm transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-full text-gray-500 hover:bg-white/60 hover:shadow-sm transition-all">
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/60 hover:shadow-sm transition-all"
                aria-label="User menu"
              >
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <span className="hidden md:inline text-sm font-medium text-gray-700">John Doe</span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">John Doe</p>
                      <p className="text-xs text-gray-500 truncate">john.doe@amrnexus.org</p>
                    </div>
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 text-gray-400" />
                      Profile
                    </Link>
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                      Settings
                    </Link>
                    <hr className="my-1" />
                    <button 
                      className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Add logout logic here
                      }}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search expanded */}
        {searchOpen && (
          <div className="sm:hidden p-3 border-t border-gray-100/50">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 w-full rounded-full border-0 bg-gray-100/70 focus:bg-white focus:ring-2 focus:ring-primary-500/30 text-sm"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}