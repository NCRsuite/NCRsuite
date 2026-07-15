# 2.5.4 — QR validé, PDF stable et sites visibles en facturation

- Correction de l’ambiguïté PostgreSQL qui empêchait l’enregistrement d’un QR pourtant détecté.
- Messages d’erreur Supabase désormais lisibles au lieu de « erreur inconnue ».
- Génération du PDF de préfacturation chargée statiquement pour éviter la réponse HTML à la place du module JavaScript.
- Service worker sécurisé : une page HTML n’est plus renvoyée pour un fichier JavaScript manquant.
- Tous les sites actifs rattachés au client sont visibles dans l’aperçu de facturation.
- Les sites sans mission sont affichés comme non facturés.
- Bouton d’actualisation du calcul ajouté.
- Les brouillons continuent à être recalculables avec le planning actuel.
- Cache PWA passé en V2.5.4.
