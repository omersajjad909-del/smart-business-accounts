-- Which hand-applied migrations has this database not received?
--
-- Migrations here are pasted into Supabase by hand, so a file can sit in the
-- repo for weeks while the column it adds is missing in production — the app
-- then fails at runtime with "column X does not exist", which is how the
-- PurchaseInvoice.grnId break was found. Run this first, before debugging any
-- 500: it names the gap instead of making you guess.
--
-- Read-only. Every row it returns is something to go and apply.

WITH expected_columns(table_name, column_name, source_file) AS (VALUES
  ('Company',         'accessGrantedUntil', 'manual_access_grant_until.sql'),
  ('Company',         'isDemo',             'manual_demo_sandbox.sql'),
  ('Company',         'demoExpiresAt',      'manual_demo_sandbox.sql'),
  ('PurchaseInvoice', 'grnId',              'manual_purchase_invoice_grn_link.sql'),
  ('Feedback',        'rating',             'manual_feedback_rating.sql'),
  ('Feedback',        'role',               'manual_feedback_role.sql'),
  ('Feedback',        'publishConsent',     'manual_newsletter_feedback.sql'),
  ('Feedback',        'testimonialId',      'manual_newsletter_feedback.sql'),
  ('SystemBackup',    'contentHash',        'manual_backup_integrity.sql'),
  ('SystemBackup',    'verifiedAt',         'manual_backup_integrity.sql')
),
expected_tables(table_name, source_file) AS (VALUES
  ('AdminActionLog',      'manual_admin_action_log.sql'),
  ('BusinessWaitlist',    'manual_business_waitlist.sql'),
  ('Feedback',            'manual_feedback.sql'),
  ('NewsletterSubscriber','manual_newsletter_feedback.sql'),
  ('PendingSignup',       'manual_pending_signup.sql'),
  ('PkPaymentRequest',    'manual_pk_payment_requests.sql'),
  ('PlatformInvoice',     'manual_platform_invoices.sql'),
  ('SecurityIncident',    'manual_uptime_and_security_incident.sql'),
  ('StatusSubscriber',    'manual_status_subscriber.sql'),
  ('UptimeCheck',         'manual_uptime_and_security_incident.sql')
)

SELECT 'MISSING COLUMN' AS problem, e.table_name, e.column_name, e.source_file
FROM expected_columns e
WHERE EXISTS (SELECT 1 FROM information_schema.tables t
              WHERE t.table_schema = 'public' AND t.table_name = e.table_name)
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema = 'public'
                    AND c.table_name = e.table_name
                    AND c.column_name = e.column_name)

UNION ALL

SELECT 'MISSING TABLE', e.table_name, '—', e.source_file
FROM expected_tables e
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables t
                  WHERE t.table_schema = 'public' AND t.table_name = e.table_name)

ORDER BY 1, 2, 3;
