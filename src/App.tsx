import { lazy, useState } from 'react';
import { PageBoundary, PageLoading } from './components/PageBoundary';
import { useAuth } from './hooks/useAuth';
import { isDevelopmentDemoRequested } from './lib/demoMode';

const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const Workspace = lazy(() => import('./Workspace'));

export default function App() {
  const auth = useAuth();
  const [demo, setDemo] = useState(() => isDevelopmentDemoRequested(location.search, import.meta.env.DEV));
  async function exit() {
    if (demo) { const url = new URL(location.href); url.searchParams.delete('demo'); history.replaceState(null, '', url); setDemo(false); return true; }
    return auth.signOut();
  }
  if (!auth.ready && !demo) return <PageLoading />;
  const showAuth = auth.recovering || (!demo && !auth.session);
  const screen = showAuth ? (auth.recovering ? 'recovery' : 'account') : (demo ? 'demo' : auth.session!.user.id);
  return <PageBoundary key={screen}>
    {showAuth
      ? <AuthPage recovering={auth.recovering} onRecovered={auth.finishRecovery} sessionError={auth.error} />
      : <Workspace demo={demo} user={auth.session?.user} onExit={exit} authError={auth.error} />}
  </PageBoundary>;
}
