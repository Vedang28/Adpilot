/** Skeleton loader primitives — replace spinners with content-shaped placeholders. */

function SkeletonBase({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return <SkeletonBase className={`${width} ${height} ${className}`} />;
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/2" />
          <SkeletonLine width="w-3/4" height="h-3" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine width="w-2/3" />
    </div>
  );
}

export function SkeletonKPI({ className = '' }) {
  return (
    <div className={`card flex items-start gap-4 ${className}`}>
      <SkeletonBase className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <SkeletonLine width="w-24" height="h-3" />
        <SkeletonLine width="w-16" height="h-7" />
        <SkeletonLine width="w-32" height="h-3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <SkeletonBase className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="w-1/3" height="h-3.5" />
            <SkeletonLine width="w-1/2" height="h-3" />
          </div>
          <SkeletonLine width="w-16" height="h-3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFeatureCard({ className = '' }) {
  return (
    <div className={`card space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonLine width="w-32" height="h-4" />
            <SkeletonLine width="w-20" height="h-3" />
          </div>
        </div>
        <SkeletonBase className="w-16 h-6 rounded-full" />
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkeletonLine width="w-24" height="h-3" />
              <SkeletonLine width="w-10" height="h-3" />
            </div>
            <SkeletonBase className="w-full h-1.5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Default export for convenience
export default function Skeleton({ className = '' }) {
  return <SkeletonBase className={`h-4 ${className}`} />;
}
