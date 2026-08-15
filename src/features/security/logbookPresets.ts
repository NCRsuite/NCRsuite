import type { IconName } from '../../types';
import type { SecurityLogbookEntryRecord } from './types';

export const securityQuickLogbookPresets: Array<{
  category: SecurityLogbookEntryRecord['category'];
  severity: SecurityLogbookEntryRecord['severity'];
  label: string;
  title: string;
  icon: IconName;
}> = [
  { category: 'autre', severity: 'info', label: 'RAS', title: 'RAS', icon: 'check' },
  { category: 'ronde', severity: 'info', label: 'Ronde', title: 'Ronde effectuée', icon: 'shield' },
  { category: 'anomalie', severity: 'attention', label: 'Anomalie', title: 'Anomalie constatée', icon: 'alert' },
  { category: 'autre', severity: 'info', label: 'Passage véhicule', title: 'Passage véhicule', icon: 'map' },
  { category: 'livraison', severity: 'info', label: 'Livraison', title: 'Livraison', icon: 'file' },
  { category: 'visiteur', severity: 'attention', label: 'Personne / accès', title: 'Personne / contrôle d’accès', icon: 'users' }
];

const textPresetsByTitle: Record<string, string[]> = {
  RAS: [
    'Rien à signaler.',
    'Site calme, aucune anomalie constatée.',
    'Contrôle effectué, RAS.'
  ],
  'Ronde effectuée': [
    'Ronde effectuée, RAS.',
    'Ronde intérieure effectuée, RAS.',
    'Ronde extérieure effectuée, RAS.',
    'Tous les accès contrôlés sont sécurisés.'
  ],
  'Anomalie constatée': [
    'Anomalie constatée et signalée au QG.',
    'Accès / porte défectueux constaté.',
    'Éclairage défectueux constaté.',
    'Matériel défectueux constaté.'
  ],
  'Passage véhicule': [
    'Passage d’un véhicule constaté, RAS.',
    'Véhicule contrôlé, RAS.',
    'Véhicule stationné signalé.'
  ],
  Livraison: [
    'Livraison réceptionnée sans anomalie.',
    'Livreur orienté conformément aux consignes.',
    'Livraison refusée conformément aux consignes.'
  ],
  'Personne / contrôle d’accès': [
    'Contrôle d’accès effectué, RAS.',
    'Visiteur accueilli et orienté.',
    'Accès refusé conformément aux consignes.',
    'Personne signalée au QG.'
  ]
};

const textPresetsByCategory: Partial<Record<SecurityLogbookEntryRecord['category'], string[]>> = {
  incident: ['Incident signalé immédiatement au QG.', 'Situation sécurisée dans l’attente des consignes.'],
  appel: ['Appel reçu et information transmise au QG.', 'Appel traité conformément aux consignes.'],
  consigne: ['Consigne reçue et prise en compte.', 'Consigne transmise à la relève.'],
  visiteur: ['Visiteur accueilli et orienté.', 'Identité contrôlée conformément aux consignes.'],
  livraison: ['Livraison réceptionnée sans anomalie.'],
  anomalie: ['Anomalie constatée et signalée au QG.'],
  ronde: ['Ronde effectuée, RAS.']
};

export function securityLogbookTextPresets(category: SecurityLogbookEntryRecord['category'], title: string) {
  return textPresetsByTitle[title] ?? textPresetsByCategory[category] ?? [];
}
