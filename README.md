# NCR Suite — V2.4.9

## V2.4.9 — Offres Formation et dossier complet

Cette version applique réellement la répartition commerciale validée pour le domaine Formation :

- **Découverte** : gestion des formations, stagiaires, formateurs et sessions, documents, feuille d’émargement vierge et attestations automatiques ;
- **Essentielle** : ajoute l’émargement numérique avec signatures, le PDF d’émargement et la personnalisation des documents et des e-mails ;
- **Professionnelle** : ajoute les évaluations de satisfaction, le dossier complet de session, le multi-site et les accès employés avec rôles ;
- **Métier** : conserve la configuration sur mesure existante sans réactiver les modules volontairement désactivés.

La rubrique **Mon abonnement** présente désormais chaque formule de manière progressive, uniquement avec les options qu’elle ajoute. Les menus, routes et opérations Supabase sont contrôlés selon les droits réels de l’offre.

La procédure de mise à jour est détaillée dans `docs/V2.4.9_INSTALLATION.md`.

## V2.4.8 — Signatures visibles et téléchargements fiables

Cette version fiabilise les documents du pack Formation :

- recadrage automatique des signatures manuscrites avant insertion dans le PDF ;
- signatures du matin et de l’après-midi agrandies et visibles dans leurs cellules ;
- génération du PDF maintenue même si une ancienne signature est temporairement inaccessible ;
- visualisation des documents ouverte dès le clic pour éviter le blocage Safari ;
- téléchargement des attestations et documents via une URL Supabase signée avec un nom de fichier propre ;
- page de téléchargement de secours pour les PDF d’émargement sur iPhone, iPad et PWA ;
- conservation de tous les accès aux attestations et PDF ajoutés en V2.4.7.

Aucune nouvelle migration SQL et aucun changement de l’Edge Function ne sont nécessaires pour passer de la V2.4.7 à la V2.4.8.

La procédure de mise à jour est détaillée dans `docs/V2.4.8_INSTALLATION.md`.

## V2.4.6 — Évaluations et satisfaction Formation

Cette version complète le cycle qualité du pack Formation :

- questionnaire individuel envoyé automatiquement quand une session est terminée ;
- formulaire public sans compte stagiaire ;
- notes sur le contenu, le formateur, l’organisation et les objectifs ;
- recommandation, commentaires et pistes d’amélioration ;
- statistiques et suivi des réponses dans **Formation → Évaluations** ;
- réglage du délai d’envoi et relance manuelle.

Après le SQL 022, exécuter :

```text
supabase/migrations/023_training_satisfaction.sql
```

Puis redéployer la fonction `process-email-queue` avec la version V2.4.6. Aucun nouveau secret ni nouveau Cron n’est nécessaire.

## V2.4.5 — Convocations et attestations automatiques

Cette version automatise le cycle documentaire Formation :

- génération d’une convocation PDF individualisée quand une session est planifiée ;
- envoi automatique au stagiaire par Brevo avec le PDF en pièce jointe ;
- génération d’une attestation de fin lorsque la session est terminée et qu’une présence signée existe ;
- classement automatique dans la bibliothèque Documents ;
- boutons de régénération et de renvoi depuis la fiche de session ;
- suivi des traitements en attente, terminés ou en erreur.

Après le SQL 021, exécuter :

```text
supabase/migrations/022_training_automatic_documents.sql
```

Puis redéployer la fonction `process-email-queue`, car elle génère désormais les PDF, les stocke et les joint aux e-mails transactionnels.


## V2.4.4 — Émargements et signatures Formation

Le formateur peut sélectionner une session, une journée et la période **matin** ou **après-midi**, puis faire signer chaque stagiaire directement sur son téléphone ou sa tablette. Les absences et absences justifiées sont également suivies.

Les signatures sont privées, horodatées et rattachées à la session, au stagiaire, à la période et à l’utilisateur qui les a capturées.

Après le SQL 020, exécuter :

```text
supabase/migrations/021_training_attendance.sql
```

## V2.4.3 — Bibliothèque documentaire Formation

Le pack Formation dispose désormais d’une bibliothèque sécurisée pour classer et télécharger :

- convocations ;
- programmes ;
- supports pédagogiques ;
- attestations ;
- documents administratifs.

Chaque fichier peut être rattaché à une session et, si nécessaire, à un stagiaire précis. Le stockage Supabase est privé, limité à 20 Mo par fichier et isolé par entreprise.

Après le SQL 019, exécuter :

```text
supabase/migrations/020_training_documents.sql
```

L’émargement et les signatures restent la prochaine évolution du pack Formation.

## V2.4.2 — Tarification distincte par domaine

Les quatre niveaux restent communs à NCR Suite : **Découverte, Essentielle, Professionnelle et Métier**. En revanche, chaque domaine possède désormais son propre catalogue de prix, ses propres fonctions affichées et ses propres liens de paiement Qonto.

Tarifs Formation intégrés :

- Découverte : 39,90 € HT / mois ;
- Essentielle : 69,90 € HT / mois ;
- Professionnelle : 99,90 € HT / mois ;
- Métier : sur étude, avec une base contractuelle de 149,90 € HT / mois.

La Coiffure conserve 9,90 €, 19,90 € et 39,90 €. Les autres domaines restent inchangés jusqu’à leur développement.

Après le SQL 018, exécuter :

```text
supabase/migrations/019_domain_plan_catalog.sql
```


## V2.4.1 — Créer plusieurs espaces avec le même compte

Depuis **Administration NCR → Entreprises → Créer un espace**, le super-administrateur peut rattacher un nouvel espace à un compte NCR Suite existant.

Chaque espace possède obligatoirement :

- un domaine métier unique ;
- ses propres données ;
- sa formule et son tarif mensuel ;
- ses modules compatibles ;
- son abonnement indépendant.

Exemple : le même compte peut accéder à **Bella Coiffure** et **Bella Formation**, puis changer d’espace depuis le menu de compte. Une nouvelle adresse e-mail n’est pas nécessaire.

Après `017_training_pack_core.sql`, exécuter :

```text
supabase/migrations/018_admin_create_organization_space.sql
```

Le compte propriétaire doit déjà exister dans Supabase Auth et avoir confirmé son adresse. Un compte super-administrateur NCR ne peut pas être utilisé comme propriétaire d’entreprise.


## V2.4 — Pack Formation, première phase

Cette version rend opérationnels les modules suivants pour les espaces de type **Formation** :

- catalogue de formations ;
- stagiaires ;
- formateurs ;
- sessions et inscriptions ;
- tableau de bord réel ;
- filtrage par établissement en offre Métier.

Après les migrations précédentes, exécuter :

```text
supabase/migrations/017_training_pack_core.sql
```

Les modules Documents, Émargements et Attestations restent visibles comme étapes suivantes, mais ne sont pas encore fonctionnels dans cette version.

NCR Suite est une plateforme multi-entreprises indépendante de NCR Academy. Chaque entreprise dispose de son espace, de ses données isolées et des modules correspondant à son activité.


## V2.3 — Offre Métier opérationnelle

- Configuration contractuelle par entreprise : limites d’utilisateurs, établissements, stockage et frais de mise en service.
- Gestion multi-établissements avec site principal, activation, désactivation et archivage.
- Modules métier activables à la carte ; les rubriques désactivées disparaissent de la navigation.
- Rôles personnalisés avec niveau de sécurité système et sélection des rubriques visibles.
- Attribution des rôles personnalisés aux membres existants.
- Marque blanche activable uniquement par NCR et domaine personnalisé avec suivi de validation DNS.
- Nouvel onglet **Offres Métier** dans l’administration centrale.
- Nouvelle page **Configuration Métier** dans l’espace des entreprises concernées.

Après les migrations 001 à 012, exécuter :

```text
supabase/migrations/013_metier_workspace.sql
```

Important : NCR Suite enregistre et suit le domaine personnalisé, mais l’ajout DNS et le rattachement à Cloudflare Pages restent une opération manuelle et contrôlée.

Limite actuelle : la V2.3 permet de créer et administrer plusieurs établissements, mais les rendez-vous, collaborateurs et données opérationnelles du pack Coiffure & beauté ne sont pas encore rattachés à un établissement précis. Ce rattachement sera ajouté avec le premier pack métier multi-site.


## V2.2 — Abonnements Qonto

- Page **Mon abonnement** dans chaque espace entreprise.
- Comparatif dynamique des formules et compteurs d’utilisation.
- Liens de paiement récurrents Qonto configurables depuis Administration NCR.
- Validation manuelle du paiement avant l’activation de la formule.
- Période d’essai configurable et expiration automatique.
- Conditions d’abonnement versionnées et historique complet.
- Modèle de données indépendant du prestataire pour préparer Stripe plus tard.

Après les migrations 001 à 011, exécuter :

```text
supabase/migrations/012_qonto_billing_portal.sql
```

La procédure détaillée est disponible dans `docs/QONTO_BILLING_SETUP.md`.


## V2.0.2 — Accès administrateur et mobile

- Le rôle plateforme est détecté automatiquement après authentification.
- Un Super-administrateur ou un compte Support est envoyé exclusivement vers `/administration-ncr`.
- Les utilisateurs d’entreprise restent dirigés vers leur espace métier ; les collaborateurs vers les rubriques autorisées par leur rôle.
- Sur mobile, toutes les rubriques sont regroupées dans un menu latéral `☰`, avec une barre basse limitée aux actions essentielles.
- La page globale ne défile plus horizontalement. Le planning et les tableaux conservent un défilement local contrôlé lorsqu’il est nécessaire.
- Cette mise à jour ne nécessite aucune migration SQL supplémentaire. La migration `010_platform_admin_subscriptions.sql` doit déjà être installée.

## Pack Coiffure & beauté opérationnel

- Authentification Supabase et création d’entreprise.
- Clients, prestations et profils collaborateurs.
- Horaires, pauses et prestations attribuées.
- Rendez-vous internes et planning jour/semaine.
- Réservation publique selon les disponibilités réelles.
- Modification et annulation via un lien privé.
- Confirmations, alertes et rappels par Brevo.
- Comptes d’équipe séparés avec rôles et permissions.
- Isolation multi-entreprises et RLS Supabase.
- PWA responsive pour mobile et ordinateur.

## Offres d’accès équipe

- **Découverte** : 1 compte propriétaire.
- **Essentielle** : jusqu’à 3 utilisateurs, rôle Collaborateur.
- **Professionnelle** : jusqu’à 10 utilisateurs, rôles Responsable et Collaborateur.
- **Métier** : limites contractuelles, établissements multiples, modules à la carte, rôles personnalisés, marque blanche et domaine propre.

## Migrations Supabase

Pour une nouvelle installation, exécuter dans l’ordre :

1. `001_core.sql`
2. `002_booking_pack.sql`
3. `003_staff_availability.sql`
4. `004_appointments.sql`
5. `005_public_booking.sql`
6. `006_email_notifications.sql`
7. `007_team_access.sql`

Pour une installation déjà en V1.6.1, exécuter uniquement `007_team_access.sql`.

## Mise à jour de l’Edge Function

La V1.8 ajoute le consentement client, les règles de réservation configurables et l’ajout au calendrier. La V1.7 avait ajouté l’e-mail d’invitation d’équipe. Remplacer le code de la fonction Supabase `process-email-queue` par :

`supabase/functions/process-email-queue/index.ts`

Puis enregistrer et redéployer la fonction. Les secrets Brevo existants restent inchangés.

## Développement local

```bash
npm install
npm run dev
```

Variables :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-publique
```

## Cloudflare Pages

```text
Build command: npm run build
Build output directory: dist
```

La procédure détaillée de la V1.7 est disponible dans `docs/TEAM_ACCESS_SETUP.md`.


## Migration V1.8

1. Exécuter `supabase/migrations/008_client_experience.sql`.
2. Remplacer le code de l’Edge Function `process-email-queue` par `supabase/functions/process-email-queue/index.ts`.
3. Déployer le code sur GitHub puis attendre le déploiement Cloudflare.
4. Configurer les textes dans **Paramètres → Expérience client**.


## V1.9 — Personnalisation commerciale

La formule Professionnelle permet de personnaliser la page de réservation et les e-mails avec le nom commercial, le logo, la couleur, une bannière, une adresse, des horaires et des informations pratiques. Voir `docs/COMMERCIAL_BRANDING_SETUP.md`.

## Administration centrale V2.0

Après les migrations 001 à 009, exécuter `supabase/migrations/010_platform_admin_subscriptions.sql`.

Puis autoriser une seule fois le compte NCR depuis le SQL Editor :

```sql
select public.bootstrap_platform_admin(
  'TON_ADRESSE_DE_CONNEXION_NCR',
  'super_admin'
);
```

L’espace central devient accessible à l’adresse `/administration-ncr`. Le rôle `support` peut consulter, tandis que `super_admin` peut modifier les formules et suspendre les espaces.

La V2.2 utilise Qonto avec validation manuelle sécurisée. Les champs génériques permettent d’ajouter Stripe plus tard sans reconstruire le portail d’abonnement.


## Migration V2.1

Après les migrations 001 à 010, exécuter `supabase/migrations/011_plan_entitlements_mobile.sql` avant de déployer la V2.1. Cette migration applique réellement les limites de formule et sécurise les fonctions publiques côté Supabase.