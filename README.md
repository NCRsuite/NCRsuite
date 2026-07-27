# NCR Suite V2.25.0

Base SaaS multi-métier NCR Suite.

Cette version ajoute la facturation Stripe multi-métiers. Les trois premiers
tarifs Formation sont configurés, puis chaque nouveau Price Stripe peut être
activé dans le catalogue sans modifier le backend.

Checkout, portail client et webhooks sont exécutés dans des Supabase Edge
Functions. Les clés Stripe restent exclusivement dans les secrets serveur.

Consulter uniquement `A_LIRE_INSTALLATION_V2.25.0.txt` avant déploiement.
