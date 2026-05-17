BEGIN;

ALTER TABLE public.members
  DROP COLUMN IF EXISTS trust_score;

COMMIT;
