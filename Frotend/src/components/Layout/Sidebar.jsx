import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  Cog6ToothIcon,
  BeakerIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const commonLinks = [
  { name: 'Predict', href: '/predict', icon: BeakerIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'History', href: '/history', icon: ClockIcon },
  { name: 'Alerts', href: '/alerts', icon: BellIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'Compare', href: '/compare', icon: ArrowPathIcon },
  { name: 'Pathogen Explorer', href: '/pathogen-explorer', icon: MagnifyingGlassIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ role = 'national', mobile = false, onNavigate }) {
  const dashboardLink = {
    name: role === 'national' ? 'Dashboard' : 'County Overview',
    href: '/dashboard',
    icon: HomeIcon,
  };

  const navigation = [dashboardLink, ...commonLinks];

  const linkClasses = ({ isActive }) =>
    `group flex items-center px-4 py-2.5 mx-2 my-1 text-sm font-medium rounded-full transition-all duration-200 ease-out ${
      isActive
        ? 'bg-teal-50 text-teal-700 shadow-sm'
        : 'text-slate-600 hover:bg-white/60 hover:shadow-sm hover:text-slate-900'
    }`;

  const iconClasses = ({ isActive }) =>
    `mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
      isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
    }`;

  const handleClick = () => {
    if (mobile && onNavigate) onNavigate();
  };

  return (
    <div className="h-full bg-white/80 backdrop-blur-2xl border border-slate-200/50 rounded-2xl overflow-hidden shadow-xl">
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={linkClasses}
            onClick={handleClick}
            end={item.href === '/dashboard'}
          >
            {({ isActive }) => (
              <>
                <item.icon className={iconClasses({ isActive })} aria-hidden="true" />
                <span className="tracking-wide font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}