-- ===========================================
-- SOC — Row Level Security (RLS)
-- Sécurise les données au niveau PostgreSQL
-- Même si l'API est compromise, un attaquant
-- ne peut lire/modifier que ses propres données.
-- ===========================================
-- NOTE: On utilise ENABLE (pas FORCE) car l'API
-- se connecte actuellement avec le rôle owner Neon.
-- ENABLE = le RLS s'applique au rôle soc_api uniquement.
-- Quand l'API migrera vers le rôle soc_api, le RLS
-- protègera automatiquement toutes les requêtes.
-- ===========================================

-- ============================
-- 1. Créer un rôle applicatif
-- ============================
-- L'API se connecte avec ce rôle. Différent du rôle owner (admin DB).
-- Sur Neon, le rôle owner est déjà créé. On crée un rôle applicatif restreint.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'soc_api') THEN
    CREATE ROLE soc_api LOGIN;
  END IF;
END
$$;

-- Droits de base : CRUD sur les tables, usage du schéma
GRANT USAGE ON SCHEMA public TO soc_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO soc_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO soc_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO soc_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO soc_api;

-- ============================
-- 2. Variable de session pour l'user ID
-- ============================
-- L'API doit SET app.current_user_id = '<uuid>' avant chaque requête.
-- Si la variable n'est pas définie, aucune ligne n'est visible.

-- ============================
-- 3. RLS sur les tables sensibles
-- ============================

-- ---- USERS ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON users
  FOR ALL
  TO soc_api
  USING (id = current_setting('app.current_user_id', true))
  WITH CHECK (id = current_setting('app.current_user_id', true));

-- Lecture de profils publics (pour le feed social)
CREATE POLICY users_public_read ON users
  FOR SELECT
  TO soc_api
  USING ("profileVisibility" = 'PUBLIC');

-- ---- DOLLS ----
ALTER TABLE dolls ENABLE ROW LEVEL SECURITY;

-- Propriétaire : CRUD complet
CREATE POLICY dolls_owner ON dolls
  FOR ALL
  TO soc_api
  USING ("ownerId" = current_setting('app.current_user_id', true))
  WITH CHECK ("ownerId" = current_setting('app.current_user_id', true));

-- Lecture publique (galerie sociale) — lecture seule, poupées de profils publics
CREATE POLICY dolls_public_read ON dolls
  FOR SELECT
  TO soc_api
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = dolls."ownerId"
      AND users."profileVisibility" = 'PUBLIC'
    )
  );

-- ---- DOLL_PHOTOS ----
ALTER TABLE doll_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY doll_photos_owner ON doll_photos
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = doll_photos."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = doll_photos."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  );

-- ---- WARDROBE_ITEMS ----
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY wardrobe_owner ON wardrobe_items
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = wardrobe_items."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = wardrobe_items."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  );

-- ---- MAINTENANCE_RECORDS ----
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_owner ON maintenance_records
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = maintenance_records."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = maintenance_records."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  );

-- ---- APPOINTMENTS ----
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_owner ON appointments
  FOR ALL
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ---- ORDERS ----
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_owner ON orders
  FOR ALL
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- Policy spéciale pour le webhook Stripe (pas de user context)
-- Le webhook utilise le rôle owner DB, pas soc_api, donc le RLS ne s'applique pas.

-- ---- ORDER_ITEMS ----
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_via_order ON order_items
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items."orderId" AND orders."userId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items."orderId" AND orders."userId" = current_setting('app.current_user_id', true))
  );

-- ---- SOCIAL_COMMENTS ----
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les commentaires
CREATE POLICY comments_read_all ON social_comments
  FOR SELECT
  TO soc_api
  USING (true);

-- Seul l'auteur peut insérer/modifier/supprimer
CREATE POLICY comments_owner_write ON social_comments
  FOR INSERT
  TO soc_api
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY comments_owner_update ON social_comments
  FOR UPDATE
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY comments_owner_delete ON social_comments
  FOR DELETE
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true));

-- ---- SOCIAL_LIKES ----
ALTER TABLE social_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY likes_read_all ON social_likes
  FOR SELECT
  TO soc_api
  USING (true);

CREATE POLICY likes_owner_write ON social_likes
  FOR INSERT
  TO soc_api
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY likes_owner_delete ON social_likes
  FOR DELETE
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true));

-- ---- DOLL_ISSUES ----
ALTER TABLE doll_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY issues_owner ON doll_issues
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = doll_issues."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM dolls WHERE dolls.id = doll_issues."dollId" AND dolls."ownerId" = current_setting('app.current_user_id', true))
  );

-- ---- AI_CONVERSATIONS ----
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conversations_owner ON ai_conversations
  FOR ALL
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ---- AI_MESSAGES ----
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_messages_owner ON ai_messages
  FOR ALL
  TO soc_api
  USING (
    EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages."conversationId" AND ai_conversations."userId" = current_setting('app.current_user_id', true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages."conversationId" AND ai_conversations."userId" = current_setting('app.current_user_id', true))
  );

-- ---- REFRESH_TOKENS ----
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY refresh_tokens_owner ON refresh_tokens
  FOR ALL
  TO soc_api
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ---- ADVICE_VOTES ----
ALTER TABLE advice_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY advice_votes_read_all ON advice_votes
  FOR SELECT
  TO soc_api
  USING (true);

CREATE POLICY advice_votes_owner_write ON advice_votes
  FOR INSERT
  TO soc_api
  WITH CHECK ("voterId" = current_setting('app.current_user_id', true));

-- ---- PRODUCTS (lecture publique, écriture admin) ----
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_read_all ON products
  FOR SELECT
  TO soc_api
  USING (true);

-- L'écriture de produits passe par le rôle owner (admin), pas soc_api.
-- Si nécessaire, ajouter une policy basée sur app.current_user_role = 'ADMIN'.

-- ============================
-- 4. Policy de bypass pour le rôle ADMIN
-- ============================
-- Un utilisateur ADMIN peut tout voir/modifier.
-- L'API set app.current_user_role = 'ADMIN' quand le rôle DB est ADMIN.

CREATE POLICY admin_bypass_users ON users FOR ALL TO soc_api
  USING (current_setting('app.current_user_role', true) = 'ADMIN');
CREATE POLICY admin_bypass_dolls ON dolls FOR ALL TO soc_api
  USING (current_setting('app.current_user_role', true) = 'ADMIN');
CREATE POLICY admin_bypass_orders ON orders FOR ALL TO soc_api
  USING (current_setting('app.current_user_role', true) = 'ADMIN');
CREATE POLICY admin_bypass_appointments ON appointments FOR ALL TO soc_api
  USING (current_setting('app.current_user_role', true) = 'ADMIN');
CREATE POLICY admin_bypass_products ON products FOR ALL TO soc_api
  USING (current_setting('app.current_user_role', true) = 'ADMIN')
  WITH CHECK (current_setting('app.current_user_role', true) = 'ADMIN');
