# 🧬 SOC API — Synthetic Object Care

> Backend API pour l'application mobile SOC — Gestion, entretien et communauté autour des dolls en silicone/TPE.

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
- [Endpoints API](#-endpoints-api-45-routes)
- [Base de données](#-base-de-données)
- [Sécurité](#-sécurité)
- [Abonnements (Freemium)](#-abonnements-freemium)
- [Fonctionnalités clés](#-fonctionnalités-clés)
- [Déploiement Railway](#-déploiement-railway)

---

## 🏗 Architecture

```
┌──────────────────────────────────────┐
│  Railway (NestJS API)                │
│  ├── Helmet (sécurité headers)       │
│  ├── ThrottlerGuard (rate limiting)  │
│  ├── JWT Auth (Passport)             │
│  └── 13 modules métier               │
└───────────────┬──────────────────────┘
                │ Prisma ORM (SSL)
                ▼
┌──────────────────────────┐
│  Neon PostgreSQL         │
│  15 tables · 16 enums    │
└──────────────────────────┘
                ▲
                │ HTTPS
┌───────────────┴──────────────────┐
│  App Flutter (iOS / Android)     │
│  + Site Astro (vitrine)          │
└──────────────────────────────────┘
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
| IA | Google Gemini 2.0 Flash |
| Abonnements | 3 tiers (FREE / PREMIUM / ULTRA) |
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
| `JWT_EXPIRATION` | Durée de vie des tokens | `7d` |
| `GEMINI_API_KEY` | Clé API Google Gemini (IA Céleste) | `AIzaSy...` |
| `PORT` | Port du serveur | `3000` |
| `NODE_ENV` | Environnement | `development` / `production` |

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

## 📡 Endpoints API (45 routes)

Préfixe global : `/api/v1`

### Auth — `/auth`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/auth/register` | ❌ | Créer un compte |
| `POST` | `/auth/login` | ❌ | Se connecter → JWT + userId |
| `GET` | `/auth/magic-link` | 🔒 | Magic link pour connexion site web (token 5 min) |

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
| `GET` | `/shop/products` | ❌ | Catalogue (filtre par catégorie) |
| `GET` | `/shop/products/:id` | ❌ | Détails produit |
| `POST` | `/shop/products` | 🔒 | Ajouter un produit (admin) |
| `POST` | `/shop/orders` | 🔒 | Passer commande (livraison discrète) |
| `GET` | `/shop/orders` | 🔒 | Mes commandes |
| `GET` | `/shop/orders/:id` | 🔒 | Détails commande |

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

## 🗄 Base de données

### 15 Models

| Model | Description |
|-------|-------------|
| `User` | Utilisateur (profil, abonnement, quotas IA, réputation) |
| `Doll` | Entité critique (identité, apparence, specs, état, social) |
| `DollPhoto` | Photos d'une Doll |
| `WardrobeItem` | Articles de garde-robe virtuelle |
| `MaintenanceRecord` | Historique des actions d'entretien |
| `Appointment` | Rendez-vous (nettoyage, gardiennage, réparation) |
| `Product` | Catalogue e-commerce |
| `Order` | Commandes (intégration Stripe) |
| `OrderItem` | Lignes de commande |
| `SocialComment` | Commentaires sur les dolls |
| `SocialLike` | Likes (unique par user + doll) |
| `AdviceVote` | Votes de réputation (1-5) |
| `DollIssue` | Signalements de problèmes |
| `AiConversation` | Conversations avec Céleste |
| `AiMessage` | Messages IA individuels |

### 16 Enums

`SubscriptionTier` · `ProfileVisibility` · `DollGender` · `BodyMaterial` · `HeadMaterial` · `SkinCondition` · `JointCondition` · `MaintenanceStage` · `MaintenanceAction` · `AppointmentType` · `AppointmentStatus` · `OrderStatus` · `IssueType` · `BodyZone` · `IssueSeverity` · `IssueStatus`

---

## 🛡 Sécurité

| Protection | Détail |
|------------|--------|
| **Rate Limiting** | 100 requêtes / 60 secondes par IP |
| **Helmet** | Headers de sécurité (XSS, clickjacking, MIME sniffing…) |
| **Request Timeout** | 30 secondes max par requête |
| **JWT Auth** | Tokens signés, expiration configurable |
| **Validation** | `whitelist: true` — rejette les champs non déclarés |
| **Password Hashing** | bcrypt (12 rounds) |
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
Intégration Stripe avec livraison discrète par défaut.

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

## � Historique des versions (non mentionné avant — ajouté)

| Version | Description |
| --- | --- |
| `latest` | feat: sécurité renforcée (Helmet, ThrottlerGuard, rate limiting), support tier ULTRA (15 dolls, 150 msgs IA/mois), dynamic upsell, pré-vérification quota dolls, alignement JWT_SECRET avec site Astro, déploiement Railway stable |

---

## �📄 Licence

Projet privé — UNLICENSED

---

*SOC — Synthetic Object Care © 2026*
