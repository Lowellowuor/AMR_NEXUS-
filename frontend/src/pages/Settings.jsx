import { useState } from 'react';
import { User, Lock, Bell, Shield, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

import ProfileSection from '../components/settings/ProfileSection';
import SecuritySection from '../components/settings/SecuritySection';
import NotificationsSection from '../components/settings/NotificationsSection';
import PrivacySection from '../components/settings/PrivacySection';
import ActivitySection from '../components/settings/ActivitySection';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  { id: 'activity', label: 'My Activity', icon: Activity },
];

export default function Settings() {
  usePageTitle('Settings');
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Account, security, and data preferences
        </p>
      </div>

      <div className="border-b border-[var(--border-primary)]">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                  isActive
                    ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {tab === 'profile' && <ProfileSection user={user} />}
        {tab === 'security' && <SecuritySection />}
        {tab === 'notifications' && <NotificationsSection />}
        {tab === 'privacy' && <PrivacySection />}
        {tab === 'activity' && <ActivitySection />}
      </div>
    </div>
  );
}
