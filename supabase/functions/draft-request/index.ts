// supabase/functions/draft-request/index.ts
// CouCouMTL post assistant: turns a message written in any language into a
// help_requests draft (title, help_type, description, needed_skills) in English or French.
// The app shows the draft for review; nothing is posted from here.
//
// Deploy:  npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          npx supabase functions deploy draft-request --use-api
// Call:    supabase.functions.invoke('draft-request', { body: { text, postLanguage: 'en' | 'fr' } })

const HELP_TYPES = [
  'appointments',
  'paperwork',
  'transportation',
  'companionship',
  'language_practice',
  'technology',
  'other',
] as const;

// Same list as the volunteer profile skill picker, so matching compares like with like.
export const SKILLS = [
  'paperwork',
  'french',
  'english',
  'translation',
  'driving',
  'technology',
  'healthcare_navigation',
  'housing',
  'job_search',
  'tutoring',
  'groceries',
  'cooking',
  'moving',
  'handyman',
  'companionship',
  'childcare',
  'pet_care',
] as const;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const draftTool = {
  name: 'save_draft',
  description: 'Save the help request draft for the user to review.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short, clear title in the post language, 5 to 80 characters.',
      },
      help_type: { type: 'string', enum: HELP_TYPES },
      description: {
        type: 'string',
        description:
          'Friendly description in the post language, 20 to 600 characters. Keep every concrete detail the user gave (what, where, when). Do not invent details.',
      },
      detected_language: {
        type: 'string',
        description: 'Language the user wrote in, as an ISO 639-1 code, for example tr, ar, fr, en.',
      },
      needed_skills: {
        type: 'array',
        items: { type: 'string', enum: SKILLS },
        description: 'Up to 4 skills a helper would need for this request, most important first.',
      },
      urgent: {
        type: 'boolean',
        description:
          'True if the message describes an emergency or immediate danger to health or safety (medical emergency, violence, fire, someone missing).',
      },
      missing_info: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 2,
        description:
          'Up to 2 short questions in the post language about details a helper would need but the user did not give, such as when or where. Empty if nothing important is missing.',
      },
    },
    required: ['title', 'help_type', 'description', 'needed_skills', 'detected_language', 'urgent', 'missing_info'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'The assistant is not set up yet.' }, 500);

  let text = '';
  let postLanguage = 'en';
  try {
    const body = await req.json();
    text = typeof body.text === 'string' ? body.text.trim() : '';
    postLanguage = body.postLanguage === 'fr' ? 'fr' : 'en';
  } catch {
    return json({ error: 'Send JSON with text and postLanguage.' }, 400);
  }
  if (text.length < 5) return json({ error: 'Tell us a little more about what you need.' }, 400);
  if (text.length > 3000) return json({ error: 'Please keep it under 3000 characters.' }, 400);

  const target = postLanguage === 'fr' ? 'French (Québec)' : 'English';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 800,
      system:
        `You help newcomers and seniors in Montréal ask neighbours for everyday help on the CouCouMTL app. ` +
        `The user may write in any language. Write EVERY text field (title, description and missing_info) in ${target} only, ` +
        `even if the user wrote in another language. Use a warm, plain, respectful tone, as the user speaking ("I need..."). ` +
        `Keep all facts the user gave and never add new ones. Never write placeholders such as <UNKNOWN> or [neighbourhood]; ` +
        `if something is not known, leave it out of the description and ask about it in missing_info instead. ` +
        `Remove private details a stranger should not see in a public post (street address, apartment number, phone numbers, ` +
        `health card or ID numbers); keep only the neighbourhood. Choose the closest help_type. ` +
        `detected_language must be the two-letter ISO 639-1 code of the user's message, for example tr, ar, fr, en. ` +
        `urgent is true ONLY when someone may be in danger right now: a medical emergency happening now, someone hurt or ` +
        `unresponsive, violence, fire, or a missing person. Planned needs are never urgent, including medical appointments, ` +
        `forms with deadlines, or needing a ride later today or tomorrow. ` +
        `missing_info has at most 2 short questions, only for details a helper truly needs (usually when or where). ` +
        `Always answer by calling save_draft.`,
      tools: [draftTool],
      tool_choice: { type: 'tool', name: 'save_draft' },
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!res.ok) {
    console.error('Anthropic API error', res.status, await res.text());
    return json({ error: "The assistant couldn't write a draft. Try again or write it yourself." }, 502);
  }

  const data = await res.json();
  const call = (data.content ?? []).find((c: { type: string }) => c.type === 'tool_use');
  const draft = call?.input;
  if (!draft) return json({ error: "The assistant couldn't write a draft. Try again." }, 502);

  if (!HELP_TYPES.includes(draft.help_type)) draft.help_type = 'other';
  draft.title = String(draft.title ?? '').slice(0, 120);
  draft.description = String(draft.description ?? '').slice(0, 2000);
  draft.needed_skills = Array.isArray(draft.needed_skills)
    ? draft.needed_skills.filter((k: string) => (SKILLS as readonly string[]).includes(k)).slice(0, 4)
    : [];
  draft.missing_info = Array.isArray(draft.missing_info) ? draft.missing_info.slice(0, 2) : [];
  draft.detected_language = String(draft.detected_language ?? '').trim().toLowerCase().slice(0, 2);
  draft.description = draft.description.replace(/\s*[^.!?]*<[^>]+>[^.!?]*[.!?]?/g, '').trim();
  draft.post_language = postLanguage;

  return json({ draft });
});
