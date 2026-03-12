# ================================
# SOC API — Dockerfile Production
# ================================

# --- Étape 1 : Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY . .

# Build NestJS
RUN npm run build

# --- Étape 2 : Production ---
FROM node:20-alpine AS production

WORKDIR /app

# Copier uniquement le nécessaire depuis le build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Exposer le port
EXPOSE 3000

# Appliquer les migrations et démarrer
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
