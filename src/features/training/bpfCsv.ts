import type { Organization } from '../../types';
import {
  trainingBpfObjectiveLabels,
  trainingBpfRevenueKeys,
  trainingBpfRevenueLabels,
  trainingBpfRncpLevelLabels,
  trainingBpfTraineeLabels,
  type TrainingBpfCalculation
} from './bpf';

function cell(value: string | number | boolean | null | undefined) {
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

function euros(cents: number) {
  return Math.round(Number(cents) || 0) / 100;
}

function metricLine(section: string, code: string, label: string, count: number, hours: number) {
  return [cell(section), cell(code), cell(label), cell(count), cell(hours), cell('')].join(';');
}

export function generateTrainingBpfCsv(organization: Organization, calculation: TrainingBpfCalculation) {
  const lines: string[] = [
    [cell('Projet BPF'), cell(calculation.period.year)].join(';'),
    [cell('Organisme'), cell(calculation.identity.name)].join(';'),
    [cell('NDA'), cell(calculation.identity.nda_number)].join(';'),
    [cell('SIRET'), cell(calculation.identity.siret)].join(';'),
    [cell('Exercice'), cell(`${calculation.period.start} au ${calculation.period.end}`)].join(';'),
    '',
    [cell('Section'), cell('Code'), cell('Libellé'), cell('Nombre'), cell('Heures-stagiaires'), cell('Montant HT (€)')].join(';')
  ];

  for (const key of trainingBpfRevenueKeys) {
    lines.push([
      cell('C'),
      cell(trainingBpfRevenueLabels[key].split(' · ')[0]),
      cell(trainingBpfRevenueLabels[key].split(' · ')[1]),
      cell(''),
      cell(''),
      cell(euros(calculation.financial.revenues_cents[key]))
    ].join(';'));
  }
  lines.push([cell('C'), cell('TOTAL'), cell('Total des produits de formation'), cell(''), cell(''), cell(euros(calculation.financial.total_products_cents))].join(';'));
  lines.push([cell('D'), cell('TOTAL'), cell('Charges liées à la formation'), cell(''), cell(''), cell(euros(calculation.financial.total_training_charges_cents))].join(';'));
  lines.push([cell('D'), cell('SALAIRES'), cell('Salaires des formateurs'), cell(''), cell(''), cell(euros(calculation.financial.trainer_salaries_cents))].join(';'));
  lines.push([cell('D'), cell('EXTERNES'), cell('Achats et honoraires de formation'), cell(''), cell(''), cell(euros(calculation.financial.external_training_costs_cents))].join(';'));

  lines.push(metricLine('E', 'INTERNE', 'Formateurs internes', calculation.trainers.internal.count, calculation.trainers.internal.hours));
  lines.push(metricLine('E', 'EXTERNE', 'Formateurs extérieurs', calculation.trainers.external.count, calculation.trainers.external.hours));

  Object.entries(trainingBpfTraineeLabels).forEach(([key, label]) => {
    const value = calculation.trainees.categories[key as keyof typeof calculation.trainees.categories];
    lines.push(metricLine('F1', key, label, value.count, value.hours));
  });
  lines.push(metricLine('F1', 'TOTAL', 'Total stagiaires', calculation.trainees.total.count, calculation.trainees.total.hours));
  lines.push(metricLine('F2', 'SOUS_TRAITEE', 'Activité confiée à un autre organisme', calculation.trainees.outsourced_by_us.count, calculation.trainees.outsourced_by_us.hours));

  Object.entries(trainingBpfObjectiveLabels).forEach(([key, label]) => {
    const value = calculation.objectives.categories[key as keyof typeof calculation.objectives.categories];
    lines.push(metricLine('F3', key, label, value.count, value.hours));
  });
  Object.entries(trainingBpfRncpLevelLabels).forEach(([key, label]) => {
    const value = calculation.objectives.rncp_levels[key as keyof typeof calculation.objectives.rncp_levels];
    lines.push(metricLine('F3-RNCP', key, label, value.count, value.hours));
  });

  calculation.specialties.main.forEach((specialty) => {
    lines.push(metricLine('F4', specialty.code, specialty.name, specialty.count, specialty.hours));
  });
  if (calculation.specialties.other.count > 0) {
    lines.push(metricLine('F4', 'AUTRES', 'Autres spécialités', calculation.specialties.other.count, calculation.specialties.other.hours));
  }
  lines.push(metricLine('G', 'SOUS_TRAITANT', 'Actions confiées à votre organisme', calculation.trainees.subcontracted_for_other.count, calculation.trainees.subcontracted_for_other.hours));

  lines.push('');
  lines.push([cell('Contrôles'), cell('Priorité'), cell('Code'), cell('Élément'), cell('Référence')].join(';'));
  calculation.quality.warnings.forEach((warning) => {
    lines.push([cell('Contrôle'), cell(warning.severity), cell(warning.code), cell(warning.label), cell(warning.entity_id)].join(';'));
  });

  return {
    content: `\uFEFF${lines.join('\r\n')}`,
    filename: `bpf-preparatoire-${safeName(organization.name)}-${calculation.period.year}.csv`
  };
}
