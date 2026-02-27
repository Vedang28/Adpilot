import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-black text-accent-blue/20 mb-4 select-none">404</p>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Page not found</h1>
        <p className="text-text-secondary mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 btn-primary"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
