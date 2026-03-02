/**
 * Feature Identity System — single source of truth for all 6 AI features.
 * Codenames: Sentinel, Apex, Radar, Beacon, Forge, Pulse
 *
 * IMPORTANT: COLOR_MAP uses static Tailwind class strings.
 * Never use template literals (bg-${color}-500) — Tailwind JIT won't detect them.
 */

export const COLOR_MAP = {
  red:    {
    bg:     'bg-red-500/10',
    border: 'border-red-500/20',
    text:   'text-red-400',
    iconBg: 'bg-red-500/20',
    glow:   'shadow-red-500/20',
    badge:  'bg-red-500/10 text-red-400 border border-red-500/20',
    ring:   'ring-red-500/30',
  },
  amber:  {
    bg:     'bg-amber-500/10',
    border: 'border-amber-500/20',
    text:   'text-amber-400',
    iconBg: 'bg-amber-500/20',
    glow:   'shadow-amber-500/20',
    badge:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    ring:   'ring-amber-500/30',
  },
  purple: {
    bg:     'bg-purple-500/10',
    border: 'border-purple-500/20',
    text:   'text-purple-400',
    iconBg: 'bg-purple-500/20',
    glow:   'shadow-purple-500/20',
    badge:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    ring:   'ring-purple-500/30',
  },
  cyan:   {
    bg:     'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text:   'text-cyan-400',
    iconBg: 'bg-cyan-500/20',
    glow:   'shadow-cyan-500/20',
    badge:  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    ring:   'ring-cyan-500/30',
  },
  orange: {
    bg:     'bg-orange-500/10',
    border: 'border-orange-500/20',
    text:   'text-orange-400',
    iconBg: 'bg-orange-500/20',
    glow:   'shadow-orange-500/20',
    badge:  'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    ring:   'ring-orange-500/30',
  },
  green:  {
    bg:     'bg-green-500/10',
    border: 'border-green-500/20',
    text:   'text-green-400',
    iconBg: 'bg-green-500/20',
    glow:   'shadow-green-500/20',
    badge:  'bg-green-500/10 text-green-400 border border-green-500/20',
    ring:   'ring-green-500/30',
  },
};

export const FEATURES = {
  sentinel: {
    id:          'sentinel',
    codename:    'Sentinel',
    label:       'Budget Guardian',
    sublabel:    'Spending protection',
    path:        '/budget-ai',
    color:       'red',
    iconName:    'ShieldAlert',
    badge:       'LIVE',
    badgeColor:  'red',
    description: 'AI monitors every campaign 24/7 and automatically stops budget bleeding before it starts.',
    stats: [
      { label: 'Avg. Savings',        value: '$4,200' },
      { label: 'Campaigns Protected', value: '1,200+' },
      { label: 'Response Time',       value: '<30s'   },
    ],
  },
  apex: {
    id:          'apex',
    codename:    'Apex',
    label:       'Scale Predictor',
    sublabel:    'Growth intelligence',
    path:        '/scaling',
    color:       'amber',
    iconName:    'TrendingUp',
    badge:       'AI',
    badgeColor:  'amber',
    description: 'Multi-factor AI scoring reveals exactly which campaigns are ready to scale — and by how much.',
    stats: [
      { label: 'Avg. ROAS Lift',   value: '2.4×'   },
      { label: 'Scale Accuracy',   value: '91%'    },
      { label: 'Campaigns Scored', value: '8,400+' },
    ],
  },
  radar: {
    id:          'radar',
    codename:    'Radar',
    label:       'Competitor Intel',
    sublabel:    'Market intelligence',
    path:        '/competitor-hijack',
    color:       'purple',
    iconName:    'Crosshair',
    badge:       'BETA',
    badgeColor:  'purple',
    description: 'Expose competitor ad strategies, steal their best angles, and win back audience share.',
    stats: [
      { label: 'Ad Libraries',  value: '2'      },
      { label: 'Keyword Gaps',  value: '1,200+' },
      { label: 'Win-back Rate', value: '38%'    },
    ],
  },
  beacon: {
    id:          'beacon',
    codename:    'Beacon',
    label:       'SEO Intelligence',
    sublabel:    'Organic visibility',
    path:        '/seo',
    color:       'cyan',
    iconName:    'Shield',
    badge:       null,
    badgeColor:  null,
    description: 'Full-stack SEO audit engine — Lighthouse, technical crawl, keyword gaps, and AI content briefs.',
    stats: [
      { label: 'Checks Run',      value: '16+'    },
      { label: 'Avg. Score Lift', value: '+22pts' },
      { label: 'Sites Audited',   value: '3,200+' },
    ],
  },
  forge: {
    id:          'forge',
    codename:    'Forge',
    label:       'Ad Studio',
    sublabel:    'AI copy generation',
    path:        '/ads',
    color:       'orange',
    iconName:    'Wand2',
    badge:       null,
    badgeColor:  null,
    description: 'Generate, iterate, and A/B test high-converting ad copy at 10× the speed of manual creation.',
    stats: [
      { label: 'Avg. CTR Lift',  value: '+34%'    },
      { label: 'Copy Variants',  value: '∞'       },
      { label: 'Ads Generated',  value: '42,000+' },
    ],
  },
  pulse: {
    id:          'pulse',
    codename:    'Pulse',
    label:       'Research Hub',
    sublabel:    'Market research',
    path:        '/research',
    color:       'green',
    iconName:    'Search',
    badge:       null,
    badgeColor:  null,
    description: 'Deep-dive keyword research, trend analysis, and content gap identification.',
    stats: [
      { label: 'Keywords Tracked', value: '50,000+' },
      { label: 'Trend Accuracy',   value: '89%'     },
      { label: 'Reports/mo',       value: '∞'       },
    ],
  },
};

export const FEATURE_LIST = Object.values(FEATURES);

/** Map a route path to the feature config */
export const FEATURE_BY_PATH = Object.fromEntries(
  FEATURE_LIST.map((f) => [f.path, f])
);
