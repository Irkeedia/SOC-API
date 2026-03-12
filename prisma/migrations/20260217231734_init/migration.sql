-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BodyMaterial" AS ENUM ('SILICONE', 'TPE', 'HYBRID');

-- CreateEnum
CREATE TYPE "HeadMaterial" AS ENUM ('SILICONE', 'TPE', 'VINYL');

-- CreateEnum
CREATE TYPE "SkinCondition" AS ENUM ('IDEALE', 'BONNE', 'USURE_LEGERE', 'DEGRADEE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "JointCondition" AS ENUM ('NEUVE', 'BONNE', 'LEGERE_FISSURE', 'USEE', 'CASSEE');

-- CreateEnum
CREATE TYPE "MaintenanceStage" AS ENUM ('OPTIMAL', 'SECHAGE_RECOMMANDE', 'HUMIDITE_STAGNANTE', 'POUDRAGE_NECESSAIRE', 'PROLIFERATION_BACTERIENNE', 'FRAGILISATION_STRUCTURE', 'INTERVENTION_URGENTE');

-- CreateEnum
CREATE TYPE "MaintenanceAction" AS ENUM ('LAVAGE', 'POUDRAGE', 'SECHAGE', 'REPARATION_ARTICULATION', 'REPARATION_PEAU', 'CONTROLE_ETAT', 'DESINFECTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('NETTOYAGE', 'POUDRAGE', 'CONTROLE_ETAT', 'REPARATION', 'GARDIENNAGE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('DEMANDE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('EN_ATTENTE', 'PAYEE', 'EXPEDIEE', 'LIVREE', 'ANNULEE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "avatarUrl" TEXT,
    "dailyCommentCount" INTEGER NOT NULL DEFAULT 0,
    "dailyCommentReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adviceScore" INTEGER NOT NULL DEFAULT 0,
    "adviceVotes" INTEGER NOT NULL DEFAULT 0,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dolls" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "brand" TEXT,
    "bodyMaterial" "BodyMaterial" NOT NULL DEFAULT 'TPE',
    "headMaterial" "HeadMaterial" NOT NULL DEFAULT 'TPE',
    "sizeCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "lastWashedAt" TIMESTAMP(3),
    "skinCondition" "SkinCondition" NOT NULL DEFAULT 'IDEALE',
    "jointCondition" "JointCondition" NOT NULL DEFAULT 'NEUVE',
    "fissureCount" INTEGER NOT NULL DEFAULT 0,
    "maintenanceStage" "MaintenanceStage" NOT NULL DEFAULT 'OPTIMAL',
    "degradationLevel" INTEGER NOT NULL DEFAULT 0,
    "statusMessage" TEXT NOT NULL DEFAULT 'Tout est en ordre.',
    "isPremiumAsset" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doll_photos" (
    "id" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doll_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wardrobe_items" (
    "id" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wardrobe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "action" "MaintenanceAction" NOT NULL,
    "notes" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "degradationAfter" INTEGER,
    "stageAfter" "MaintenanceStage",

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'DEMANDE',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "isStorageService" BOOLEAN NOT NULL DEFAULT false,
    "storageStartAt" TIMESTAMP(3),
    "storageEndAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "shippingAddress" TEXT,
    "isDiscreet" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dollId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advice_votes" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advice_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "dolls_ownerId_idx" ON "dolls"("ownerId");

-- CreateIndex
CREATE INDEX "doll_photos_dollId_idx" ON "doll_photos"("dollId");

-- CreateIndex
CREATE INDEX "wardrobe_items_dollId_idx" ON "wardrobe_items"("dollId");

-- CreateIndex
CREATE INDEX "maintenance_records_dollId_idx" ON "maintenance_records"("dollId");

-- CreateIndex
CREATE INDEX "maintenance_records_performedAt_idx" ON "maintenance_records"("performedAt");

-- CreateIndex
CREATE INDEX "appointments_userId_idx" ON "appointments"("userId");

-- CreateIndex
CREATE INDEX "appointments_dollId_idx" ON "appointments"("dollId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "social_comments_dollId_idx" ON "social_comments"("dollId");

-- CreateIndex
CREATE INDEX "social_comments_userId_idx" ON "social_comments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_likes_userId_dollId_key" ON "social_likes"("userId", "dollId");

-- CreateIndex
CREATE UNIQUE INDEX "advice_votes_voterId_receiverId_key" ON "advice_votes"("voterId", "receiverId");

-- AddForeignKey
ALTER TABLE "dolls" ADD CONSTRAINT "dolls_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doll_photos" ADD CONSTRAINT "doll_photos_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_dollId_fkey" FOREIGN KEY ("dollId") REFERENCES "dolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advice_votes" ADD CONSTRAINT "advice_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advice_votes" ADD CONSTRAINT "advice_votes_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
