import type { IconName } from '../types';

export type PublicOfferPlan = {
  key: 'decouverte' | 'essentielle' | 'professionnelle' | 'metier';
  name: string;
  monthlyPriceCents: number;
  memberLimit: number;
  summary: string;
  highlights: string[];
  recommended?: boolean;
  custom?: boolean;
};

export type PublicOfferBusiness = {
  key: string;
  name: string;
  label: string;
  icon: IconName;
  color: string;
  plans: PublicOfferPlan[];
};

export const publicOfferCatalog: PublicOfferBusiness[] = [
  {
    key: 'formation',
    name: 'Formation',
    label: 'Organismes de formation',
    icon: 'graduation',
    color: '#0878f9',
    plans: [
      {
        key: 'decouverte',
        name: 'Découverte',
        monthlyPriceCents: 3990,
        memberLimit: 1,
        summary: 'Structurer les sessions et automatiser les premiers documents.',
        highlights: ['Programmes, stagiaires et sessions', 'Documents et attestations', 'Émargements vierges']
      },
      {
        key: 'essentielle',
        name: 'Essentielle',
        monthlyPriceCents: 6990,
        memberLimit: 3,
        summary: 'Digitaliser le parcours et présenter chaque support à votre image.',
        highlights: ['Émargement numérique', 'Documents et e-mails personnalisés', '3 accès inclus'],
        recommended: true
      },
      {
        key: 'professionnelle',
        name: 'Professionnelle',
        monthlyPriceCents: 9990,
        memberLimit: 10,
        summary: 'Piloter la qualité, les équipes et les dossiers complets.',
        highlights: ['Évaluations automatisées', 'Dossiers de session et multi-site', 'Rôles et accès équipe']
      },
      {
        key: 'metier',
        name: 'Métier',
        monthlyPriceCents: 14990,
        memberLimit: 100,
        summary: 'Composer une plateforme contractuelle adaptée à votre organisme.',
        highlights: ['Modules et rôles sur mesure', 'Marque blanche et domaine dédié', 'Jusqu’à 100 accès'],
        custom: true
      }
    ]
  },
  {
    key: 'securite',
    name: 'Sécurité privée',
    label: 'Entreprises de sécurité',
    icon: 'shield',
    color: '#d92d20',
    plans: [
      {
        key: 'decouverte',
        name: 'Découverte',
        monthlyPriceCents: 3990,
        memberLimit: 1,
        summary: 'Poser le socle opérationnel des sites, vacations et contrats.',
        highlights: ['Planning des agents', 'Clients, sites et tarifs', 'Facturation programmée']
      },
      {
        key: 'essentielle',
        name: 'Essentielle',
        monthlyPriceCents: 6990,
        memberLimit: 10,
        summary: 'Relier le bureau aux agents et fiabiliser les remontées terrain.',
        highlights: ['Portail agent et consignes', 'Rondes QR et main courante', '10 agents connectés'],
        recommended: true
      },
      {
        key: 'professionnelle',
        name: 'Professionnelle',
        monthlyPriceCents: 8990,
        memberLimit: 50,
        summary: 'Superviser les opérations sensibles en temps réel.',
        highlights: ['Géolocalisation et PTI/SOS', 'Supervision temps réel', '50 agents et rôles avancés']
      },
      {
        key: 'metier',
        name: 'Métier',
        monthlyPriceCents: 11990,
        memberLimit: 100,
        summary: 'Adapter la capacité, les agences et les processus de sécurité.',
        highlights: ['Multi-site et marque blanche', 'Modules et rôles sur mesure', 'Jusqu’à 100 accès'],
        custom: true
      }
    ]
  },
  {
    key: 'nettoyage',
    name: 'Nettoyage',
    label: 'Propreté et multiservices',
    icon: 'sparkles',
    color: '#07865c',
    plans: [
      {
        key: 'decouverte',
        name: 'Découverte',
        monthlyPriceCents: 2990,
        memberLimit: 1,
        summary: 'Planifier les prestations et cadrer chaque site client.',
        highlights: ['Clients, sites et affectations', 'Planning des interventions', 'Facturation programmée']
      },
      {
        key: 'essentielle',
        name: 'Essentielle',
        monthlyPriceCents: 4990,
        memberLimit: 10,
        summary: 'Équiper les agents et produire des preuves directement sur site.',
        highlights: ['Portail agent et pointage', 'Rapports et photos avant/après', '10 agents connectés'],
        recommended: true
      },
      {
        key: 'professionnelle',
        name: 'Professionnelle',
        monthlyPriceCents: 7990,
        memberLimit: 50,
        summary: 'Mesurer la qualité, les anomalies et la rentabilité multi-site.',
        highlights: ['Contrôles qualité et anomalies', 'Stocks et statistiques', '50 agents et multi-site']
      },
      {
        key: 'metier',
        name: 'Métier',
        monthlyPriceCents: 10990,
        memberLimit: 100,
        summary: 'Construire un environnement adapté à vos contrats et équipes.',
        highlights: ['Portail et processus sur mesure', 'Marque blanche et domaine dédié', 'Jusqu’à 100 accès'],
        custom: true
      }
    ]
  },
  {
    key: 'restauration',
    name: 'Restauration',
    label: 'Restaurants et établissements',
    icon: 'utensils',
    color: '#b36a08',
    plans: [
      {
        key: 'decouverte',
        name: 'Découverte',
        monthlyPriceCents: 2990,
        memberLimit: 1,
        summary: 'Réunir l’équipe, la carte, les réservations et les stocks simples.',
        highlights: ['Planning et équipe', 'Carte, allergènes et fournisseurs', 'Réservations manuelles']
      },
      {
        key: 'essentielle',
        name: 'Essentielle',
        monthlyPriceCents: 4990,
        memberLimit: 10,
        summary: 'Fluidifier le service et rendre l’exploitation plus autonome.',
        highlights: ['Réservation en ligne et plan de salle', 'Menu QR multilingue et HACCP', '10 employés connectés'],
        recommended: true
      },
      {
        key: 'professionnelle',
        name: 'Professionnelle',
        monthlyPriceCents: 7990,
        memberLimit: 50,
        summary: 'Piloter plusieurs sites, les stocks avancés et la rentabilité.',
        highlights: ['Supervision et multi-site', 'Inventaires et commandes fournisseurs', 'Food cost et statistiques']
      },
      {
        key: 'metier',
        name: 'Métier',
        monthlyPriceCents: 10990,
        memberLimit: 100,
        summary: 'Équiper un groupe, une franchise ou un concept spécifique.',
        highlights: ['Groupes et franchises', 'Intégrations et rôles sur mesure', 'Jusqu’à 100 accès'],
        custom: true
      }
    ]
  },
  {
    key: 'coiffure',
    name: 'Coiffure & beauté',
    label: 'Salons et instituts',
    icon: 'scissors',
    color: '#9b3db4',
    plans: [
      {
        key: 'decouverte',
        name: 'Découverte',
        monthlyPriceCents: 990,
        memberLimit: 1,
        summary: 'Centraliser les clients, les prestations et les rendez-vous.',
        highlights: ['Fichier client et prestations', 'Réservation publique', 'Confirmations par e-mail']
      },
      {
        key: 'essentielle',
        name: 'Essentielle',
        monthlyPriceCents: 1990,
        memberLimit: 3,
        summary: 'Automatiser les rappels et ouvrir les premiers accès équipe.',
        highlights: ['Rappels automatiques', 'Gestion des réservations en ligne', '3 accès inclus'],
        recommended: true
      },
      {
        key: 'professionnelle',
        name: 'Professionnelle',
        monthlyPriceCents: 3990,
        memberLimit: 10,
        summary: 'Structurer l’équipe et personnaliser la relation commerciale.',
        highlights: ['Rôle manager et accès équipe', 'Personnalisation commerciale', '10 accès inclus']
      },
      {
        key: 'metier',
        name: 'Métier',
        monthlyPriceCents: 6990,
        memberLimit: 100,
        summary: 'Déployer votre identité et vos processus sur plusieurs salons.',
        highlights: ['Multi-site et marque blanche', 'Domaine et modules sur mesure', 'Jusqu’à 100 accès'],
        custom: true
      }
    ]
  }
];

export function formatPublicMonthlyPrice(monthlyPriceCents: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monthlyPriceCents / 100);
}
