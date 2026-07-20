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
  launchStatus: 'available' | 'planned';
  navigation: NavigationItem[];
  metrics: DashboardMetric[];
  quickActions: { label: string; path: string; icon: IconName }[];
}

const notifications: NavigationItem = { label: 'Notifications', path: '/notifications', icon: 'bell' };
const subscription: NavigationItem = { label: 'Mon abonnement', path: '/abonnement', icon: 'creditCard' };
const settings: NavigationItem = { label: 'Paramètres', path: '/parametres', icon: 'settings' };

export const businessPacks: Record<BusinessType, BusinessPack> = {
  coiffure: {
    id: 'coiffure',
    label: 'Coiffure & beauté',
    description: 'Rendez-vous, clients, prestations et équipe.',
    icon: 'scissors',
    launchStatus: 'available',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Rendez-vous', path: '/rendez-vous', icon: 'calendar' },
      { label: 'Clients', path: '/clients', icon: 'users' },
      { label: 'Collaborateurs', path: '/equipe', icon: 'briefcase' },
      { label: 'Accès équipe', path: '/acces-equipe', icon: 'users' },
      { label: 'Prestations', path: '/prestations', icon: 'sparkles' },
      { label: 'Fidélité', path: '/fidelite', icon: 'chart' },
      { label: 'Personnalisation', path: '/personnalisation', icon: 'sparkles' },
      notifications,
      subscription,
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
    description: 'Planning, pointage, interventions et contrôle qualité.',
    icon: 'sparkles',
    launchStatus: 'available',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Espace agent', path: '/terrain', icon: 'sparkles' },
      { label: 'Planning', path: '/planning', icon: 'calendar' },
      { label: 'Clients', path: '/clients', icon: 'building' },
      { label: 'Sites clients', path: '/sites', icon: 'map' },
      { label: 'Agents', path: '/agents', icon: 'users' },
      { label: 'Interventions', path: '/interventions', icon: 'clipboard' },
      { label: 'Protocoles & récurrences', path: '/protocoles', icon: 'clipboard' },
      { label: 'Rapports de passage', path: '/rapports', icon: 'file' },
      { label: 'Anomalies', path: '/anomalies', icon: 'alert' },
      { label: 'Contrôle qualité', path: '/qualite', icon: 'chart' },
      { label: 'Stocks & produits', path: '/stocks', icon: 'briefcase' },
      { label: 'Rentabilité', path: '/rentabilite', icon: 'chart' },
      { label: 'Facturation', path: '/facturation', icon: 'creditCard' },
      { label: 'Accès agents', path: '/acces-equipe', icon: 'users' },
      notifications,
      subscription,
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
    description: 'Planning des agents, sites, tarifs, préfactures et factures.',
    icon: 'shield',
    launchStatus: 'available',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Espace agent', path: '/terrain', icon: 'shield' },
      { label: 'Planning', path: '/planning', icon: 'calendar' },
      { label: 'Clients', path: '/clients', icon: 'building' },
      { label: 'Agents', path: '/agents', icon: 'users' },
      { label: 'Sites', path: '/sites', icon: 'map' },
      { label: 'Devis', path: '/devis', icon: 'file' },
      { label: 'Facturation', path: '/facturation', icon: 'creditCard' },
      { label: 'Accès agents', path: '/acces-equipe', icon: 'users' },
      { label: 'Rondes QR', path: '/rondes', icon: 'shield' },
      { label: 'Main courante', path: '/main-courante', icon: 'clipboard' },
      { label: 'Consignes & alertes', path: '/consignes', icon: 'alert' },
      { label: 'Géolocalisation', path: '/geolocalisation', icon: 'map' },
      { label: 'PTI / SOS', path: '/pti', icon: 'shield' },
      { label: 'Supervision', path: '/supervision', icon: 'activity' },
      { label: 'Dossiers vacations', path: '/dossiers-vacations', icon: 'file' },
      { label: 'Personnalisation', path: '/personnalisation', icon: 'sparkles' },
      notifications,
      subscription,
      settings
    ],
    metrics: [],
    quickActions: [
      { label: 'Planifier une mission', path: '/planning', icon: 'calendar' },
      { label: 'Ajouter un agent', path: '/agents?new=1', icon: 'users' },
      { label: 'Ajouter un site', path: '/sites?new=1', icon: 'map' }
    ]
  },
  formation: {
    id: 'formation',
    label: 'Formation',
    description: 'Stagiaires, sessions, documents et émargements.',
    icon: 'graduation',
    launchStatus: 'available',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Formations', path: '/formations', icon: 'graduation' },
      { label: 'Stagiaires', path: '/stagiaires', icon: 'users' },
      { label: 'Formateurs', path: '/formateurs', icon: 'briefcase' },
      { label: 'Sessions', path: '/sessions', icon: 'calendar' },
      { label: 'Documents', path: '/documents', icon: 'file' },
      { label: 'Émargements', path: '/emargements', icon: 'signature' },
      { label: 'Évaluations', path: '/evaluations', icon: 'chart' },
      { label: 'Attestations', path: '/attestations', icon: 'graduation' },
      { label: 'Établissements', path: '/etablissements', icon: 'building' },
      { label: 'Accès équipe', path: '/acces-equipe', icon: 'users' },
      { label: 'Personnalisation', path: '/personnalisation', icon: 'sparkles' },
      notifications,
      subscription,
      settings
    ],
    metrics: [
      { label: 'Sessions à venir', value: '7', detail: 'dans les 30 jours', icon: 'calendar' },
      { label: 'Stagiaires actifs', value: '46', detail: 'sur 12 sessions', icon: 'users' },
      { label: 'Documents à envoyer', value: '9', detail: 'dont 3 convocations', icon: 'file' },
      { label: 'Émargements complets', value: '91 %', detail: 'ce mois-ci', icon: 'signature' }
    ],
    quickActions: [
      { label: 'Créer une session', path: '/sessions?new=1', icon: 'calendar' },
      { label: 'Ajouter un stagiaire', path: '/stagiaires?new=1', icon: 'users' },
      { label: 'Créer une formation', path: '/formations?new=1', icon: 'graduation' }
    ]
  },
  restauration: {
    id: 'restauration',
    label: 'Restauration',
    description: 'Équipe, réservations, menu, hygiène, stocks et rentabilité.',
    icon: 'utensils',
    launchStatus: 'planned',
    navigation: [
      { label: 'Tableau de bord', path: '/', icon: 'home' },
      { label: 'Planning équipe', path: '/planning', icon: 'calendar' },
      { label: 'Employés', path: '/equipe', icon: 'users' },
      { label: 'Carte & menus', path: '/carte', icon: 'utensils' },
      { label: 'Réservations', path: '/reservations', icon: 'calendar' },
      { label: 'Plan de salle', path: '/salle', icon: 'map' },
      { label: 'Menu QR', path: '/menu-qr', icon: 'file' },
      { label: 'Hygiène & températures', path: '/hygiene', icon: 'clipboard' },
      { label: 'Stocks & fournisseurs', path: '/stocks', icon: 'briefcase' },
      notifications,
      subscription,
      settings
    ],
    metrics: [
      { label: 'Réservations du jour', value: '42', detail: '68 couverts prévus', icon: 'calendar' },
      { label: 'Employés planifiés', value: '9', detail: 'service du soir', icon: 'users' },
      { label: 'Alertes hygiène', value: '2', detail: 'relevés à compléter', icon: 'alert' },
      { label: 'Marge moyenne', value: '72 %', detail: 'sur la carte active', icon: 'chart' }
    ],
    quickActions: [
      { label: 'Ajouter un plat', path: '/carte', icon: 'utensils' },
      { label: 'Créer une réservation', path: '/reservations', icon: 'calendar' },
      { label: 'Faire un relevé', path: '/hygiene', icon: 'clipboard' }
    ]
  }
};

export const businessTypeOptions = Object.values(businessPacks).map(({ id, label, description, icon, launchStatus }) => ({
  id,
  label,
  description,
  icon,
  launchStatus
}));

export const availableBusinessTypeOptions = businessTypeOptions.filter((option) => option.launchStatus === 'available');
