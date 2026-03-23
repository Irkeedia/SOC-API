# 🧬 SOC API — Synthetic Object Care

> Backend API pour l'application mobile SOC & la marketplace — Gestion des dolls, entretien, communauté, marketplace multi-vendeurs.

![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)

---

## 📋 Table des matières

- [Architecture](#-architecture)
- [Stack technique](#-stack-technique)
- [Installation](#-installation)
- [Variables d'environnement](#-variables-denvironnement)
- [Scripts](#-scripts)
- [Endpoints API](#-endpoints-api-65-routes)
- [Marketplace (Module Vendors)](#-marketplace-module-vendors)
- [Base de données](#-base-de-données)
- [Sécurité](#-sécurité)
- [Abonnements (Freemium)](#-abonnements-freemium)
- [Fonctionnalités clés](#-fonctionnalités-clés)
- [Déploiement Railway](#-déploiement-railway)
- [Historique des versions](#-historique-des-versions)

---

## 🏗 Architecture

```
┌──────────────────────────────────────┐
│  Railway (NestJS API)                │
│  ├── Helmet (sécurité headers)       │
│  ├── ThrottlerGuard (rate limiting)  │
│  ├── JWT Auth (Passport)             │
│  └── 16 modules métier               │
└────────────────┬─────────────────────┘
                │ Prisma ORM (SSL)
                ▼
┌──────────────────────────┐
│  Neon PostgreSQL         │
│  22 tables · 21 enums    │
└──────────────────────────┘
                ▲
                │ HTTPS
┌───────────────┴──────────────────┐
│  App Flutter (iOS / Android)     │
│  + Site Astro (vitrine/marketplace)│
└──────────────────────────────────┐
                                    │
                                    ▼
                        Cloudflare R2 (CDN images)
                        cdn.silenceofceleste.com
```

---

## 🛠 Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | NestJS 10.4 |
| ORM | Prisma 5.14 |
| Base de données | PostgreSQL (Neon) |
| Auth | JWT + Passport |
| Validation | class-validator + class-transformer |
| Documentation | Swagger / OpenAPI |
| Sécurité | Helmet + @nestjs/throttler (rate limiting) |
| Stockage images | Cloudflare R2 (S3-compatible) — CDN `cdn.silenceofceleste.com` |
| IA | Google Gemini 2.0 Flash |
| Abonnements | 3 tiers (FREE / PREMIUM / ULTRA) |
| Emails | Resend (DKIM + SPF + DMARC) |
| Déploiement | Railway (Nixpacks) |

---

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/Irkeedia/SOC-API.git
cd SOC-API

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# → Renseigner DATABASE_URL, JWT_SECRET, GEMINI_API_KEY

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev

# Lancer en développement
npm run start:dev
```

L'API démarre sur `http://localhost:3000`  
Swagger disponible sur `http://localhost:3000/api/docs`

---

## 🔐 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL (Prisma) | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Clé secrète pour les tokens JWT | `votre_secret_aleatoire_long` |
| `JWT_EXPIRATION` | Durée de vie des tokens | `1h` |
| `GEMINI_API_KEY` | Clé API Google Gemini (IA Céleste) | `AIzaSy...` |
| `RESEND_API_KEY` | Clé API Resend (emails transactionnels) | `re_...` |
| `FROM_EMAIL` | Expéditeur des emails | `Silence of Céleste <noreply@silenceofceleste.com>` |
| `PUBLIC_SITE_URL` | URL du site (liens dans les emails) | `https://www.silenceofceleste.com` |
| `PORT` | Port du serveur | `3000` |
| `NODE_ENV` | Environnement | `development` / `production` |
| `R2_ACCOUNT_ID` | ID du compte Cloudflare | `8e109...` |
| `R2_ACCESS_KEY_ID` | Clé d'accès R2 (API token) | `14793...` |
| `R2_SECRET_ACCESS_KEY` | Clé secrète R2 | `53228...` |
| `R2_BUCKET_NAME` | Nom du bucket R2 | `silence-of-celeste` |
| `R2_PUBLIC_URL` | URL publique du CDN R2 | `https://cdn.silenceofceleste.com` |

---

## 📜 Scripts

| Commande | Description |
|----------|-------------|
| `npm run start:dev` | Serveur dev avec hot reload |
| `npm run start:prod` | Serveur production |
| `npm run build` | Compilation TypeScript |
| `npm run lint` | Lint + fix automatique |
| `npm run format` | Formatage Prettier |
| `npm run prisma:generate` | Regénérer le client Prisma |
| `npm run prisma:migrate` | Créer/appliquer les migrations |
| `npm run prisma:studio` | Interface visuelle DB |
| `npm run prisma:seed` | Données de seed |

---

## 📡 Endpoints API (72+ routes)

Préfixe global : `/api/v1`

### Auth — `/auth`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/auth/register` | ❌ | Créer un compte + envoi email de vérification |
| `POST` | `/auth/login` | ❌ | Se connecter → JWT + refreshToken |
| `POST` | `/auth/refresh` | ❌ | Rafraîchir l'access token via refresh token |
| `POST` | `/auth/logout` | 🔒 | Révocation globale des refresh tokens |
| `GET` | `/auth/magic-link` | 🔒 | Magic link pour connexion site web (token 5 min) |
| `POST` | `/auth/change-password` | 🔒 | Changer son mot de passe (authentifié) |
| `POST` | `/auth/forgot-password` | ❌ | Demander un email de réinitialisation |
| `POST` | `/auth/reset-password` | ❌ | Réinitialiser via token email |
| `GET` | `/auth/verify-email` | ❌ | Vérifier l'email via token |
| `POST` | `/auth/resend-verification` | 🔒 | Renvoyer l'email de vérification |

### Users — `/users`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/users/me` | 🔒 | Mon profil |
| `PATCH` | `/users/me` | 🔒 | Modifier mon profil |
| `GET` | `/users/:id/public` | ❌ | Profil public d'un utilisateur |

### Dolls — `/dolls`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/dolls` | 🔒 | Créer une Doll (SOC Identity) |
| `GET` | `/dolls` | 🔒 | Lister mes Dolls + état dégradation |
| `GET` | `/dolls/public` | ❌ | Dolls publiques (feed social, paginé) |
| `GET` | `/dolls/:id` | 🔒 | Détails + dégradation temps réel |
| `PATCH` | `/dolls/:id` | 🔒 | Modifier une Doll |
| `DELETE` | `/dolls/:id` | 🔒 | Supprimer une Doll |
| `POST` | `/dolls/:id/photos` | 🔒 | Uploader une photo (R2, 10MB max, rate limit 5/min) |
| `DELETE` | `/dolls/photos/:photoId` | 🔒 | Supprimer une photo |
| `PATCH` | `/dolls/photos/:photoId` | 🔒 | Modifier légende / ordre de tri |
| `PATCH` | `/dolls/:id/profile-photo` | 🔒 | Définir la photo de profil |
| `POST` | `/dolls/:id/wardrobe` | 🔒 | Ajouter un article garde-robe |
| `PATCH` | `/dolls/wardrobe/:itemId` | 🔒 | Modifier un article |
| `DELETE` | `/dolls/wardrobe/:itemId` | 🔒 | Retirer un article |

### Maintenance — `/maintenance`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/maintenance` | 🔒 | Enregistrer une action de maintenance |
| `GET` | `/maintenance/dashboard` | 🔒 | Tableau de bord préventif |
| `GET` | `/maintenance/:dollId/history` | 🔒 | Historique d'une Doll |

### Issues — `/issues`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/issues` | 🔒 | Signaler un problème (26 zones corporelles) |
| `GET` | `/issues` | 🔒 | Tous mes signalements |
| `GET` | `/issues/doll/:dollId` | 🔒 | Signalements d'une doll |
| `GET` | `/issues/:id` | 🔒 | Détail d'un signalement |
| `PATCH` | `/issues/:id` | 🔒 | Mettre à jour / réparer |
| `DELETE` | `/issues/:id` | 🔒 | Supprimer un signalement |

### IA Céleste — `/ai`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/ai/chat` | 🔒 | Message à Céleste (Gemini 2.0 Flash) |
| `GET` | `/ai/conversations` | 🔒 | Lister mes conversations |
| `GET` | `/ai/conversations/:id` | 🔒 | Conversation complète |
| `DELETE` | `/ai/conversations/:id` | 🔒 | Supprimer une conversation |

### Appointments — `/appointments`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/appointments` | 🔒 | Prendre RDV (nettoyage, gardiennage…) |
| `GET` | `/appointments` | 🔒 | Lister mes RDV |
| `GET` | `/appointments/:id` | 🔒 | Détails d'un RDV |
| `PATCH` | `/appointments/:id/status` | 🔒 | Changer le statut |
| `DELETE` | `/appointments/:id` | 🔒 | Annuler un RDV |

### E-commerce — `/shop`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/shop/products` | ❌ | Catalogue (filtre par catégorie, marketplace-aware) |
| `GET` | `/shop/products/:id` | ❌ | Détails produit (+ images, vendor, reviews) |
| `POST` | `/shop/products` | 🔒 | Ajouter un produit (admin) |
| `POST` | `/shop/orders` | 🔒 | Passer commande (livraison discrète) |
| `GET` | `/shop/orders` | 🔒 | Mes commandes |
| `GET` | `/shop/orders/:id` | 🔒 | Détails commande |

### 🆕 Marketplace — `/marketplace`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/marketplace/products` | ❌ | Tous les produits marketplace (SOC en premier) |
| `GET` | `/marketplace/products/:slug` | ❌ | Détail produit par slug |
| `POST` | `/marketplace/vendors/apply` | 🔒 | Candidater comme vendeur |
| `GET` | `/marketplace/vendors/me` | 🔒 | Mon profil vendeur |
| `PUT` | `/marketplace/vendors/me` | 🔒 | Modifier profil vendeur |
| `GET` | `/marketplace/vendors/dashboard` | 🔒 | Dashboard vendeur (stats, revenus, commissions) |
| `GET` | `/marketplace/vendors/sales` | 🔒 | Historique des ventes |
| `GET` | `/marketplace/vendors/products` | 🔒 | Mes produits |
| `POST` | `/marketplace/vendors/products` | 🔒 | Soumettre un produit |
| `PUT` | `/marketplace/vendors/products/:id` | 🔒 | Modifier un produit |
| `DELETE` | `/marketplace/vendors/products/:id` | 🔒 | Supprimer un produit |
| `GET` | `/marketplace/admin/vendors` | 🔒 Admin | Liste vendeurs (filtre par statut) |
| `PUT` | `/marketplace/admin/vendors/:id/review` | 🔒 Admin | Approuver/refuser/suspendre vendeur |
| `GET` | `/marketplace/admin/products/pending` | 🔒 Admin | Produits en attente de validation |
| `PUT` | `/marketplace/admin/products/:id/review` | 🔒 Admin | Approuver/refuser produit |

### Social — `/social`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/social/comments` | 🔒 | Commenter (5/jour FREE) |
| `GET` | `/social/comments/:dollId` | ❌ | Commentaires d'une doll (paginé) |
| `POST` | `/social/like/:dollId` | 🔒 | Like / unlike (toggle) |
| `POST` | `/social/advice-vote` | 🔒 | Voter réputation utilisateur |

### Subscription — `/subscription`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/subscription/plans` | 🔒 | Plans disponibles |
| `GET` | `/subscription/me` | 🔒 | Mon plan + quotas restants |

---

## 🏪 Marketplace (Module Vendors)

### Architecture

Le module `VendorsModule` gère toute la logique marketplace :
- **VendorsController** — 15 endpoints préfixés `/marketplace`
- **VendorsService** — 14 méthodes métier (~280 lignes)
- **6 DTOs** — validation des entrées vendeur/admin

### Flux vendeur

```
1. Candidature : POST /marketplace/vendors/apply
   → Crée profil vendeur (status: PENDING) → upgrade rôle USER → VENDOR

2. Validation admin : PUT /marketplace/admin/vendors/:id/review
   → APPROVED (+ commission rate) | REJECTED (+ note) | SUSPENDED

3. Soumission produit : POST /marketplace/vendors/products
   → Auto-génération slug, approvalStatus: PENDING, commission héritée

4. Modération produit : PUT /marketplace/admin/products/:id/review
   → APPROVED | REJECTED (+ rejectionNote)

5. Vente : vendeur voit ses ventes via GET /marketplace/vendors/sales
   → Revenue brut - commission (15% défaut) = net earnings
```

### Système de commissions

| Paramètre | Valeur |
|-----------|--------|
| Commission par défaut | 15% |
| Configurable par vendeur | Oui (0-100%, via admin review) |
| Tracking | `totalSales`, `totalPaid` sur le profil vendeur |
| Payouts | Modèle `vendor_payouts` avec period tracking |

### Statuts

| Entité | Statuts |
|--------|---------|
| Vendeur (`VendorStatus`) | `PENDING` → `APPROVED` / `REJECTED` / `SUSPENDED` |
| Produit (`ProductStatus`) | `DRAFT` → `PENDING` → `APPROVED` / `REJECTED` |
| Paiement (`PayoutStatus`) | `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` |

---

### 22 Models

| Model | Description |
|-------|-------------|
| `User` | Utilisateur (profil, abonnement, quotas IA, réputation, rôle USER/VENDOR/ADMIN) |
| `Doll` | Entité critique (identité, apparence, specs, état, social) |
| `DollPhoto` | Photos d'une Doll |
| `WardrobeItem` | Articles de garde-robe virtuelle |
| `MaintenanceRecord` | Historique des actions d'entretien |
| `Appointment` | Rendez-vous (nettoyage, gardiennage, réparation) |
| `Product` | Catalogue e-commerce (marketplace-aware, vendorId, approvalStatus) |
| `ProductImage` | 🆕 Images produit multiples (triées par sortOrder) |
| `ProductReview` | 🆕 Avis produit (note 1-5, vérifié, unique par user+produit) |
| `Order` | Commandes (intégration Stripe) |
| `OrderItem` | Lignes de commande |
| `Vendor` | 🆕 Profil vendeur (boutique, commission, statut, stats) |
| `VendorPayout` | 🆕 Suivi des paiements vendeur (période, montant, commission) |
| `SocialComment` | Commentaires sur les dolls |
| `SocialLike` | Likes (unique par user + doll) |
| `AdviceVote` | Votes de réputation (1-5) |
| `DollIssue` | Signalements de problèmes |
| `AiConversation` | Conversations avec Céleste |
| `AiMessage` | Messages IA individuels |
| `RefreshToken` | Tokens de rafraîchissement (rotation + détection theft) |
| `PasswordResetToken` | Tokens de réinitialisation mot de passe (SHA-256) |
| `EmailVerificationToken` | Tokens de vérification email (SHA-256) |

### 21 Enums

`SubscriptionTier` · `ProfileVisibility` · `DollGender` · `BodyMaterial` · `HeadMaterial` · `SkinCondition` · `JointCondition` · `MaintenanceStage` · `MaintenanceAction` · `AppointmentType` · `AppointmentStatus` · `OrderStatus` · `IssueType` · `BodyZone` · `IssueSeverity` · `IssueStatus` · `Role` · `DollUsage` · 🆕 `ProductStatus` · 🆕 `VendorStatus` · 🆕 `PayoutStatus`

---

## 🛡 Sécurité

| Protection | Détail |
|------------|--------|
| **Rate Limiting** | 100 requêtes / 60 secondes par IP, limites spécifiques par endpoint |
| **Upload Sécurisé** | 10 photos/doll max, 200 photos/user max, 5 uploads/min, 10MB/fichier, validation MIME (JPG/PNG/WebP/GIF/HEIC) |
| **Helmet** | Headers de sécurité (XSS, clickjacking, MIME sniffing…) |
| **Request Timeout** | 30 secondes max par requête |
| **JWT Auth** | Access token (1h) + Refresh token (30 jours) avec rotation |
| **Token Theft Detection** | Détection de réutilisation de refresh token → révocation cascade |
| **Validation** | `whitelist: true` — rejette les champs non déclarés |
| **Password Hashing** | bcrypt (12 rounds) |
| **Anti Brute-Force** | 5 tentatives login max, lockout 15 min |
| **Anti-Enumeration** | Réponse identique pour forgot-password que l'email existe ou non |
| **Email Verification** | Token SHA-256 hashé, usage unique, expiration 24h |
| **Password Reset** | Token SHA-256 hashé, usage unique, expiration 1h |
| **Emails transactionnels** | Resend API (DKIM + SPF + DMARC via Cloudflare) |
| **Budget quotidien** | Circuit-breaker : 10 000 requêtes/jour max |
| **Security Logger** | Détection anomalies + alertes (login suspect, token theft) |
| **CORS** | Configurable par environnement |

---

## 💎 Abonnements (Freemium)

| Plan | Prix | Max Dolls | Messages IA/mois | Garde-robe | Extras |
|------|------|-----------|-------------------|------------|--------|
| **FREE** | 0 € | 1 | 3 | ❌ | — |
| **PREMIUM** | 5 €/mois | 5 | 50 | ✅ | Signalements illimités, base de connaissances |
| **ULTRA** | 10 €/mois | 15 | 150 | ✅ | Support prioritaire, accès anticipé |

---

## ⚙️ Fonctionnalités clés

### 📷 Stockage images Cloudflare R2
- Upload photos via `UploadService` (client S3 compatible R2)
- Bucket : `silence-of-celeste`, CDN : `cdn.silenceofceleste.com`
- Validation MIME (JPG, PNG, WebP, GIF, HEIC/HEIF) + taille max 10MB
- Limites : 10 photos/doll, 200 photos/utilisateur, 5 uploads/min
- Photo de profil sélectionnable par doll (`profilePhotoId`)
- UUID unique pour chaque fichier uploadé

### 🆕 Marketplace multi-vendeurs
- Candidature vendeur → validation admin → soumission produits → modération → vente
- Commission configurable (15% par défaut) par vendeur
- Dashboard vendeur : stats, revenus, commandes, produits
- Admin : validation vendeurs, modération produits, suivi commissions
- Tri catalogue : produits SOC en premier → featured → sortOrder

### 🔬 Dégradation temps réel
Calcul automatique basé sur :
- Temps depuis le dernier lavage
- Matériau (TPE se dégrade 2× plus vite que silicone)
- Nombre de fissures détectées
- 7 stades progressifs : `OPTIMAL` → `INTERVENTION_URGENTE`

### 🤖 IA Céleste (Gemini 2.0 Flash)
- Assistante spécialisée entretien des dolls
- Personnalité bienveillante et discrète
- Contexte automatique : profil doll, signalements, historique maintenance
- Quota mensuel selon le plan d'abonnement

### 🔗 Magic Link
Connexion automatique app → site web via token JWT (5 min de validité).

### 🗺 Mapping anatomique
26 zones corporelles pour des signalements de problèmes ultra-précis.

### 📦 E-commerce discret
Intégration Stripe avec livraison discrète par défaut. Marketplace-aware avec commissions vendeurs.

---

## 🚂 Déploiement Railway

Le projet est configuré pour un déploiement automatique sur Railway.

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && node dist/main",
    "healthcheckPath": "/api/v1",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Étapes :
1. Connecter le repo GitHub sur [railway.app](https://railway.app)
2. Configurer les variables d'environnement
3. Définir un **Usage Limit** (ex: 10$) pour éviter les dérapages
4. Chaque `git push` déclenche un redéploiement automatique

---

## 📜 Historique des versions

| Version | Description |
| --- | --- |
| v5 `latest` | feat: stockage images Cloudflare R2 — UploadService S3 (R2), 4 endpoints photos (upload/delete/update/profile-photo), CDN `cdn.silenceofceleste.com`, sécurité upload (10 photos/doll, 200/user, rate limit 5/min, 10MB, validation MIME), champ `profilePhotoId` sur dolls, enum `DollUsage` (7 valeurs), champs `usage`/`usageDetails` sur dolls |
| v4 | feat: marketplace multi-vendeurs — module VendorsModule (controller + service + DTOs), 15 endpoints `/marketplace/*`, modèles vendors/product_images/product_reviews/vendor_payouts, enums ProductStatus/VendorStatus/PayoutStatus, commission system (15% défaut), ecommerce service marketplace-aware, rôle VENDOR dans enum Role · intégration site Astro : espace client Shop-style (4 pages), espace vendeur Shopify-style (12 pages), auth change-password endpoint utilisé par le site |
| v3 | feat: gestion complète email/mot de passe — email verification à l'inscription, forgot/reset/change password, emails transactionnels Resend (DKIM+SPF+DMARC), refresh tokens avec rotation + détection theft, anti brute-force, security logger, budget quotidien, observabilité |
| v2 | feat: sécurité renforcée (Helmet, ThrottlerGuard, rate limiting), support tier ULTRA, dynamic upsell, pré-vérification quota dolls, alignement JWT_SECRET avec site Astro |
| v1 | Initial — auth JWT, modules métier (dolls, maintenance, IA, shop, social), déploiement Railway |

---

## 📄 Licence

Projet privé — UNLICENSED

---

*SOC — Synthetic Object Care © 2026*
