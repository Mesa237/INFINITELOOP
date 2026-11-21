-- Local-only demo data. The @example.test accounts are placeholders with no passwords.
-- Create real test accounts through Supabase Auth when you need to exercise sign-in.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'amina.demo@example.test', '{"display_name":"Amina"}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'marc.demo@example.test', '{"display_name":"Marc"}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'sofia.demo@example.test', '{"display_name":"Sofia"}'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'luc.demo@example.test', '{"display_name":"Luc"}'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'nadia.demo@example.test', '{"display_name":"Nadia"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role, languages, neighborhood, bio)
values
  ('10000000-0000-4000-8000-000000000001', 'Amina', 'volunteer', array['French', 'Arabic'], 'Rosemont–La Petite-Patrie', 'Happy to help with appointments and local orientation.'),
  ('10000000-0000-4000-8000-000000000002', 'Marc', 'seeker', array['French', 'English'], 'Villeray–Saint-Michel–Parc-Extension', 'Looking for help learning how local services work.'),
  ('10000000-0000-4000-8000-000000000003', 'Sofia', 'both', array['French', 'Spanish', 'English'], 'Plateau-Mont-Royal', 'Interested in language exchange and community events.'),
  ('10000000-0000-4000-8000-000000000004', 'Luc', 'volunteer', array['French', 'English'], 'Ahuntsic-Cartierville', 'Can help with technology and paperwork.'),
  ('10000000-0000-4000-8000-000000000005', 'Nadia', 'seeker', array['French', 'English'], 'Côte-des-Neiges–Notre-Dame-de-Grâce', 'Would appreciate companionship and help finding local activities.')
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  languages = excluded.languages,
  neighborhood = excluded.neighborhood,
  bio = excluded.bio;

insert into public.profile_preferences (
  user_id, origin_country_code, use_origin_for_matching
)
values
  ('10000000-0000-4000-8000-000000000001', 'MA', true),
  ('10000000-0000-4000-8000-000000000003', 'HT', true)
on conflict (user_id) do update set
  origin_country_code = excluded.origin_country_code,
  use_origin_for_matching = excluded.use_origin_for_matching;

insert into public.help_requests (
  id, requester_id, title, description, help_type, preferred_language, neighborhood, requested_for, status
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'Practice French conversation',
    'I would like to practice everyday French conversation with someone patient.',
    'language_practice',
    'French',
    'Villeray–Saint-Michel–Parc-Extension',
    now() + interval '3 days',
    'open'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000005',
    'Find nearby community activities',
    'Could someone help me discover welcoming activities and community groups nearby?',
    'companionship',
    'French',
    'Côte-des-Neiges–Notre-Dame-de-Grâce',
    now() + interval '5 days',
    'open'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'Help understanding a local form',
    'I have a non-urgent form and would appreciate help understanding the instructions.',
    'paperwork',
    'French',
    'Plateau-Mont-Royal',
    now() + interval '2 days',
    'open'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'Learn to use video calling',
    'I would like a friendly introduction to making video calls on my phone.',
    'technology',
    'English',
    'Villeray–Saint-Michel–Parc-Extension',
    now() + interval '7 days',
    'open'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    'Get oriented to the neighbourhood',
    'I would like to learn about useful places and services in my neighbourhood.',
    'appointments',
    'French',
    'Côte-des-Neiges–Notre-Dame-de-Grâce',
    now() - interval '2 days',
    'completed'
  )
on conflict (id) do nothing;

insert into public.matches (id, help_request_id, volunteer_id, status)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  'completed'
)
on conflict (id) do nothing;

insert into public.reviews (
  id, help_request_id, reviewer_id, reviewee_id, rating, reason
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    5,
    null
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005',
    3,
    'We could have confirmed the meeting time a little earlier.'
  )
on conflict (id) do nothing;
