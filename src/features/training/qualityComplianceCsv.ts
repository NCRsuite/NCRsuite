import type { Organization } from '../../types';
import {
  trainingQualityAuditResultLabels,
  trainingQualityAuditStatusLabels,
  trainingQualityAuditTypeLabels,
  trainingQualityCriteria,
  trainingQualityStatusLabels
} from './qualityCompliance';
import type {
  TrainingQualityAuditRecord,
  TrainingQualityControlRecord,
  TrainingQualityEvidenceRecord
} from './types';

function cell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

export function generateTrainingQualityComplianceCsv(
  organization: Organization,
  controls: TrainingQualityControlRecord[],
  evidence: TrainingQualityEvidenceRecord[],
  audits: TrainingQualityAuditRecord[]
) {
  const rows: string[][] = [
    ['NCR Suite V2.19.0', organization.name],
    ['Export', 'Dossier Qualiopi et conformité'],
    ['Généré le', new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())],
    [],
    ['INDICATEURS'],
    ['Critère', 'Indicateur', 'Exigence', 'Applicable', 'Statut', 'Responsable', 'Échéance', 'Preuves actives', 'Notes']
  ];
  for (const control of controls) {
    rows.push([
      trainingQualityCriteria.find((criterion) => criterion.number === control.criterion_number)?.label ?? String(control.criterion_number),
      String(control.indicator_number),
      control.title,
      control.applicable ? 'Oui' : 'Non',
      trainingQualityStatusLabels[control.status],
      control.owner_name ?? '',
      control.due_date ?? '',
      String(evidence.filter((item) => item.control_id === control.id && item.status === 'current').length),
      control.notes ?? ''
    ]);
  }
  rows.push([], ['PREUVES'], ['Indicateur', 'Libellé', 'Source', 'Date', 'Expiration', 'Statut', 'Session', 'Référence']);
  for (const item of evidence) {
    const control = controls.find((candidate) => candidate.id === item.control_id);
    rows.push([
      String(control?.indicator_number ?? ''),
      item.label,
      item.source_kind,
      item.evidence_date,
      item.expires_at ?? '',
      item.status,
      item.session_id ?? '',
      item.source_reference ?? item.file_name ?? ''
    ]);
  }
  rows.push([], ['AUDITS'], ['Type', 'Date prévue', 'Statut', 'Auditeur', 'Périmètre', 'Résultat', 'Notes']);
  for (const audit of audits) {
    rows.push([
      trainingQualityAuditTypeLabels[audit.audit_type],
      audit.planned_date,
      trainingQualityAuditStatusLabels[audit.status],
      audit.auditor_name ?? '',
      audit.scope ?? '',
      audit.result ? trainingQualityAuditResultLabels[audit.result] : '',
      audit.notes ?? ''
    ]);
  }
  const content = `\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\r\n')}`;
  const safeName = organization.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return {
    content,
    filename: `dossier-qualiopi-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`
  };
}
