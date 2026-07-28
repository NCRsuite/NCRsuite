type PremiumSkeletonProps = {
  label?: string;
  rows?: number;
  variant?: 'list' | 'chart' | 'panel';
  compact?: boolean;
};

export function PremiumSkeleton({
  label = 'Chargement en cours',
  rows = 3,
  variant = 'list',
  compact = false
}: PremiumSkeletonProps) {
  return (
    <div
      className={`premium-skeleton premium-skeleton-${variant}${compact ? ' compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {variant === 'chart' ? (
        <div className="premium-skeleton-chart" aria-hidden="true">
          {[42, 68, 51, 82, 63, 91, 74].map((height, index) => (
            <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))}
        </div>
      ) : (
        <div className="premium-skeleton-rows" aria-hidden="true">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index}>
              <i />
              <span>
                <b />
                <small />
              </span>
              <em />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
