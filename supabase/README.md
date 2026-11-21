# Supabase backend

This folder contains the versioned database schema for CouCouMontreal.

## Files

- `config.toml`: local Supabase Auth settings. Email sign-up is enabled for local development; local email confirmation is off so test accounts can sign in without an email server.
- `migrations/`: database tables, constraints, indexes, triggers, helper functions, and Row Level Security (RLS) policies.
- `seed.sql`: fake local demo data. The `@example.test` users are placeholders with no passwords and cannot sign in.

## Core data model

| Table | Purpose | Access |
| --- | --- | --- |
| `profiles` | Public display name, role, languages, Montréal neighbourhood, and short bio | Signed-in users can read; each user edits their own |
| `profile_preferences` | Optional country-of-origin preference for matching | Private to the profile owner |
| `help_requests` | Help type, description, preferred language, neighbourhood, schedule, and status | Signed-in users can browse open requests; requester and match volunteer can view their request |
| `matches` | Volunteer offers and their status | Only the requester and volunteer can view a match |
| `reviews` | 1–5 rating and optional written reason | Review text is visible only to reviewer and reviewee; one review per person per completed request |
| `reports` | Private safety reports about a user or request | Reporter can view their own report; moderation should use a trusted server/admin role |
| `blocks` | Users blocked by the current user | Private to the person who created the block |

Ratings below 4 require a non-empty reason in the database. Use the `get_profile_rating` RPC to retrieve an aggregate score and review count without exposing review text.

Profiles contain only fields intended to be visible to signed-in members. Country of origin is kept in `profile_preferences`, is optional, and is readable only by its owner. It should be used for recommendations only when the person opts in. Do not store exact home addresses in help requests; use a neighbourhood until people agree to meet.

The schema permits multiple volunteers to offer help on one open request, while a request can have only one accepted match at a time. The request owner accepts or rejects an offer; the volunteer can cancel their own pending offer. Match status updates also keep the help-request status in sync.

## Local development

Install the Supabase CLI using the official installation instructions, then run:

```sh
npx supabase start
npx supabase db reset
```

The reset applies migrations and then loads `seed.sql`. Supabase's local stack requires Docker.

The five fake users in `seed.sql` have no passwords. To test Auth, create accounts through the local Supabase Studio or use the app's sign-up flow. Don't copy the demo users or seed data into a production project.

## Hosted project setup

Email Auth is enabled in the local config. For the hosted project, check **Authentication → Sign In / Providers → Email** in the Supabase dashboard and enable Email if it is off. The GitHub integration does not deploy hosted Auth settings by default. Before inviting real users, confirm email settings and configure a suitable SMTP provider for public signup.

Migrations in this branch have **not** been applied to the hosted database. Before applying them:

1. Confirm the Supabase project reference is the intended CouCouMontreal project.
2. Review the migrations with the team.
3. Test locally with `npx supabase db reset`.
4. Link the CLI to the project and review the proposed changes with `npx supabase db push --dry-run`.
5. Apply only after review with `npx supabase db push`.

Never commit `.env`, database passwords, a Supabase secret key, or the legacy `service_role` key. The Expo app may use the project URL and publishable key; keep administrative keys in a trusted server environment.
