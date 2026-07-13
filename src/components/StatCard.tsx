import type { IconName } from '../types';
import { Icon } from './Icon';

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: IconName }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><Icon name={icon} size={21} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
