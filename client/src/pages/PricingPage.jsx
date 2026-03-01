import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const PLANS = [
  {
    name:    'Starter',
    price:   { monthly: 49, annual: 39 },
    desc:    'For solo marketers testing AI automation.',
    badge:   null,
    cta:     'Start Free Trial',
    ctaPath: '/register',
    features: [
      '1 ad platform (Meta or Google)',
      '5 active campaigns',
      '3 AI research reports/month',
      '20 AI ad generations/month',
      '50 SEO keywords tracked',
      'Basic automation rules',
      'Email alerts',
    ],
  },
  {
    name:    'Growth',
    price:   { monthly: 149, annual: 119 },
    desc:    'For growing teams and agencies managing multiple campaigns.',
    badge:   'MOST POPULAR',
    cta:     'Get Started Now',
    ctaPath: '/register?plan=growth',
    features: [
      'Everything in Starter',
      'Meta + Google Ads',
      '25 active campaigns',
      '15 AI research reports/month',
      '100 AI ad generations/month',
      '250 SEO keywords tracked',
      'Budget Protection AI',
      'Competitor Intelligence',
      'PDF report export',
    ],
  },
  {
    name:    'Scale',
    price:   { monthly: 299, annual: 239 },
    desc:    'For agencies and enterprises needing unlimited everything.',
    badge:   null,
    cta:     'Contact Sales',
    ctaPath: '/register?plan=scale',
    features: [
      'Everything in Growth',
      'All platforms + TikTok + LinkedIn',
      'Unlimited campaigns',
      'Unlimited AI features',
      'Unlimited SEO tracking',
      'White-label reports + API',
      'Dedicated success manager',
    ],
  },
];

const FAQS = [
  {
    q: 'Is there really a free plan?',
    a: 'Yes, genuinely free — forever. No credit card required. You get 1 ad platform, 5 campaigns, and 10 SEO audits per month at no cost. We want you to see value before you pay.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. No contracts, no cancellation fees. Cancel in one click from your settings. Your data is retained for 30 days in case you change your mind.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex). UPI support coming soon for Indian customers.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. 14-day money-back guarantee, no questions asked. If AdPilot isn\'t right for you in the first two weeks, we\'ll refund your payment in full.',
  },
  {
    q: 'Is my ad account data secure?',
    a: 'We never store your ad platform credentials. OAuth tokens are encrypted with AES-256-GCM. We connect to Meta and Google\'s APIs on your behalf — your account credentials never leave their servers.',
  },
];

export default function PricingPage() {
  const [annual,   setAnnual]   = useState(false);
  const [openFaq,  setOpenFaq]  = useState(null);

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          AdPilot
        </Link>
        <Link to="/register"
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600
                         text-white rounded-xl hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
          Get Started Free
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full
                          bg-orange-500/10 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">
              Early Access Pricing
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            One bad week of wasted spend costs<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              more than a year of AdPilot.
            </span>
          </h1>
          <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
            No percentage of ad spend. No hidden fees. Cancel anytime.
          </p>

          {/* Annual toggle */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <span className={`text-sm transition-colors ${!annual ? 'text-white' : 'text-white/40'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(a => !a)}
              className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-blue-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                annual ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm transition-colors ${annual ? 'text-white' : 'text-white/40'}`}>
              Annual
              <span className="ml-1.5 text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                SAVE 20%
              </span>
            </span>
          </div>
        </div>

        {/* ── Plans ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {PLANS.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly;
            const isPopular = plan.badge === 'MOST POPULAR';
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  isPopular
                    ? 'border-blue-500/40 bg-gradient-to-b from-blue-500/[0.07] to-transparent'
                    : 'border-white/[0.06] bg-[#0D1117] hover:border-white/[0.12]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase
                                     bg-blue-500 text-white rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-white/40">
                        /mo{annual ? ', billed annually' : ''}
                      </span>
                    )}
                  </div>
                  {annual && plan.price.monthly > 0 && (
                    <p className="text-xs text-white/30 line-through">${plan.price.monthly}/mo</p>
                  )}
                  <p className="text-sm text-white/50 mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.ctaPath}
                  className={`block text-center py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    isPopular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-[1.02] shadow-lg shadow-blue-500/20'
                      : 'border border-white/[0.12] text-white/70 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* ── Urgency ────────────────────────────────────────────────────────── */}
        <div className="text-center mb-16 px-4 py-4 bg-orange-500/[0.04] border border-orange-500/20 rounded-2xl">
          <p className="text-sm text-orange-300/80">
            Early access pricing. First 200 users locked in forever.{' '}
            <span className="font-bold text-orange-400">147 spots taken.</span>
          </p>
        </div>

        {/* ── FAQ ────────────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#0D1117] border border-white/[0.06] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left
                             hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-medium text-white/80">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp   className="w-4 h-4 text-white/40 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">No credit card required</span>
          </div>
          <div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600
                         text-white font-semibold rounded-xl hover:scale-105 transition-transform
                         shadow-xl shadow-blue-500/25 text-base"
            >
              Start Protecting My Budget — Free
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/30">
            14-day money-back guarantee · Cancel anytime · No contracts
          </p>
        </div>
      </div>
    </div>
  );
}
