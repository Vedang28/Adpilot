import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

export default function DemoLoginPage() {
  const navigate   = useNavigate();
  const { login }  = useAuthStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function startDemo() {
      try {
        const res = await api.post('/auth/demo-login');
        if (cancelled) return;
        const { accessToken, user, team, isDemo } = res.data.data;
        login({ token: accessToken, user: { ...user, isDemo }, team });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError('Demo environment temporarily unavailable.');
        }
      }
    }

    startDemo();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Demo Unavailable</h2>
          <p className="text-sm text-white/50 mb-6">{error}</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600
                       text-white text-sm font-semibold rounded-xl hover:scale-105 transition-transform
                       shadow-lg shadow-blue-500/25"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B14] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600
                        flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Loading your demo...</h2>
        <p className="text-sm text-white/40">Preparing your AdPilot workspace</p>
        <div className="mt-6 flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
