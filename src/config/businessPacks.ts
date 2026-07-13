import type { BusinessType, IconName, NavigationItem } from '../types';

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
}

export interface BusinessPack {
  id: BusinessType;
  label: string;
  description: string;
  icon: IconName;
  navigation: NavigationItem[];
  metrics: DashboardMetric[];
  quickActions: { label: string; path: string; icon: IconName }[];
}

const settings: NavigationItem = { label: 'Paramètres', path: '/parametres', icon: 'settings' };

export const businessPacks: Record<BusinessType, BusinessPack> = {
  coiffure: {
    id: 'coiffure',
    label: 'Coiffure & beauté',
    description: 'Rendez-vous, clients, prestations et équipe.',
    icon: 'scissors',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Rendez-vous', path: '/rendez-vous', icon: 'calendar' },
      { label: 'Clients', path: '/clients', icon: 'users' },
      { label: 'Collaborateurs', path: '/equipe', icon: 'briefcase' },
      { label: 'Prestations', path: '/prestations', icon: 'sparkles' },
      { label: 'Fidélité', path: '/fidelite', icon: 'chart' },
      settings
    ],
    metrics: [
      { label: "Rendez-vous aujourd'hui", value: '12', detail: '+3 par rapport à hier', icon: 'calendar' },
      { label: 'Nouveaux clients', value: '8', detail: 'sur les 30 derniers jours', icon: 'users' },
      { label: 'Taux de remplissage', value: '84 %', detail: 'cette semaine', icon: 'chart' },
      { label: 'Chiffre prévisionnel', value: '1 240 €', detail: 'cette semaine', icon: 'activity' }
    ],
    quickActions: [
      { label: 'Nouveau rendez-vous', path: '/rendez-vous?new=1', icon: 'calendar' },
      { label: 'Créer un client', path: '/clients?new=1', icon: 'users' },
      { label: 'Créer une prestation', path: '/prestations?new=1', icon: 'sparkles' }
    ]
  },
  nettoyage: {
    id: 'nettoyage',
    label: 'Nettoyage',
    description: 'Agents, sites, interventions et rapports.',
    icon: 'sparkles',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Planning', path: '/planning', icon: 'calendar' },
      { label: 'Agents', path: '/agents', icon: 'users' },
      { label: 'Sites clients', path: '/sites', icon: 'map' },
      { label: 'Interventions', path: '/interventions', icon: 'clipboard' },
      { label: 'Rapports', path: '/rapports', icon: 'file' },
      { label: 'Anomalies', path: '/anomalies', icon: 'alert' },
      settings
    ],
    metrics: [
      { label: 'Interventions du jour', value: '18', detail: 'sur 7 sites', icon: 'clipboard' },
      { label: 'Agents en mission', value: '11', detail: '2 disponibles', icon: 'users' },
      { label: 'Interventions terminées', value: '72 %', detail: "aujourd'hui", icon: 'chart' },
      { label: 'Anomalies ouvertes', value: '3', detail: 'dont 1 prioritaire', icon: 'alert' }
    ],
    quickActions: [
      { label: 'Planifier une intervention', path: '/planning', icon: 'calendar' },
      { label: 'Signaler une anomalie', path: '/anomalies', icon: 'alert' }
    ]
  },
  securite: {
    id: 'securite',
    label: 'Sécurité privée',
    description: 'Agents, sites, prises de poste, rondes et alertes.',
    icon: 'shield',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Planning', path: '/planning', icon: 'calendar' },
      { label: 'Agents', path: '/agents', icon: 'users' },
      { label: 'Sites', path: '/sites', icon: 'map' },
      { label: 'Prises de poste', path: '/prises-de-poste', icon: 'activity' },
      { label: 'Main courante', path: '/main-courante', icon: 'clipboard' },
      { label: 'Rondes', path: '/rondes', icon: 'shield' },
      { label: 'Alertes', path: '/alertes', icon: 'alert', badge: '2' },
      { label: 'Documents', path: '/documents', icon: 'file' },
      settings
    ],
    metrics: [
      { label: 'Agents en poste', value: '24', detail: 'sur 9 sites', icon: 'users' },
      { label: 'Rondes validées', value: '31', detail: '94 % conformes', icon: 'shield' },
      { label: 'Événements actifs', value: '6', detail: '2 à traiter', icon: 'clipboard' },
      { label: 'Alertes prioritaires', value: '2', detail: 'prise en charge requise', icon: 'alert' }
    ],
    quickActions: [
      { label: 'Créer une mission', path: '/planning', icon: 'calendar' },
      { label: 'Ouvrir une main courante', path: '/main-courante', icon: 'clipboard' }
    ]
  },
  formation: {
    id: 'formation',
    label: 'Formation',
    description: 'Stagiaires, sessions, documents et émargements.',
    icon: 'graduation',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Stagiaires', path: '/stagiaires', icon: 'users' },
      { label: 'Formateurs', path: '/formateurs', icon: 'briefcase' },
      { label: 'Sessions', path: '/sessions', icon: 'calendar' },
      { label: 'Documents', path: '/documents', icon: 'file' },
      { label: 'Émargements', path: '/emargements', icon: 'signature' },
      { label: 'Attestations', path: '/attestations', icon: 'graduation' },
      settings
    ],
    metrics: [
      { label: 'Sessions à venir', value: '7', detail: 'dans les 30 jours', icon: 'calendar' },
      { label: 'Stagiaires actifs', value: '46', detail: 'sur 12 sessions', icon: 'users' },
      { label: 'Documents à envoyer', value: '9', detail: 'dont 3 convocations', icon: 'file' },
      { label: 'Émargements complets', value: '91 %', detail: 'ce mois-ci', icon: 'signature' }
    ],
    quickActions: [
      { label: 'Créer une session', path: '/sessions', icon: 'calendar' },
      { label: 'Ajouter un stagiaire', path: '/stagiaires', icon: 'users' }
    ]
  },
  artisan: {
    id: 'artisan',
    label: 'Artisan & intervention',
    description: 'Clients, devis, chantiers et comptes rendus.',
    icon: 'tool',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Clients', path: '/clients', icon: 'users' },
      { label: 'Interventions', path: '/interventions', icon: 'tool' },
      { label: 'Devis', path: '/devis', icon: 'file' },
      { label: 'Planning', path: '/planning', icon: 'calendar' },
      { label: 'Documents', path: '/documents', icon: 'file' },
      { label: 'Rapports', path: '/rapports', icon: 'clipboard' },
      settings
    ],
    metrics: [
      { label: 'Interventions prévues', value: '8', detail: 'cette semaine', icon: 'tool' },
      { label: 'Devis en attente', value: '5', detail: 'pour 6 480 €', icon: 'file' },
      { label: 'Clients actifs', value: '39', detail: 'sur les 90 derniers jours', icon: 'users' },
      { label: 'Taux de validation', value: '68 %', detail: 'des devis envoyés', icon: 'chart' }
    ],
    quickActions: [
      { label: 'Créer une intervention', path: '/interventions', icon: 'tool' },
      { label: 'Créer un devis', path: '/devis', icon: 'file' }
    ]
  }
};

export const businessTypeOptions = Object.values(businessPacks).map(({ id, label, description, icon }) => ({
  id,
  label,
  description,
  icon
}));
