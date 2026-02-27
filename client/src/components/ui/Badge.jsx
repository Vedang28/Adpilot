const statusConfig = {
  active: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  paused: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  draft: 'bg-text-secondary/10 text-text-secondary border-text-secondary/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  meta: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  google: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  both: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  pro: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  starter: 'bg-text-secondary/10 text-text-secondary border-text-secondary/20',
};

const dotConfig = {
  active: 'bg-accent-green',
  paused: 'bg-orange-400',
  draft: 'bg-text-secondary',
  critical: 'bg-red-400',
};

export default function Badge({ status, showDot = false, className = '' }) {
  const label = status?.charAt(0).toUpperCase() + status?.slice(1);
  const colorClass = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {showDot && dotConfig[status] && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotConfig[status]}`} />
      )}
      {label}
    </span>
  );
}
