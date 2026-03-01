import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Search, Facebook, Chrome, Target, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

const CHALLENGES = [
  { id: 'waste',      label: 'Reducing wasted ad spend' },
  { id: 'creative',  label: 'Generating better creatives' },
  { id: 'monitor',   label: 'Monitoring campaign performance' },
  { id: 'compete',   label: 'Beating competitors' },
];

const PLATFORMS = [
  { id: 'Meta',   label: 'Meta Ads',    icon: Facebook, color: 'blue' },
  { id: 'Google', label: 'Google Ads',  icon: Chrome,   color: 'green' },
  { id: 'Both',   label: 'Both',        icon: Target,   color: 'purple' },
];

export default function OnboardingPage() {
  const navigate    = useNavigate();
  const { user, setAuth, token, team } = useAuthStore();

  const [step,        setStep]        = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [challenge,   setChallenge]   = useState('');
  const [platforms,   setPlatforms]   = useState([]);
  const [websiteUrl,  setWebsiteUrl]  = useState('');

  const completeMutation = useMutation({
    mutationFn: (data) => api.post('/users/me/onboarding-complete', data),
    onSuccess: () => {
      // Mark onboarding complete in store
      setAuth({ ...user, onboardingCompleted: true }, token, team);
    },
  });

  function togglePlatform(id) {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleRunAudit() {
    completeMutation.mutate({ companyName });
    const url = websiteUrl.trim();
    if (url) {
      navigate(`/seo?url=${encodeURIComponent(url)}&autorun=true`);
    } else {
      navigate('/dashboard');
    }
  }

  function completeOnboarding() {
    completeMutation.mutate({ companyName });
    navigate('/dashboard');
  }

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5 fixed top-0 left-0 right-0 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className={`rounded-full transition-all duration-300 ${
                  n === step
                    ? 'w-6 h-2 bg-blue-500'
                    : n < step
                    ? 'w-2 h-2 bg-blue-500/50'
                    : 'w-2 h-2 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600
                              flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome to AdPilot{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-white/50 mb-8">Let's set up your workspace in 2 minutes.</p>

              <div className="text-left space-y-5">
                <div>
                  <label className="block text-sm text-white/60 mb-2">What's your company name?</label>
                  <input
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl
                               text-white placeholder-white/30 focus:outline-none focus:ring-2
                               focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="Acme Marketing"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">What's your biggest ad challenge?</label>
                  <div className="space-y-2">
                    {CHALLENGES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setChallenge(c.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          challenge === c.id
                            ? 'border-blue-500/50 bg-blue-500/[0.08] text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/[0.12] hover:text-white/80'
                        }`}
                      >
                        <span className="text-sm">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-8 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white
                           font-semibold rounded-xl hover:scale-[1.02] transition-transform shadow-lg
                           shadow-blue-500/20"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Platforms ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Which platforms are you running ads on?</h2>
              <p className="text-white/50 mb-8">Select all that apply. You can connect them later.</p>

              <div className="space-y-3 mb-8">
                {PLATFORMS.map(({ id, label, icon: Icon, color }) => {
                  const selected = platforms.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => togglePlatform(id)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                        selected
                          ? 'border-blue-500/50 bg-blue-500/[0.08]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                       bg-${color}-500/10`}>
                        <Icon className={`w-5 h-5 text-${color}-400`} />
                      </div>
                      <span className="text-sm font-medium text-white">{label}</span>
                      {selected && <CheckCircle className="w-4 h-4 text-blue-400 ml-auto" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-white/30 mb-6">We'll remind you to connect when you're ready.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-white/[0.08] text-white/50 rounded-xl
                             hover:bg-white/[0.04] transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white
                             font-semibold rounded-xl hover:scale-[1.02] transition-transform text-sm"
                >
                  Continue →
                </button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full mt-3 text-sm text-white/30 hover:text-white/50 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ── Step 3: First Audit ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center
                              mx-auto mb-6">
                <Search className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Let AdPilot scan your website</h2>
              <p className="text-white/50 mb-8">See what's hurting your SEO in 60 seconds. Free.</p>

              <input
                className="w-full px-4 py-4 text-lg bg-white/[0.04] border border-white/[0.08] rounded-xl
                           text-white placeholder-white/30 focus:outline-none focus:ring-2
                           focus:ring-blue-500/50 focus:border-blue-500/50 transition-all mb-4"
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRunAudit()}
              />

              <button
                onClick={handleRunAudit}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white
                           font-semibold rounded-xl hover:scale-[1.02] transition-transform shadow-lg
                           shadow-blue-500/20 flex items-center justify-center gap-2 text-base"
              >
                <Search className="w-5 h-5" />
                Scan My Website
              </button>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-white/[0.08] text-white/50 rounded-xl
                             hover:bg-white/[0.04] transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={completeOnboarding}
                  className="flex-1 py-3 text-sm text-white/30 hover:text-white/50 transition-colors"
                >
                  Skip — go to dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Celebration ──────────────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Your workspace is ready!</h2>
              <p className="text-white/50 mb-8">Here's what to do first:</p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: 'Run SEO Audit', path: '/seo',       color: 'blue',   icon: Search },
                  { label: 'Create Campaign', path: '/campaigns', color: 'purple', icon: Zap },
                  { label: 'Generate Ads',  path: '/ads',        color: 'green',  icon: Target },
                ].map(({ label, path, color, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => { completeMutation.mutate({ companyName }); navigate(path); }}
                    className={`p-4 bg-${color}-500/[0.06] border border-${color}-500/20 rounded-xl
                                hover:bg-${color}-500/10 transition-all text-center group`}
                  >
                    <Icon className={`w-6 h-6 text-${color}-400 mx-auto mb-2`} />
                    <span className="text-xs font-medium text-white/70 group-hover:text-white/90 transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={completeOnboarding}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white
                           font-semibold rounded-xl hover:scale-[1.02] transition-transform"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
