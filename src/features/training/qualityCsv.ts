import type { Organization, OrganizationSite } from '../../types';
import type { TrainingQualityDashboard, TrainingQualityPeriod } from './qualityDashboard';
import { qualityPeriodLabel } from './qualityDashboard';

function csvCell(value: string | number | null) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function safeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function generateTrainingQualityCsv(
  organization: Organization,
  site: OrganizationSite | null,
  dashboard: TrainingQualityDashboard,
  periodDays: TrainingQualityPeriod
) {
  const lines: string[] = [];
  lines.push([csvCell('Rapport'), csvCell('Pilotage & contrôle qualité Formation')].join(';'));
  lines.push([csvCell('Entreprise'), csvCell(organization.name)].join(';'));
  lines.push([csvCell('Établissement'), csvCell(site?.name ?? 'Tous les établissements')].join(';'));
  lines.push([csvCell('Période'), csvCell(qualityPeriodLabel(periodDays))].join(';'));
  lines.push('');
  lines.push([csvCell('Indicateur'), csvCell('Valeur')].join(';'));
  lines.push([csvCell('Sessions planifiées à 30 jours'), csvCell(dashboard.metrics.plannedSessions)].join(';'));
  lines.push([csvCell('Sessions en cours'), csvCell(dashboard.metrics.inProgressSessions)].join(';'));
  lines.push([csvCell('Sessions prêtes à clôturer'), csvCell(dashboard.metrics.readyToCloseSessions)].join(';'));
  lines.push([csvCell('Sessions clôturées'), csvCell(dashboard.metrics.closedSessions)].join(';'));
  lines.push([csvCell('Stagiaires formés'), csvCell(dashboard.metrics.trainedTrainees)].join(';'));
  lines.push([csvCell('Taux de présence (%)'), csvCell(dashboard.metrics.attendanceRate)].join(';'));
  lines.push([csvCell('Documents complets (%)'), csvCell(dashboard.metrics.documentCompletionRate)].join(';'));
  lines.push([csvCell('Satisfaction moyenne (/5)'), csvCell(dashboard.metrics.satisfactionAverage)].join(';'));
  lines.push([csvCell('Taux de réponse (%)'), csvCell(dashboard.metrics.satisfactionResponseRate)].join(';'));
  lines.push('');
  lines.push([
    csvCell('Priorité'), csvCell('Type'), csvCell('Session'), csvCell('Point à traiter'), csvCell('Détail'), csvCell('Début'), csvCell('Fin')
  ].join(';'));
  dashboard.issues.forEach((issue) => {
    lines.push([
      csvCell(issue.severity), csvCell(issue.kind), csvCell(issue.sessionTitle), csvCell(issue.title), csvCell(issue.detail), csvCell(issue.startsAt), csvCell(issue.endsAt)
    ].join(';'));
  });

  const content = `\uFEFF${lines.join('\r\n')}`;
  const filename = `pilotage-qualite-${safeName(organization.name)}-${new Date().toISOString().slice(0, 10)}.csv`;
  return { content, filename };
}
