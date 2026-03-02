import { COLOR_MAP } from '../../config/features';

/**
 * EmptyState — feature-branded empty state with icon, title, description, and optional CTA.
 *
 * Props:
 *   icon       — Lucide icon component
 *   title      — bold heading
 *   description — body text
 *   action     — optional { label, onClick } CTA button
 *   color      — one of: 'red' | 'amber' | 'purple' | 'cyan' | 'orange' | 'green' | 'blue' (default)
 *   compact    — smaller layout for sidebars / panels
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  color = 'blue',
  compact = false,
}) {
  const c = COLOR_MAP[color] ?? {
    bg: 'bg-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/20',
    border: 'border-blue-500/20',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
      {Icon && (
        <div className={`${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-5'} rounded-2xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} ${c.text}`} />
        </div>
      )}
      <p className={`font-semibold text-text-primary ${compact ? 'text-sm' : 'text-base'} mb-1`}>
        {title}
      </p>
      {description && (
        <p className={`text-text-secondary leading-relaxed max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${c.bg} ${c.text} border ${c.border} hover:opacity-80`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
