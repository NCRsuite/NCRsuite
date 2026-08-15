# Hotfix CTA Main courante Agent

## Objectif
Rendre l'action principale réellement visible dès le premier écran Agent.

## Nouveau comportement
- Le bloc Main courante est affiché juste sous les alertes sur l'accueil Agent.
- Sans prise de poste : l'action principale affiche `Prendre mon poste`.
- Une fois en poste : le même emplacement devient `Ajouter à la main courante`.
- Le bouton est pleine largeur, 82 px de hauteur, mobile-first.
- Sans vacation à traiter : l'emplacement reste visible mais indique que la saisie sera disponible lors d'une vacation active.
- L'ancien petit bouton du bloc Vacation a été retiré pour éviter le doublon.

## Fichiers modifiés
- src/pages/SecurityDashboardPage.tsx
- src/styles.css

Aucune nouvelle migration SQL n'est nécessaire pour ce correctif visuel. La migration 121 du hotfix précédent reste requise pour l'écriture sécurisée de la main courante.
