# Changelog NCR Suite

## V2.26.0 — Cycle Stripe complet et données conservées

- Catalogue des `price_id` Stripe administrable par métier, formule et module.
- Stripe devient le moyen normal pour les abonnements et modules récurrents.
- Qonto est conservé uniquement pour les prestations et virements exceptionnels.
- Choix obligatoire du métier et de la formule avant le premier paiement.
- Espace métier verrouillé jusqu’à la confirmation du paiement Stripe.
- Rétrogradations programmées à la fin de la période en cours.
- Retrait des droits premium sans suppression des clients, dossiers, documents ou historiques.
- Réapparition des données dès qu’une formule ou un module compatible est réactivé.
- Ajout et retrait automatiques des modules Formation et Sécurité dans l’abonnement Stripe.
- Délai de grâce configurable après un paiement échoué, puis suspension des accès.
- Résiliation et gestion du moyen de paiement depuis le portail client Stripe.
- Affichage du statut, de la date d’effet et de la conservation des données côté client et super-administrateur.
- Migration `095`, Edge Function `manage-stripe-addon` et cache PWA `ncr-suite-shell-v2.26.0-stripe-billing`.
- Nouveau bundle autonome `ncr-suite-app-v260.js`.

## V2.25.0 — Facturation Stripe multi-métiers

- Checkout Stripe mensuel créé à la demande depuis la page Abonnement.
- Trois premiers Price Stripe configurés pour les offres Formation.
- Catalogue extensible à tous les métiers sans nouveau développement backend.
- Création et conservation des identifiants client et abonnement Stripe dans Supabase.
- Portail client Stripe accessible aux propriétaires et administrateurs.
- Webhook signé et idempotent pour les souscriptions, paiements, échecs et résiliations.
- Synchronisation automatique du plan, du statut, des périodes et des demandes.
- Notification super-administrateur lors des principaux événements de paiement.
- Secrets Stripe confinés aux Supabase Edge Functions.
- Trois Edge Functions autonomes, déployables directement depuis le tableau de bord Supabase.
- Correction du démarrage autonome du worker `stripe-webhook`.
- Migration `094` et cache PWA `ncr-suite-shell-v2.25.0-stripe-billing`.
- Nouveau bundle autonome `ncr-suite-app-v250.js`.

## V2.24.1 — Notifications super-admin sur écran verrouillé

- Acheminement des demandes super-administrateur dans la file Web Push serveur.
- Réception possible lorsque la PWA est fermée ou le téléphone verrouillé.
- Ouverture directe de la rubrique concernée depuis la notification.
- Marquage automatique comme lu après ouverture.
- Test Push programmé lors de l’activation du téléphone super-admin.
- Indication spécifique pour l’installation de la PWA sur iPhone.
- Isolation des erreurs Push afin qu’une demande client ne soit jamais bloquée.
- Migration `093` et cache PWA `ncr-suite-shell-v2.24.1-platform-admin-locked-screen-push`.
- Nouveau bundle autonome `ncr-suite-app-v241.js`.

## V2.24.0 — Accès portails et alertes super-administrateur

- Génération sécurisée d’un lien manuel pour les invitations Formation.
- Renouvellement automatique du lien pendant 7 jours et invalidation du précédent.
- Copie et partage natif du lien depuis l’entreprise sur ordinateur ou téléphone.
- Conservation de l’envoi automatique par e-mail et de la révocation existante.
- Accès central aux portails Formation, Sécurité, Nettoyage et Coiffure depuis la connexion.
- Formation clairement présentée pour les stagiaires, formateurs et clients.
- Nouvelle cloche dans la console super-administrateur avec compteur non lu.
- Alerte immédiate dans l’application et historique personnel des événements.
- Activation facultative des alertes système sur le téléphone.
- Notifications couvrant tickets, réponses support, accès, abonnements et modules Formation/Sécurité.
- Ouverture directe de la rubrique concernée depuis chaque notification.
- Migration `092` et cache PWA `ncr-suite-shell-v2.24.0-portal-access-support-alerts`.
- Nouveau bundle autonome `ncr-suite-app-v240.js`.
- Aucun retrait de portail, automatisation, droit ou fonction métier existante.

## V2.23.2 — Finitions visuelles et cadrage mobile

- Réduction d’environ 18 % des quatre cartes flottantes du premier écran.
- Conservation de leurs animations et de la réaction au pointeur.
- Survol bleu explicite pour Plateforme, Solutions métier, Offres et Se connecter.
- Même indication bleue lors de la navigation au clavier.
- Suppression des points finaux dans les grands titres de la vitrine.
- Correction du chevauchement entre le texte et les aperçus bento sur mobile.
- Aperçus mobiles replacés dans le flux normal sous leur contenu.
- Présentation des cinq métiers en deux colonnes sur petit écran.
- Migration `091` synchronisant Supabase, le frontend et le cache PWA en `2.23.2`.
- Nouveau bundle `ncr-suite-app-v232.js` et cache `ncr-suite-shell-v2.23.2-showcase-polish`.
- Aucun changement de tarif, fonction métier, automatisation, droit ou donnée.

## V2.23.1 — Vitrine signature et bento animé

- Nouveau premier écran composé de quatre mini-interfaces bento animées.
- Réaction douce des cartes au déplacement du pointeur sur ordinateur.
- Mouvement lent maintenu sur Safari lorsque la réduction des animations est active.
- Indicateurs `01` à `04` agrandis dans le parcours opérationnel.
- Suppression de la pastille bleue qui recouvrait l’icône Collecter.
- Nouvelle progression lumineuse sans élément parasite.
- Présentation du socle transformée en grille bento contrastée et animée.
- Aperçus visuels dédiés aux métiers, modules, rôles et appareils.
- Interactions du catalogue tarifaire affinées sans modifier les prix validés.
- Migration `090` synchronisant Supabase, le frontend et le cache PWA en `2.23.1`.
- Nouveau bundle `ncr-suite-app-v231.js` et cache `ncr-suite-shell-v2.23.1-signature-showcase`.
- Aucun retrait de fonction, automatisation, droit ou donnée métier existante.

## V2.23.0 — Vitrine premium et catalogue tarifaire métier

- Mouvement renforcé et différencié des quatre signaux du premier écran.
- Parcours opérationnel relié par une progression animée de la collecte jusqu’à la décision.
- Nouveau catalogue tarifaire interactif pour les cinq métiers.
- Vingt offres synchronisées avec les prix et capacités du catalogue central validé.
- Formule Essentielle mise en avant selon la recommandation actuelle de chaque gamme.
- Présentation détaillée des accès inclus et des fonctions clés par formule.
- Correction du logo NCR Suite dans le pied de page de la demande d’accès.
- Migration `089` synchronisant Supabase, le frontend et le cache PWA en `2.23.0`.
- Nouveau bundle autonome `ncr-suite-app-v230.js` et nouveau cache `ncr-suite-shell-v2.23.0-premium-catalog`.
- Aucun retrait de fonction, automatisation, droit ou donnée métier existante.

## V2.22.4 — Démarrage Cloudflare résilient

- Correction de l’échec réel du module dynamique `PublicHomePage` observé en production.
- Regroupement du démarrage dans `ncr-suite-app-v2224.js`, servi à la racine.
- Suppression de la dépendance de la vitrine aux fragments JavaScript générés dans `/assets`.
- Feuille de style complète servie à la racine sous `ncr-suite-app-v2224.css`.
- Feuille critique animée servie sous `ncr-suite-showcase-v2224.css`.
- Conservation de toutes les animations, interactions et transitions de la V2.22.2.
- Page de récupération désormais stylée même en cas d’incident applicatif.
- Cache PWA renouvelé sous `ncr-suite-shell-v2.22.4-asset-resilience`.
- Contrôles automatiques vérifiant l’absence de fragmentation au prochain build.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.3 — Fiabilité Safari de la vitrine animée

- Conservation intégrale des animations et interactions introduites en V2.22.2.
- Nouvelle feuille critique légère dédiée à la vitrine et chargée avant le style général.
- Génération automatique de cette feuille depuis les styles officiels à chaque build.
- Type MIME `text/css` explicite pour les styles Cloudflare.
- Type MIME JavaScript explicite pour les modules de l’application.
- Écran de préparation NCR Suite empêchant l’affichage temporaire d’un HTML brut.
- Récupération automatique unique si les styles ne sont pas disponibles.
- Contrôle distinct de la vitrine publique et des styles complets de la connexion.
- Nouveau cache `ncr-suite-shell-v2.22.3-safari-styles`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.2 — Mouvement premium et lancement PWA

- Suppression de la croix, du carré central et du repère bleu présents dans le hero ordinateur.
- Court écran d’introduction NCR Suite affiché une seule fois par session.
- Mouvements continus et discrets des signaux Relation client, Planning, Documents et Conformité.
- Présentation de ces quatre signaux également sur mobile.
- Apparition progressive des sections pendant le défilement.
- Réactions professionnelles au survol, au clic, au toucher et au changement de métier.
- Respect du réglage système réduisant les animations.
- Ouverture directe de la PWA installée sur la page de connexion.
- Conservation de la vitrine publique sur `https://ncr-suite.fr` dans un navigateur normal.
- Récupération automatique unique des erreurs de module provoquées par un ancien cache PWA.
- Cache PWA synchronisé en `ncr-suite-shell-v2.22.2-motion-pwa-recovery`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.1 — Vitrine premium et catalogue métier

- Nouvelle première impression centrée sur le logo NCR Suite, sans photographie générique.
- Animation épurée reliant relation client, planning, documents et conformité autour de la marque.
- Présentation produit détaillée avec aperçu réaliste du poste de pilotage.
- Catalogue interactif pour Formation, Sécurité privée, Nettoyage, Restauration et Coiffure & beauté.
- Mise en avant claire des modules et du résultat opérationnel de chaque métier.
- Parcours visuel Collecter, Orchestrer, Prouver et Piloter.
- Présentation simplifiée de la montée en gamme et de la comparaison tarifaire déjà disponible dans l’application.
- Logos officiels haute définition dans l’en-tête et signature Retina dans le pied de page.
- Nouvelle image Open Graph sans texte coupé pour les partages et résultats enrichis.
- Responsive renforcé pour ordinateur, tablette et mobile.
- Cache PWA synchronisé en `ncr-suite-shell-v2.22.1-premium-showcase`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.0 — Lancement commercial, domaine et accès contrôlés

- Nouvelle page publique complète présentant NCR Suite, ses cinq métiers, sa plateforme et sa montée en gamme.
- Séparation nette entre le site public, la connexion et l’application privée.
- Suppression de la création libre d’un espace depuis la page de connexion.
- Formulaire de demande d’accès protégé par Cloudflare Turnstile, limitation de débit et pot de miel.
- Nouvelle file de demandes dans l’administration centrale NCR.
- Acceptation, refus et renvoi d’invitation réservés au super-administrateur.
- Invitation et récupération de mot de passe personnalisées depuis `contact@ncr-suite.fr`.
- Création d’entreprise refusée en base sans demande préalablement acceptée.
- Préremplissage de la configuration avec les informations validées lors de la demande.
- Domaine canonique `https://ncr-suite.fr` dans les liens, e-mails, métadonnées et données structurées.
- Redirection contrôlée de `ncrsuite.pages.dev` et `www.ncr-suite.fr` vers le domaine principal.
- SEO technique avec canonical, Open Graph, Twitter Card, Schema.org, robots et sitemap.
- Guides complets IONOS, Cloudflare, Supabase, Brevo, SPF, DKIM et DMARC.
- Cache PWA et validation production synchronisés en V2.22.0.

## V2.21.2 — Validation production finale

- Identification des 188 fonctions publiques comme objets d'extensions PostgreSQL gérés par Supabase.
- Inventaire séparé des fonctions d'extensions sans changement de propriétaire, de rôle ou d'ACL.
- Maintien du blocage pour toute véritable fonction applicative publique hors liste autorisée.
- Reclassement des tables internes fermées par RLS comme inventaire non bloquant.
- Prévention des droits publics par défaut sur les prochaines fonctions créées par `postgres`.
- Durcissement final des anciennes fonctions `SECURITY DEFINER` déjà présentes dans Supabase.
- Ajout automatique d'un chemin de recherche sûr sans recréer les traitements existants.
- Interdiction de créer des objets dans le schéma public pour les rôles applicatifs.
- Contrôle transactionnel empêchant une installation partielle du correctif de sécurité.
- Correctif de production : suppression des droits anonymes hérités sur les fonctions internes.
- Conservation exacte des accès déjà disponibles pour les utilisateurs connectés et les traitements de service.
- Liste explicite des 22 fonctions nécessaires aux réservations, questionnaires et invitations publiques.
- Correction du faux blocage « Demandes de modules Formation » lorsque le compteur vaut zéro.
- Nouveau verdict de production réservé au super-administrateur NCR.
- Contrôles automatiques des versions, droits, abonnements, files d’envoi et erreurs navigateur.
- Vérification des automatisations Formation, imports, sessions, portails et signatures.
- Liste manuelle de mise en production obligatoire avant l’enregistrement du contrôle.
- Historique horodaté des validations avec auteur et résultats détaillés.
- Exports JSON et CSV du rapport, plus export CSV de l’historique.
- Conservation des contrôles de surveillance et de préparation V2.20 déjà validés.
- Cache PWA, migration Supabase et tests Cloudflare synchronisés.

## V2.21.1 — Reprise de données Formation

- Conservation des imports existants des stagiaires, formateurs et programmes.
- Contrôle serveur du fichier avant toute écriture dans Supabase.
- Reprise guidée des entreprises clientes, financeurs et prospects CRM.
- Import des sessions à venir en brouillon pour éviter les envois automatiques.
- Reprise des sessions historiques réalisées sans relancer les anciennes automatisations.
- Import des inscriptions, catégories BPF et heures suivies.
- Détection des doublons et validation des dépendances entre les fichiers.
- Rapport d’erreurs CSV et historique détaillé de chaque opération.
- Cache PWA et contrôles de livraison synchronisés.

## V2.21.0 — Espaces Formation et signatures traçables

- Nouveaux espaces sécurisés pour les stagiaires, formateurs et clients.
- Invitations personnelles par e-mail avec création ou connexion au compte existant.
- Vue des sessions, documents, évaluations et émargements selon le profil.
- Dépôt de pièces directement dans le dossier général ou la session choisie.
- Partage de documents existants, devis, conventions, contrats et factures.
- Demandes de signature avec consultation préalable, échéance et relances.
- Empreinte SHA-256 du document et de la preuve, référence unique et historique horodaté.
- Enregistrement automatique de la preuve dans le dossier Qualiopi.
- Console organisme pour ouvrir, suspendre et diagnostiquer les accès externes.
- Nouveau module `Portails et signatures` à la carte sur Découverte et Essentielle.
- Inclusion dans les offres Professionnelle et Métier, avec comparaison tarifaire de la V2.20.
- Nouveau cache PWA et contrôles automatiques de sécurité, droits et parcours critiques.

## V2.20.1 — Modules Formation visibles sous cadenas

- Conservation des modules Formation non inclus dans les menus ordinateur et mobile.
- Cadenas et badge de l’offre nécessaire sur chaque rubrique concernée.
- Écran de présentation dédié sans accès aux données du module verrouillé.
- Bouton de montée en gamme ouvrant directement le bon module dans `Mon abonnement`.
- Mise en évidence automatique de la carte correspondant au module demandé.
- Redirection des configurations Métier vers leur espace contractuel.
- Accès inchangé pour les modules déjà inclus ou activés à la carte.
- Contrôles automatisés des routes Formation, des droits, de la migration et du cache PWA.

## V2.20.0 — Stabilisation finale et modules Formation à la carte

- Ajout de dix modules Formation sélectionnables depuis `Mon abonnement`.
- Affichage du tarif de chaque module, du total actuel et du total après validation.
- Recommandation automatique de l’offre supérieure dès qu’elle devient plus avantageuse.
- Gestion des dépendances entre CRM, facturation et BPF.
- Demandes d’ajout ou de retrait validées depuis l’administration NCR.
- Liens Qonto facultatifs configurables séparément pour chaque module Formation.
- Désactivation automatique des suppléments devenus inclus après une montée de formule.
- Séparation des droits `Émargement numérique` et `Dossier complet de session`.
- Rapport super administrateur de préparation et d’intégrité multi-métiers.
- Nouveau test de release transversal pour les routes, droits, migrations et caches PWA.
- Nettoyage du cache PWA limité aux caches NCR Suite.

## V2.19.0 — Formation · Qualiopi, conformité et preuves

- Nouveau module `Qualiopi & conformité` réservé aux responsables Formation.
- Référentiel interne structuré en 7 critères et 32 indicateurs.
- Statut, applicabilité, responsable, échéance, constat et actions par indicateur.
- Réutilisation automatique des programmes, convocations, supports, attestations et évaluations déjà présents.
- Dépôt de preuves complémentaires avec date, expiration et session liée.
- Détection des indicateurs sans preuve et des preuves à renouveler.
- Calendrier des audits initial, surveillance, renouvellement et interne.
- Résultat d’audit et photographie des indicateurs et preuves lors de la clôture.
- Exports de préparation PDF et CSV.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA et audits techniques synchronisés en V2.19.0.

## V2.18.0 — Formation · Facturation et encaissements

- Création de factures depuis les dossiers commerciaux acceptés, signés ou réalisés.
- Facturation partielle et partage entre client et financeur sans dépasser le montant commercial.
- Numérotation définitive par organisme et par exercice lors de l’émission.
- Factures et avoirs PDF avec identité figée du vendeur et du payeur.
- Historique des encaissements partiels ou complets et calcul du solde.
- Suivi des échéances, retards et relances automatiques Brevo.
- Réglages de paiement, mentions TVA, pénalités et coordonnées bancaires.
- BPF alimenté par les factures et avoirs émis dès qu’ils existent sur l’exercice.
- Conservation du calcul commercial V2.17.0 pour les anciens exercices sans facture.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.18.0.

## V2.17.0 — Formation · BPF automatique

- Nouveau module annuel `BPF automatique`.
- Calcul des produits HT selon les rubriques du cadre C du Cerfa 10443*17.
- Saisie contrôlée du chiffre d’affaires et des charges du cadre D.
- Calcul des formateurs, stagiaires, heures-stagiaires, objectifs et spécialités des cadres E, F1 à F4 et G.
- Proratisation des heures à partir des émargements, avec possibilité de correction explicite.
- Classification centrale des publics, programmes, formateurs, modes de réalisation et produits commerciaux.
- Préclassement automatique uniquement lorsque les données permettent une déduction fiable.
- Contrôles bloquants et points de vigilance avant validation.
- Brouillon annuel, statut vérifié, verrouillage et réouverture réservée aux responsables.
- Exports préparatoires PDF et CSV.
- Cloisonnement multi-entreprises, rôles et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.17.0.

## V2.16.0 — Formation · CRM et pipeline commercial

- Nouveau pipeline CRM intégré au module commercial Formation.
- Gestion des prospects et opportunités de la prise de contact jusqu’à la vente gagnée ou perdue.
- Suivi du montant potentiel, de la probabilité et de la date de décision estimée.
- Liste centralisée des relances et signalement des actions en retard.
- Historique des appels, e-mails, rendez-vous, tâches et notes.
- Transformation d’un prospect en fiche client sans ressaisie.
- Préparation d’un devis directement depuis une opportunité.
- Synchronisation automatique du pipeline avec le statut du dossier commercial.
- Cloisonnement multi-entreprises, contrôle par rôle et RLS Supabase.
- Cache PWA, producteurs PDF et audits synchronisés en V2.16.0.

## V2.15.4 — Super administration · SAV Formation

- Nouvelle console `SAV Formation` dans l’administration centrale, visible uniquement par les super administrateurs NCR.
- Vue globale des organismes Formation et des automatisations nécessitant une intervention.
- Diagnostic par session des évaluations initiales/finales, attestations, dossiers documentaires et e-mails en échec.
- Relance guidée des jobs documentaires et des e-mails Formation.
- Réparation contrôlée d’une session en réutilisant les automatisations validées en V2.15.2 et V2.15.3.
- Migration 075 sécurisée par le contrôle `is_platform_super_admin`.
- Cache PWA, producteurs PDF, processeur e-mail et monitoring synchronisés en V2.15.4.
## V2.15.3 — Formation · Intégrité des automatisations

- Ajout de la migration 074 pour rendre la file `training_document_jobs` autoportante dans le dépôt.
- Déclaration explicite des métadonnées de documents automatiques (`automation_key`, `generated_at`, `emailed_at`).
- Fonctions service-role de traitement documentaire : claim des jobs et payload PDF.
- Garde SQL contre la planification directe d’une session sans validation officielle.
- L’écran Sessions crée désormais en brouillon puis valide via `validate_training_session_workflow` lorsque le statut demandé est planifié ou en cours.
- Lecture complète des champs d’évaluations initiales/finales dans le PDF direct de session.
- Cache PWA et monitoring synchronisés en V2.15.3.

## V2.15.2 — Formation · Déroulement et clôture automatisés

- Évaluation initiale individuelle envoyée par Brevo lors de la validation de session.
- Évaluation finale individuelle envoyée par Brevo lors de la fin de session.
- Relances automatiques configurables pour les questionnaires sans réponse.
- Questionnaire public unique adapté au début ou à la fin de formation.
- Génération et envoi automatique des attestations selon les réglages de l’organisme.
- Contrôle automatique des émargements, évaluations et attestations.
- Finalisation automatique du dossier complet.
- Nouveau centre d’évaluations moderne et responsive.
- Cockpit et dossiers de formation raccordés à la clôture automatisée.
- Cache PWA et état de version synchronisés en V2.15.2.

## V2.15.1 — Formation · Documents premium & Brevo

- Moteur documentaire premium commun.
- Envois Brevo des documents commerciaux et convocations.
