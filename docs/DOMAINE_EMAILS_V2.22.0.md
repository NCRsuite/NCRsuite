# Domaine et délivrabilité - NCR Suite V2.22.0

## Avant de modifier IONOS

Relever tous les enregistrements DNS actuellement utilisés par le domaine :
`MX`, `TXT`, `CNAME` et éventuels sous-domaines. Si la boîte
`contact@ncr-suite.fr` est hébergée chez IONOS, ses enregistrements MX doivent
être recréés dans Cloudflare avant le changement de serveurs DNS.

## 1. Ajouter le domaine dans Cloudflare

1. Dans Cloudflare, choisir `Add a domain`.
2. Ajouter `ncr-suite.fr`.
3. Importer et contrôler tous les enregistrements DNS existants.
4. Copier les deux serveurs DNS fournis par Cloudflare.
5. Dans IONOS, ouvrir le domaine puis remplacer ses serveurs DNS par ceux de
   Cloudflare.
6. Attendre que la zone soit marquée `Active` dans Cloudflare.

## 2. Raccorder Cloudflare Pages

1. Ouvrir `Workers & Pages > NCR Suite > Custom domains`.
2. Choisir `Set up a custom domain`.
3. Ajouter d’abord `ncr-suite.fr`, puis `www.ncr-suite.fr`.
4. Laisser Cloudflare créer les enregistrements demandés.
5. Attendre `Active` et vérifier le certificat HTTPS.

Ne pas activer la redirection canonique avant que `https://ncr-suite.fr`
s’ouvre correctement.

## 3. Cloudflare Turnstile

1. Ouvrir `Turnstile > Add widget`.
2. Autoriser `ncr-suite.fr` et `www.ncr-suite.fr`.
3. Placer la `Site key` dans `VITE_TURNSTILE_SITE_KEY` sur Cloudflare Pages.
4. Placer la `Secret key` dans `TURNSTILE_SECRET_KEY` sur Supabase.

## 4. Authentifier le domaine dans Brevo

Dans `Brevo > Paramètres > Expéditeurs et IP > Domaines` :

1. ajouter `ncr-suite.fr` ;
2. demander l’authentification du domaine ;
3. recopier exactement dans Cloudflare les valeurs DKIM et les autres valeurs
   proposées par Brevo ;
4. attendre que Brevo affiche le domaine comme authentifié.

Les noms et valeurs DKIM sont propres au compte Brevo : ne pas les inventer et
ne pas reprendre celles d’un autre domaine.

## 5. SPF

Il ne doit exister qu’un seul enregistrement SPF pour `ncr-suite.fr`.
S’il existe déjà, ajouter le mécanisme Brevo indiqué par Brevo dans ce même
enregistrement. Ne jamais publier deux lignes commençant par `v=spf1`.

Conserver les mécanismes nécessaires à IONOS si la boîte envoie aussi depuis
IONOS.

## 6. DMARC

Commencer en observation avec un seul enregistrement TXT nommé `_dmarc` :

```text
v=DMARC1; p=none; rua=mailto:contact@ncr-suite.fr; adkim=s; aspf=s; pct=100
```

Après plusieurs semaines de rapports propres et sans source légitime oubliée,
passer progressivement à `p=quarantine`, puis éventuellement à `p=reject`.

## 7. Réduire les indésirables

- utiliser uniquement `NCR Suite <contact@ncr-suite.fr>` pour les e-mails de
  compte et les e-mails transactionnels de la plateforme ;
- conserver une adresse `Reply-To` réelle ;
- désactiver le suivi des liens et pixels pour les e-mails d’authentification ;
- séparer plus tard le marketing sur un sous-domaine dédié si des campagnes
  commerciales sont lancées ;
- ne jamais acheter de liste d’adresses ;
- supprimer les adresses en erreur permanente dans Brevo ;
- garder des objets d’e-mail clairs, sans majuscules excessives ni pièces
  jointes inutiles.

## 8. Validation

Envoyer un e-mail d’invitation et un e-mail de récupération vers Gmail et
Outlook. Dans Gmail, ouvrir `Afficher l’original` et confirmer :

```text
SPF: PASS
DKIM: PASS
DMARC: PASS
From: NCR Suite <contact@ncr-suite.fr>
```

Faire également un test sur Mail-Tester. Un échec doit être corrigé dans le DNS
avant d’ouvrir les demandes d’accès au public.
