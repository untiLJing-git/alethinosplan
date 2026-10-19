import { useCallback, useEffect, useRef, useState } from 'react';

interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
}
const api = () => (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;

export function useDesktopWindow() {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<Window | null>(null);
  const busy = useRef(false);
  const active = useRef(false);
  const generation = useRef(0);
  const supported = window.isSecureContext && typeof api()?.requestWindow === 'function';

  const close = useCallback(() => {
    generation.current += 1;
    current.current?.close();
    current.current = null;
    if (active.current) setPortal(null);
  }, []);

  useEffect(() => {
    active.current = true;
    window.addEventListener('pagehide', close);
    return () => { active.current = false; window.removeEventListener('pagehide', close); close(); };
  }, [close]);

  async function open() {
    setError('');
    if (!supported) { setError('当前浏览器不支持置顶小窗。请使用支持 Document Picture-in-Picture 的桌面浏览器，如 Chrome 或 Edge。'); return; }
    if (current.current && !current.current.closed) { current.current.focus(); return; }
    if (busy.current) return;
    busy.current = true; setOpening(true);
    const version = generation.current;
    let child: Window | null = null;
    try {
      child = await api()!.requestWindow({ width: 380, height: 520 });
      // A pending request must not reopen private content after logout or navigation.
      if (!active.current || version !== generation.current) { child.close(); return; }
      const doc = child.document;
      doc.title = '今日计划 · alēthinósplan';
      doc.documentElement.lang = 'zh-CN';
      doc.body.className = 'desktop-window-body';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(source => {
        const clone = source.cloneNode(true) as HTMLElement;
        if (source instanceof HTMLLinkElement) clone.setAttribute('href', source.href);
        doc.head.append(clone);
      });
      const root = doc.createElement('div');
      doc.body.append(root);
      current.current = child;
      const opened = child;
      child.addEventListener('pagehide', () => {
        if (current.current !== opened) return;
        current.current = null;
        if (active.current) setPortal(null);
      }, { once: true });
      setPortal(root);
    } catch {
      child?.close();
      if (active.current && version === generation.current) setError('未能打开置顶小窗。请检查浏览器支持情况，再点击重试。');
    } finally {
      busy.current = false;
      if (active.current) setOpening(false);
    }
  }

  return { portal, opening, error, supported, open, close, clearError: () => setError('') };
}
