import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/errors';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      revision += 1;
      setSession(nextSession);
      setReady(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setError('');
      if (event === 'PASSWORD_RECOVERY' || (nextSession && new URLSearchParams(location.search).get('auth') === 'recovery')) setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    const initialRevision = revision;
    supabase.auth.getSession().then(({ data: initial, error: issue }) => {
      if (!mounted || revision !== initialRevision) return;
      setSession(initial.session);
      if (initial.session && new URLSearchParams(location.search).get('auth') === 'recovery') setRecovering(true);
      if (issue) setError(authErrorMessage(issue));
      setReady(true);
    }).catch(issue => { if (mounted) { setError(authErrorMessage(issue)); setReady(true); } });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    if (!supabase) return true;
    try {
      const { error: issue } = await supabase.auth.signOut({ scope: 'local' });
      if (issue) { setError(authErrorMessage(issue)); return false; }
      setError(''); return true;
    } catch (issue) { setError(authErrorMessage(issue)); return false; }
  }

  function finishRecovery() {
    setRecovering(false);
    const url = new URL(location.href); url.searchParams.delete('auth');
    history.replaceState(null, '', url);
  }

  return { session, ready, recovering, finishRecovery, signOut, error };
}
