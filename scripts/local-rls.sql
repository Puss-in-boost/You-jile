-- Run AFTER drizzle-kit push on local PostgreSQL. Not for Supabase.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ledger_user') THEN CREATE ROLE ledger_user NOLOGIN NOBYPASSRLS; END IF; END $$;
GRANT ledger_user TO postgres;
GRANT USAGE ON SCHEMA public TO ledger_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions, user_category_rules TO ledger_user;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS local_transaction_owner ON transactions;
CREATE POLICY local_transaction_owner ON transactions FOR ALL TO ledger_user USING (user_id = nullif(current_setting('request.jwt.claim.sub', true),'')::uuid) WITH CHECK (user_id = nullif(current_setting('request.jwt.claim.sub', true),'')::uuid);
DROP POLICY IF EXISTS local_rule_owner ON user_category_rules;
CREATE POLICY local_rule_owner ON user_category_rules FOR ALL TO ledger_user USING (user_id = nullif(current_setting('request.jwt.claim.sub', true),'')::uuid) WITH CHECK (user_id = nullif(current_setting('request.jwt.claim.sub', true),'')::uuid);
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='local_transactions_user_fk') THEN ALTER TABLE transactions ADD CONSTRAINT local_transactions_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='local_rules_user_fk') THEN ALTER TABLE user_category_rules ADD CONSTRAINT local_rules_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE; END IF; END $$;
