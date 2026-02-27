import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: (res) => {
      const { user, accessToken, team } = res.data.data;
      setAuth(user, accessToken, team || null);
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(form);
  };

  const errMsg = loginMutation.error?.response?.data?.error?.message;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-text-primary">AdPilot</span>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-1">Welcome back</h2>
          <p className="text-text-secondary text-sm mb-6">Sign in to your account</p>

          {errMsg && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full mt-2"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-text-secondary text-sm mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-blue hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-bg-card border border-border rounded-lg px-4 py-3 text-xs text-text-secondary">
          <p className="font-medium text-text-primary mb-1">Demo credentials</p>
          <p>admin@adpilot.com / password123</p>
        </div>
      </div>
    </div>
  );
}
