import { Bell, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/ads': 'Ad Studio',
  '/research': 'Research Hub',
  '/seo': 'SEO Intelligence',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const title = routeTitles[location.pathname] || 'AdPilot';

  return (
    <header className="h-16 border-b border-border bg-bg-secondary flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-blue rounded-full" />
        </button>

        {/* Role badge */}
        {user?.role && (
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold capitalize">
            {user.role}
          </span>
        )}
      </div>
    </header>
  );
}
