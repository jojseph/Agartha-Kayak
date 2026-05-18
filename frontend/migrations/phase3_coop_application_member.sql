-- phase3_coop_application_member.sql
--
-- Adds the member-identity columns needed so that approving a coop_application
-- can auto-create the applicant's owner member row in one step. Additive and
-- idempotent. Prerequisite: phase3_visibility.sql (creates coop_applications).

BEGIN;

ALTER TABLE public.coop_applications
  ADD COLUMN IF NOT EXISTS applicant_alias text,
  ADD COLUMN IF NOT EXISTS applicant_email text;

COMMIT;
