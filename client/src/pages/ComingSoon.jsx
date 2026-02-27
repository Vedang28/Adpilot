import { Zap } from 'lucide-react';

export default function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-accent-blue/20 flex items-center justify-center mb-5">
        <Zap className="w-8 h-8 text-accent-blue" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">{title}</h2>
      <p className="text-text-secondary max-w-sm">
        This feature is under construction and will be available in a future release.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-text-secondary bg-bg-card border border-border rounded-full px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
        Coming in Phase 3
      </div>
    </div>
  );
}
