-- Remember when each person agreed to the community rules (and which version),
-- so the rules are only shown again when they change.
alter table public.profiles
  add column if not exists rules_accepted_at timestamptz,
  add column if not exists rules_version text
    check (rules_version is null or char_length(rules_version) <= 20);
