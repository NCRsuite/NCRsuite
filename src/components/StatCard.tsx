import type { IconName } from '../types';
import { Icon } from './Icon';

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  loading?: boolean;
};

export function StatCard({ label, value, detail, icon, loading = false }: StatCardProps) {
  return (
    <article className={`stat-card${loading ? ' is-loading' : ''}`} aria-busy={loading}>
      <div className="stat-icon"><Icon name={icon} size={21} /></div>
      <span>{label}</span>
      {loading ? (
        <div className="stat-card-skeleton" aria-label={`Chargement de l’indicateur ${label}`} role="status">
          <i />
          <b />
        </div>
      ) : (
        <>
          <strong>{value}</strong>
          <small>{detail}</small>
        </>
      )}
    </article>
  );
}
