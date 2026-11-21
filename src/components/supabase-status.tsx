import { useEffect, useState } from 'react';

import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

type Status = { state: 'checking' } | { state: 'ok'; rows: number } | { state: 'error'; message: string };

// Dev-only check that the app can reach Supabase with a simple query.
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    supabase
      .from('help_requests')
      .select('*')
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[supabase] query failed', error);
          setStatus({ state: 'error', message: `${error.code}: ${error.message}` });
        } else {
          console.log('[supabase] query ok', data);
          setStatus({ state: 'ok', rows: data.length });
        }
      });
  }, []);

  const hint =
    status.state === 'checking' ? 'checking…' : status.state === 'ok' ? `connected (${status.rows} row)` : status.message;

  return <HintRow title="Supabase" hint={<ThemedText type="small">{hint}</ThemedText>} />;
}
