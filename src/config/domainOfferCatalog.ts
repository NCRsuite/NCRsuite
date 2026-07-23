import type { BusinessType, IconName, Plan } from '../types';

export type DomainLaunchStatus = 'available' | 'planned';

export type OfferFeatureKey =
  | 'public_booking'
  | 'confirmation_emails'
  | 'automatic_reminders'
  | 'online_booking_management'
  | 'calendar_links'
  | 'team_access'
  | 'manager_role'
  | 'commercial_branding'
  | 'coiffure_loyalty'
  | 'coiffure_client_portal'
  | 'white_label'
  | 'multi_site'
  | 'custom_modules'
  | 'custom_roles'
  | 'custom_domain'
  | 'training_programs'
  | 'training_trainees'
  | 'training_trainers'
  | 'training_sessions'
  | 'training_documents'
  | 'training_blank_attendance'
  | 'training_digital_attendance'
  | 'training_attendance_pdf'
  | 'training_automatic_certificates'
  | 'training_document_branding'
  | 'training_email_branding'
  | 'training_satisfaction'
  | 'training_session_dossier'
  | 'training_commercial'
  | 'security_planning'
  | 'security_clients_sites'
  | 'security_site_rates'
  | 'security_scheduled_billing'
  | 'security_final_billing'
  | 'security_document_branding'
  | 'security_quotes'
  | 'security_bank_details'
  | 'security_document_email'
  | 'security_agent_portal'
  | 'security_qr_patrols'
  | 'security_smart_logbook'
  | 'security_site_instructions'
  | 'security_logbook_pdf'
  | 'security_geolocation'
  | 'security_pti_sos'
  | 'security_realtime_supervision'
  | 'security_agent_roles'
  | 'security_client_portal'
  | 'cleaning_clients_sites'
  | 'cleaning_planning'
  | 'cleaning_scheduled_billing'
  | 'cleaning_agent_portal'
  | 'cleaning_time_clock'
  | 'cleaning_site_instructions'
  | 'cleaning_visit_reports'
  | 'cleaning_before_after_photos'
  | 'cleaning_quality_control'
  | 'cleaning_anomalies'
  | 'cleaning_stock'
  | 'cleaning_statistics'
  | 'cleaning_agent_roles'
  | 'cleaning_protocols'
  | 'cleaning_recurring_planning'
  | 'cleaning_task_checklists'
  | 'cleaning_profitability'
  | 'cleaning_client_portal'
  | 'restaurant_staff_planning'
  | 'restaurant_menu'
  | 'restaurant_allergens'
  | 'restaurant_suppliers'
  | 'restaurant_basic_stock'
  | 'restaurant_manual_reservations'
  | 'restaurant_employee_portal'
  | 'restaurant_basic_roles'
  | 'restaurant_online_reservations'
  | 'restaurant_floor_plan'
  | 'restaurant_floor_editor'
  | 'restaurant_floor_advanced'
  | 'restaurant_multilingual_qr_menu'
  | 'restaurant_temperatures'
  | 'restaurant_checklists'
  | 'restaurant_document_email_branding'
  | 'restaurant_manager_role'
  | 'restaurant_realtime_supervision'
  | 'restaurant_advanced_stock'
  | 'restaurant_inventory'
  | 'restaurant_waste'
  | 'restaurant_supplier_orders'
  | 'restaurant_food_cost'
  | 'restaurant_statistics'
  | 'restaurant_ordering'
  | 'restaurant_kitchen_display'
  | 'restaurant_advanced_ordering'
  | 'restaurant_recipe_cards'
  | 'restaurant_recipe_kitchen'
  | 'restaurant_auto_stock_consumption'
  | 'restaurant_stock_traceability';

export interface DomainOfferPlan {
  label: string;
  monthlyPriceCents: number;
  memberLimit: number;
  detail: string;
  additions: string[];
  features: OfferFeatureKey[];
  recommended?: boolean;
  startingAt?: boolean;
}

export interface DomainOfferDefinition {
  id: BusinessType;
  label: string;
  description: string;
  icon: IconName;
  launchStatus: DomainLaunchStatus;
  accessUnitSingular: string;
  accessUnitPlural: string;
  plans: Record<Plan, DomainOfferPlan>;
}

const customFeatures: OfferFeatureKey[] = ['white_label', 'multi_site', 'custom_modules', 'custom_roles', 'custom_domain'];

const coiffureDecouverte: OfferFeatureKey[] = ['public_booking', 'confirmation_emails', 'coiffure_loyalty', 'coiffure_client_portal'];
const coiffureEssentielle: OfferFeatureKey[] = [
  ...coiffureDecouverte,
  'automatic_reminders',
  'online_booking_management',
  'calendar_links',
  'team_access'
];
const coiffureProfessionnelle: OfferFeatureKey[] = [
  ...coiffureEssentielle,
  'manager_role',
  'commercial_branding'
];

const formationBase: OfferFeatureKey[] = [
  'training_programs',
  'training_trainees',
  'training_trainers',
  'training_sessions',
  'training_documents',
  'training_blank_attendance',
  'training_automatic_certificates'
];
const formationEssentielle: OfferFeatureKey[] = [
  ...formationBase,
  'training_digital_attendance',
  'training_attendance_pdf',
  'commercial_branding',
  'training_document_branding',
  'training_email_branding'
];
const formationProfessionnelle: OfferFeatureKey[] = [
  ...formationEssentielle,
  'training_satisfaction',
  'training_session_dossier',
  'training_commercial',
  'multi_site',
  'team_access',
  'manager_role'
];

const securityDecouverte: OfferFeatureKey[] = [
  'security_planning',
  'security_clients_sites',
  'security_site_rates',
  'security_scheduled_billing',
  'security_final_billing',
  'security_document_branding',
  'security_quotes',
  'security_bank_details',
  'security_document_email'
];
const securityEssentielle: OfferFeatureKey[] = [
  ...securityDecouverte,
  'team_access',
  'security_agent_portal',
  'security_qr_patrols',
  'security_smart_logbook',
  'security_site_instructions',
  'security_logbook_pdf'
];
const securityProfessionnelle: OfferFeatureKey[] = [
  ...securityEssentielle,
  'security_geolocation',
  'security_pti_sos',
  'security_realtime_supervision',
  'security_agent_roles',
  'security_client_portal',
  'manager_role'
];

const cleaningDecouverte: OfferFeatureKey[] = [
  'cleaning_clients_sites',
  'cleaning_planning',
  'cleaning_scheduled_billing',
  'cleaning_protocols',
  'cleaning_recurring_planning'
];
const cleaningEssentielle: OfferFeatureKey[] = [
  ...cleaningDecouverte,
  'team_access',
  'cleaning_agent_portal',
  'cleaning_time_clock',
  'cleaning_site_instructions',
  'cleaning_visit_reports',
  'cleaning_before_after_photos',
  'cleaning_task_checklists'
];
const cleaningProfessionnelle: OfferFeatureKey[] = [
  ...cleaningEssentielle,
  'cleaning_quality_control',
  'cleaning_anomalies',
  'cleaning_stock',
  'multi_site',
  'cleaning_statistics',
  'cleaning_agent_roles',
  'cleaning_profitability',
  'manager_role'
];

const restaurantDecouverte: OfferFeatureKey[] = [
  'restaurant_staff_planning',
  'restaurant_menu',
  'restaurant_allergens',
  'restaurant_suppliers',
  'restaurant_basic_stock',
  'restaurant_manual_reservations',
  'restaurant_ordering',
  'restaurant_recipe_cards'
];
const restaurantEssentielle: OfferFeatureKey[] = [
  ...restaurantDecouverte,
  'team_access',
  'restaurant_employee_portal',
  'restaurant_basic_roles',
  'restaurant_online_reservations',
  'restaurant_floor_plan',
  'restaurant_floor_editor',
  'restaurant_multilingual_qr_menu',
  'restaurant_temperatures',
  'restaurant_checklists',
  'restaurant_document_email_branding',
  'commercial_branding',
  'restaurant_kitchen_display',
  'restaurant_recipe_kitchen'
];
const restaurantProfessionnelle: OfferFeatureKey[] = [
  ...restaurantEssentielle,
  'restaurant_manager_role',
  'restaurant_floor_advanced',
  'manager_role',
  'multi_site',
  'restaurant_realtime_supervision',
  'restaurant_advanced_stock',
  'restaurant_inventory',
  'restaurant_waste',
  'restaurant_supplier_orders',
  'restaurant_food_cost',
  'restaurant_statistics',
  'restaurant_advanced_ordering',
  'restaurant_auto_stock_consumption',
  'restaurant_stock_traceability'
];

export const DOMAIN_OFFER_CATALOG: Record<BusinessType, DomainOfferDefinition> = {
  coiffure: {
    id: 'coiffure',
    label: 'Coiffure & beauté',
    description: 'Rendez-vous, clients, prestations et équipe.',
    icon: 'scissors',
    launchStatus: 'available',
    accessUnitSingular: 'accès',
    accessUnitPlural: 'accès',
    plans: {
      decouverte: {
        label: 'Découverte', monthlyPriceCents: 990, memberLimit: 1,
        detail: 'Le socle pour gérer seul les clients, prestations, rendez-vous et confirmations.',
        additions: ['Clients, prestations et rendez-vous', 'Réservation publique', 'Confirmations par e-mail', 'Fidélité configurable et espace client'],
        features: coiffureDecouverte
      },
      essentielle: {
        label: 'Essentielle', monthlyPriceCents: 1990, memberLimit: 3,
        detail: 'Ajoute les rappels, la gestion en ligne et les premiers accès collaborateurs.',
        additions: ['Passe à 3 accès', 'Rappels automatiques', 'Modification et annulation en ligne', 'Ajout au calendrier'],
        features: coiffureEssentielle,
        recommended: true
      },
      professionnelle: {
        label: 'Professionnelle', monthlyPriceCents: 3990, memberLimit: 10,
        detail: 'Ajoute la gestion structurée de l’équipe et la personnalisation commerciale.',
        additions: ['Passe à 10 accès', 'Rôle Responsable', 'Personnalisation complète'],
        features: coiffureProfessionnelle
      },
      metier: {
        label: 'Métier', monthlyPriceCents: 6990, memberLimit: 100,
        detail: 'Modules, rôles, établissements, identité et domaine configurés sur mesure.',
        additions: ['Marque blanche', 'Multi-site', 'Modules et rôles à la carte', 'Domaine personnalisé'],
        features: [...coiffureProfessionnelle, ...customFeatures],
        startingAt: true
      }
    }
  },
  formation: {
    id: 'formation',
    label: 'Formation',
    description: 'Stagiaires, sessions, documents et émargements.',
    icon: 'graduation',
    launchStatus: 'available',
    accessUnitSingular: 'accès',
    accessUnitPlural: 'accès',
    plans: {
      decouverte: {
        label: 'Découverte', monthlyPriceCents: 3990, memberLimit: 1,
        detail: 'Le socle Formation : gestion, documents, feuille vierge et attestations automatiques.',
        additions: ['Formations, stagiaires, formateurs et sessions', 'Documents de session', 'Feuille d’émargement vierge', 'Attestations automatiques'],
        features: formationBase
      },
      essentielle: {
        label: 'Essentielle', monthlyPriceCents: 6990, memberLimit: 3,
        detail: 'Ajoute l’émargement numérique et la personnalisation des documents et e-mails.',
        additions: ['Passe à 3 accès', 'Émargement numérique et signatures', 'PDF d’émargement', 'Personnalisation des documents et e-mails'],
        features: formationEssentielle,
        recommended: true
      },
      professionnelle: {
        label: 'Professionnelle', monthlyPriceCents: 9990, memberLimit: 10,
        detail: 'Ajoute les évaluations, le dossier complet, le multi-site et les accès employés avec rôles.',
        additions: ['Passe à 10 accès', 'Évaluations de satisfaction', 'Dossier complet de session', 'CRM, relances, clients, financeurs et documents commerciaux', 'Multi-site', 'Accès employés avec rôles'],
        features: formationProfessionnelle
      },
      metier: {
        label: 'Métier', monthlyPriceCents: 14990, memberLimit: 100,
        detail: 'Modules, rôles, limites et identité configurés sur mesure selon le contrat.',
        additions: ['Configuration contractuelle', 'Marque blanche', 'Modules et rôles personnalisés', 'Domaine personnalisé'],
        features: [...formationProfessionnelle, ...customFeatures],
        startingAt: true
      }
    }
  },
  securite: {
    id: 'securite',
    label: 'Sécurité privée',
    description: 'Planning, facturation, terrain, rondes et supervision.',
    icon: 'shield',
    launchStatus: 'available',
    accessUnitSingular: 'agent connecté',
    accessUnitPlural: 'agents connectés',
    plans: {
      decouverte: {
        label: 'Découverte', monthlyPriceCents: 3990, memberLimit: 1,
        detail: 'Le pilotage bureau : planning des agents et facturation selon les heures programmées et le tarif du site.',
        additions: ['Planning des agents avec totaux par agent et site', 'Clients et sites', 'Tarif propre à chaque site', 'Préfacturation et factures après vacation', 'Devis prospects et conversion en client', 'Logo, coordonnées bancaires et envoi e-mail des documents'],
        features: securityDecouverte
      },
      essentielle: {
        label: 'Essentielle', monthlyPriceCents: 6990, memberLimit: 10,
        detail: 'Ajoute le terrain connecté pour une équipe de 10 agents.',
        additions: ['Jusqu’à 10 agents connectés', 'Rondes QR', 'Main courante intelligente avec choix prédéfinis', 'Alertes et consignes par site', 'Main courante PDF'],
        features: securityEssentielle,
        recommended: true
      },
      professionnelle: {
        label: 'Professionnelle', monthlyPriceCents: 8990, memberLimit: 50,
        detail: 'Ajoute la supervision opérationnelle et porte la capacité à 50 agents.',
        additions: ['Jusqu’à 50 agents connectés', 'Géolocalisation', 'PTI / SOS', 'Supervision en temps réel', 'Rôles Agent et Chef de poste', 'Portail sécurisé pour les donneurs d’ordre'],
        features: securityProfessionnelle
      },
      metier: {
        label: 'Métier', monthlyPriceCents: 11990, memberLimit: 100,
        detail: 'Pour plus de 50 agents, plusieurs agences ou des besoins configurés sur mesure.',
        additions: ['Capacité et rôles sur mesure', 'Plusieurs agences', 'Marque blanche', 'Intégrations et modules spécifiques'],
        features: [...securityProfessionnelle, ...customFeatures],
        startingAt: true
      }
    }
  },
  nettoyage: {
    id: 'nettoyage',
    label: 'Nettoyage',
    description: 'Planning, pointage, interventions et contrôle qualité.',
    icon: 'sparkles',
    launchStatus: 'available',
    accessUnitSingular: 'agent connecté',
    accessUnitPlural: 'agents connectés',
    plans: {
      decouverte: {
        label: 'Découverte', monthlyPriceCents: 2990, memberLimit: 1,
        detail: 'Le pilotage bureau : clients, sites, planning, affectations et facturation programmée.',
        additions: ['Clients et sites', 'Planning des prestations', 'Protocoles par site', 'Planification récurrente', 'Facturation selon les prestations programmées'],
        features: cleaningDecouverte
      },
      essentielle: {
        label: 'Essentielle', monthlyPriceCents: 4990, memberLimit: 10,
        detail: 'Ajoute le suivi terrain pour une équipe de 10 agents.',
        additions: ['Jusqu’à 10 agents connectés', 'Pointage arrivée et départ', 'Checklists terrain issues des protocoles', 'Fiche de passage et rapport PDF', 'Photos avant / après'],
        features: cleaningEssentielle,
        recommended: true
      },
      professionnelle: {
        label: 'Professionnelle', monthlyPriceCents: 7990, memberLimit: 50,
        detail: 'Ajoute le contrôle qualité, le multi-site et le pilotage avancé de 50 agents.',
        additions: ['Jusqu’à 50 agents connectés', 'Rentabilité par chantier', 'Contrôle qualité', 'Anomalies et actions correctives', 'Stocks de produits', 'Multi-site et statistiques', 'Rôles Agent et Chef d’équipe'],
        features: cleaningProfessionnelle
      },
      metier: {
        label: 'Métier', monthlyPriceCents: 10990, memberLimit: 100,
        detail: 'Pour plus de 50 agents, plusieurs agences ou des processus spécifiques.',
        additions: ['Capacité et rôles sur mesure', 'Portail client', 'Marque blanche', 'Cahiers des charges et intégrations spécifiques'],
        features: [...cleaningProfessionnelle, 'cleaning_client_portal', ...customFeatures],
        startingAt: true
      }
    }
  },
  restauration: {
    id: 'restauration',
    label: 'Restauration',
    description: 'Équipe, réservations, menu, hygiène, stocks et rentabilité.',
    icon: 'utensils',
    launchStatus: 'available',
    accessUnitSingular: 'employé connecté',
    accessUnitPlural: 'employés connectés',
    plans: {
      decouverte: {
        label: 'Découverte', monthlyPriceCents: 2990, memberLimit: 1,
        detail: 'Le socle de gestion du restaurant sans accès employé.',
        additions: ['Employés et planning', 'Carte, plats et allergènes', 'Fournisseurs et stocks simples', 'Réservations saisies par le responsable', 'Prise de commande tactile et note provisoire', 'Fiches recettes et méthodes de préparation'],
        features: restaurantDecouverte
      },
      essentielle: {
        label: 'Essentielle', monthlyPriceCents: 4990, memberLimit: 10,
        detail: 'Ajoute les employés connectés, les réservations en ligne et le menu QR multilingue.',
        additions: ['Jusqu’à 10 employés connectés', 'Rôles Serveur et Cuisine', 'Réservation en ligne et éditeur libre du plan de salle', 'Menu QR en français, anglais, espagnol et italien', 'Traductions multilingues modifiables', 'Températures et checklists', 'Envoi des commandes vers l’écran Cuisine', 'Fiches recettes accessibles à l’équipe Cuisine', 'Personnalisation des documents et e-mails'],
        features: restaurantEssentielle,
        recommended: true
      },
      professionnelle: {
        label: 'Professionnelle', monthlyPriceCents: 7990, memberLimit: 50,
        detail: 'Ajoute le pilotage multi-site, les stocks avancés et la rentabilité.',
        additions: ['Jusqu’à 50 employés connectés', 'Rôle Manager', 'Multi-site, plusieurs salles et supervision', 'Inventaires, pertes et gaspillage', 'Commandes fournisseurs', 'Coût matière et marge par plat', 'Postes cuisine et suivi avancé des commandes', 'Déstockage automatique des plats servis', 'Traçabilité des mouvements de stock', 'Statistiques et exports'],
        features: restaurantProfessionnelle
      },
      metier: {
        label: 'Métier', monthlyPriceCents: 10990, memberLimit: 100,
        detail: 'Pour les groupes, franchises et intégrations spécifiques.',
        additions: ['Chaînes et franchises', 'Rôles et workflows personnalisés', 'Marque blanche', 'Connexion à une caisse certifiée', 'Intégrations livraison, comptabilité ou RH'],
        features: [...restaurantProfessionnelle, ...customFeatures],
        startingAt: true
      }
    }
  }
};

export const OFFER_FEATURE_LABELS: Record<OfferFeatureKey, string> = {
  public_booking: 'Réservation publique',
  confirmation_emails: 'Confirmations par e-mail',
  automatic_reminders: 'Rappels automatiques',
  online_booking_management: 'Modification et annulation en ligne',
  calendar_links: 'Ajout au calendrier',
  team_access: 'Comptes collaborateurs',
  manager_role: 'Rôle Responsable',
  commercial_branding: 'Personnalisation complète',
  coiffure_loyalty: 'Fidélité configurable',
  coiffure_client_portal: 'Espace client Coiffure',
  white_label: 'Marque blanche',
  multi_site: 'Plusieurs établissements',
  custom_modules: 'Modules à la carte',
  custom_roles: 'Rôles personnalisés',
  custom_domain: 'Domaine personnalisé',
  training_programs: 'Catalogue des formations',
  training_trainees: 'Gestion des stagiaires',
  training_trainers: 'Gestion des formateurs',
  training_sessions: 'Sessions et planning',
  training_documents: 'Documents de session',
  training_blank_attendance: 'Feuille d’émargement vierge imprimable',
  training_digital_attendance: 'Émargement numérique avec signatures',
  training_attendance_pdf: 'PDF d’émargement signé',
  training_automatic_certificates: 'Attestations automatiques',
  training_document_branding: 'Personnalisation des documents',
  training_email_branding: 'Personnalisation des e-mails',
  training_satisfaction: 'Évaluations de satisfaction',
  training_session_dossier: 'Dossier complet de session',
  training_commercial: 'CRM, relances, entreprises, financeurs et documents commerciaux',
  security_planning: 'Planning des agents',
  security_clients_sites: 'Clients et sites',
  security_site_rates: 'Tarif défini par site',
  security_scheduled_billing: 'Préfacturation liée aux heures programmées',
  security_final_billing: 'Factures depuis les vacations réalisées',
  security_document_branding: 'Logo sur les documents Sécurité',
  security_quotes: 'Devis prospects et conversion en client',
  security_bank_details: 'Coordonnées bancaires sur les documents',
  security_document_email: 'Envoi des devis et factures par e-mail',
  security_agent_portal: 'Espace terrain des agents',
  security_qr_patrols: 'Rondes QR',
  security_smart_logbook: 'Main courante intelligente',
  security_site_instructions: 'Alertes et consignes par site',
  security_logbook_pdf: 'Main courante PDF',
  security_geolocation: 'Géolocalisation',
  security_pti_sos: 'PTI / SOS',
  security_realtime_supervision: 'Supervision en temps réel',
  security_agent_roles: 'Rôles Agent et Chef de poste',
  security_client_portal: 'Portail client Sécurité',
  cleaning_clients_sites: 'Clients et sites',
  cleaning_planning: 'Planning et affectations',
  cleaning_scheduled_billing: 'Facturation des prestations programmées',
  cleaning_agent_portal: 'Espace terrain des agents',
  cleaning_time_clock: 'Pointage arrivée et départ',
  cleaning_site_instructions: 'Consignes par site',
  cleaning_visit_reports: 'Fiches de passage et rapports PDF',
  cleaning_before_after_photos: 'Photos avant / après',
  cleaning_quality_control: 'Contrôle qualité',
  cleaning_anomalies: 'Anomalies et actions correctives',
  cleaning_stock: 'Stocks de produits et matériel',
  cleaning_statistics: 'Statistiques opérationnelles',
  cleaning_agent_roles: 'Rôles Agent et Chef d’équipe',
  cleaning_protocols: 'Protocoles de nettoyage par site',
  cleaning_recurring_planning: 'Planification récurrente',
  cleaning_task_checklists: 'Checklists terrain',
  cleaning_profitability: 'Rentabilité par chantier',
  cleaning_client_portal: 'Portail client Nettoyage',
  restaurant_staff_planning: 'Employés et planning',
  restaurant_menu: 'Carte, menus et fiches plats',
  restaurant_allergens: 'Gestion structurée des allergènes',
  restaurant_suppliers: 'Fournisseurs',
  restaurant_basic_stock: 'Stocks simples',
  restaurant_manual_reservations: 'Réservations saisies par le responsable',
  restaurant_employee_portal: 'Espace employés',
  restaurant_basic_roles: 'Rôles Serveur et Cuisine',
  restaurant_online_reservations: 'Réservation en ligne',
  restaurant_floor_plan: 'Plan de salle et tables',
  restaurant_floor_editor: 'Éditeur visuel libre du plan de salle',
  restaurant_floor_advanced: 'Salles multiples et plan avancé',
  restaurant_multilingual_qr_menu: 'Menu QR français, anglais, espagnol et italien',
  restaurant_temperatures: 'Relevés de températures',
  restaurant_checklists: 'Checklists ouverture, fermeture et nettoyage',
  restaurant_document_email_branding: 'Personnalisation des documents et e-mails',
  restaurant_manager_role: 'Rôle Manager',
  restaurant_realtime_supervision: 'Supervision en temps réel',
  restaurant_advanced_stock: 'Stocks avancés',
  restaurant_inventory: 'Inventaires',
  restaurant_waste: 'Pertes et gaspillage',
  restaurant_supplier_orders: 'Commandes fournisseurs',
  restaurant_food_cost: 'Coût matière et marge par plat',
  restaurant_statistics: 'Statistiques et exports',
  restaurant_ordering: 'Prise de commande tactile et note provisoire',
  restaurant_kitchen_display: 'Écran Cuisine et suivi des préparations',
  restaurant_advanced_ordering: 'Postes cuisine et suivi avancé des commandes',
  restaurant_recipe_cards: 'Fiches recettes et méthodes de préparation',
  restaurant_recipe_kitchen: 'Fiches recettes accessibles en Cuisine',
  restaurant_auto_stock_consumption: 'Déstockage automatique des plats servis',
  restaurant_stock_traceability: 'Historique et traçabilité des mouvements de stock'
};

export function getDomainOffer(businessType: BusinessType) {
  return DOMAIN_OFFER_CATALOG[businessType];
}

export function getDomainOfferPlan(businessType: BusinessType, plan: Plan) {
  return DOMAIN_OFFER_CATALOG[businessType].plans[plan];
}
