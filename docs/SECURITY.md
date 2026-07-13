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
