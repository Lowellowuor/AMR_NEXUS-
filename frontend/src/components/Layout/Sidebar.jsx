import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  Cog6ToothIcon,
  BeakerIcon,
  DocumentChartBarIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  UsersIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ role = 'national', mobile = false, onNavigate }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const dashboardLink = {
    name: role === 'national' ? 'Dashboard' : 'County Overview',
    href: '/',
    icon: HomeIcon,
  };

  const sections = [
    {
      items: [dashboardLink],
    },
    {
      label: 'Clinical',
      items: [
        { name: 'Predict', href: '/predict', icon: BeakerIcon },
        { name: 'History', href: '/history', icon: ClockIcon },
        { name: 'Pathogen Explorer', href: '/pathogen-explorer', icon: MagnifyingGlassIcon },
      ],
    },
    {
      label: 'Response',
      items: [
        { name: 'Alerts', href: '/alerts', icon: BellIcon },
        { name: 'Actions', href: '/actions', icon: ClipboardDocumentListIcon },
        { name: 'Alert Routing', href: '/role-routing', icon: ShieldCheckIcon },
      ],
    },
    {
      label: 'One Health',
      items: [
        { name: 'One Health Overview', href: '/one-health', icon: GlobeAltIcon },
        { name: 'Antimicrobial Use', href: '/amu', icon: BeakerIcon },
        { name: 'Sampling Sites', href: '/sampling-sites', icon: MapPinIcon },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
        { name: 'EWS Forecast', href: '/ews-forecast', icon: ChartBarIcon },
        { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: 'Administration',
            items: [
              { name: 'Users', href: '/admin/users', icon: UsersIcon },
              { name: 'Audit Log', href: '/admin/audit', icon: ShieldExclamationIcon },
            ],
          },
        ]
      : []),
  ];

  const linkClasses = ({ isActive }) =>
    `group flex items-center gap-3 px-4 py-2 mx-2 text-sm font-medium rounded-full transition-all duration-200 ease-out ${
      isActive
        ? 'bg-[var(--bg-secondary)] shadow-md ring-1 ring-primary-100/50 text-[var(--accent-teal)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/60 hover:shadow-sm hover:text-[var(--text-primary)]'
    }`;

  const iconClasses = ({ isActive }) =>
    `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
      isActive
        ? 'text-[var(--accent-teal)]'
        : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
    }`;

  const handleClick = () => {
    if (mobile && onNavigate) onNavigate();
  };

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {sections.map((section, idx) => (
        <div key={section.label ?? `section-${idx}`} className="space-y-0.5">
          {section.label && (
            <p className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]/70 select-none">
              {section.label}
            </p>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={linkClasses}
              onClick={handleClick}
              end={item.href === '/'}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={iconClasses({ isActive })} aria-hidden="true" />
                  <span className="tracking-wide font-medium truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="pt-3 mt-3 border-t border-[var(--border-primary)]/40 space-y-0.5">
        <NavLink
          to="/activity"
          className={linkClasses}
          onClick={handleClick}
        >
          {({ isActive }) => (
            <>
              <ClockIcon className={iconClasses({ isActive })} aria-hidden="true" />
              <span className="tracking-wide font-medium">My Activity</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/settings"
          className={linkClasses}
          onClick={handleClick}
        >
          {({ isActive }) => (
            <>
              <Cog6ToothIcon className={iconClasses({ isActive })} aria-hidden="true" />
              <span className="tracking-wide font-medium">Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}