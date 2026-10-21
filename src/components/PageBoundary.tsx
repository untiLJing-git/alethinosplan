import { Component, Suspense } from 'react';
import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocale } from '../hooks/LocaleProvider';
import { Brand } from './Brand';

interface Props { children: ReactNode; compact?: boolean }

export function PageLoading({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return <div className={compact ? 'loading-state' : 'boot-state'} role="status">
    {!compact && <Brand />}
    <LoaderCircle className="spin" size={compact ? 25 : 22} />
    <span>{t('正在打开计划')}</span>
  </div>;
}

function PageLoadError({ compact }: { compact?: boolean }) {
  const { t } = useLocale();
  return <div className={compact ? 'loading-state page-load-error' : 'boot-state page-load-error'} role="alert">
    {!compact && <Brand />}
    <p>{t('页面加载失败，请刷新后重试。')}</p>
    <button type="button" className="button primary" onClick={() => location.reload()}>{t('刷新页面')}</button>
  </div>;
}

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function PageBoundary({ children, compact }: Props) {
  return <RenderBoundary fallback={<PageLoadError compact={compact} />}>
    <Suspense fallback={<PageLoading compact={compact} />}>{children}</Suspense>
  </RenderBoundary>;
}
