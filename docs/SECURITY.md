# Sécurité et isolation des entreprises

## Règle centrale
Chaque donnée métier porte obligatoirement un `organization_id`.

## Isolation
Les règles RLS Supabase vérifient que l’utilisateur connecté appartient à l’entreprise concernée avant toute lecture ou modification.

## À ne jamais faire
- Utiliser la clé `service_role` dans le navigateur.
- Désactiver la RLS sur une table contenant des données clientes.
- Faire confiance à un `organization_id` envoyé par l’interface sans contrôle RLS.
- Utiliser le même compte utilisateur pour plusieurs salariés.
- Stocker des mots de passe dans une table personnelle.

## Tests obligatoires avant production
1. Créer deux entreprises différentes.
2. Ajouter des données dans chacune.
3. Vérifier qu’un membre de l’entreprise A ne peut lire, modifier ou supprimer aucune donnée de l’entreprise B.
4. Refaire ces tests avec chaque rôle.
5. Vérifier les fichiers Storage avec la même logique d’isolation.


## Réservation publique
- Les visiteurs n’obtiennent aucun droit direct sur les tables privées.
- Les lectures et écritures publiques passent uniquement par des fonctions SQL dédiées et contrôlées.
- Le lien de gestion repose sur un jeton UUID aléatoire traité comme un secret.
- Un champ anti-robot et une limitation par coordonnées réduisent les envois automatisés simples.
- La contrainte d’exclusion PostgreSQL reste la protection finale contre les doubles réservations concurrentes.
