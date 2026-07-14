# NCR Suite V2.3 — Mise en place de l’offre Métier

## 1. Migration Supabase

Exécuter dans **SQL Editor** après la migration `012_qonto_billing_portal.sql` :

```text
supabase/migrations/013_metier_workspace.sql
```

Résultat attendu :

```text
Success. No rows returned
```

## 2. Déploiement de l’application

Envoyer les fichiers V2.3.0 sur GitHub. Cloudflare Pages redéploie automatiquement avec :

```text
Build command: npm run build
Build output directory: dist
```

Aucune modification de l’Edge Function Brevo ni aucun nouveau secret n’est nécessaire.

## 3. Activer une entreprise Métier

1. Ouvrir **Administration NCR → Entreprises**.
2. Passer l’entreprise sur la formule **Métier**.
3. Ouvrir l’onglet **Offres Métier**.
4. Définir :
   - la limite d’utilisateurs ;
   - la limite d’établissements ;
   - le stockage prévu ;
   - les frais de configuration ;
   - la référence du contrat ;
   - les modules inclus ;
   - la marque blanche ;
   - le domaine personnalisé et son état.

Les modules contractuels sont gérés uniquement depuis l’administration NCR. L’entreprise peut ensuite gérer ses établissements et ses rôles personnalisés depuis **Configuration Métier**.

## 4. Domaine personnalisé

NCR Suite enregistre le domaine et son statut, mais le rattachement DNS reste manuel :

1. ajouter le domaine dans Cloudflare Pages ;
2. créer les enregistrements DNS demandés ;
3. attendre la validation ;
4. passer le statut sur **Actif** dans Administration NCR ;
5. mettre à jour les URL autorisées dans Supabase Auth si le domaine sert à la connexion.

## 5. Limite actuelle

La V2.3 rend l’offre Métier opérationnelle comme infrastructure commerciale et technique. Les modules sectoriels affichés comme « Structure prête » seront développés progressivement à partir de la V2.4. Le pack Coiffure & Beauté reste pleinement fonctionnel.
