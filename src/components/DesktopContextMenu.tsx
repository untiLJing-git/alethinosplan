import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/ThemeProvider';
import { THEME_OPTIONS } from '../lib/theme';

export interface DesktopMenuState { x: number; y: number; anchor: HTMLElement; taskId?: string }
export interface DesktopMenuAction { label: string; icon: ReactNode; disabled?: boolean; action(): void }
interface Props { state: DesktopMenuState; actions: DesktopMenuAction[]; onDismiss(restoreFocus?: boolean): void }
const labels = { light: '浅色', dark: '深色', system: '跟随系统' };
const icons = { light: Sun, dark: Moon, system: Monitor };

export function DesktopContextMenu({ state, actions, onDismiss }: Props) {
  const theme = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: state.x, y: state.y });
  const scrollPositions = useRef(new Map<EventTarget, { top: number; left: number }>());
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useLayoutEffect(() => {
    const element = root.current!;
    const win = element.ownerDocument.defaultView!;
    const box = element.getBoundingClientRect();
    scrollPositions.current.clear();
    for (let ancestor: HTMLElement | null = state.anchor; ancestor; ancestor = ancestor.parentElement) {
      scrollPositions.current.set(ancestor, { top: ancestor.scrollTop, left: ancestor.scrollLeft });
    }
    const doc = element.ownerDocument;
    scrollPositions.current.set(doc, { top: doc.scrollingElement?.scrollTop || 0, left: doc.scrollingElement?.scrollLeft || 0 });
    setPoint({ x: Math.max(8, Math.min(state.x, win.innerWidth - box.width - 8)), y: Math.max(8, Math.min(state.y, win.innerHeight - box.height - 8)) });
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => {
    const element = root.current!;
    const doc = element.ownerDocument;
    const win = doc.defaultView!;
    const outside = (event: Event) => { if (!element.contains(event.target as Node)) dismiss.current(false); };
    // Ignore a queued scroll event from revealing the anchor before this menu opened.
    const scrolled = (event: Event) => {
      if (element.contains(event.target as Node)) return;
      const target = event.target === doc ? doc.scrollingElement : event.target as Element;
      const previous = scrollPositions.current.get(event.target!);
      if (!target || !previous || previous.top !== target.scrollTop || previous.left !== target.scrollLeft) dismiss.current(false);
    };
    const hide = () => dismiss.current(false);
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss.current(true); return; }
      if (event.key === 'Tab') { dismiss.current(true); return; }
      const items = [...element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      let index = items.indexOf(doc.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowDown') index = (index + 1) % items.length;
      else if (event.key === 'ArrowUp') index = (index + items.length - 1) % items.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = items.length - 1;
      else return;
      event.preventDefault(); items[index]?.focus();
    };
    doc.addEventListener('pointerdown', outside);
    doc.addEventListener('scroll', scrolled, true);
    doc.addEventListener('keydown', keys);
    win.addEventListener('resize', hide);
    win.addEventListener('blur', hide);
    return () => { doc.removeEventListener('pointerdown', outside); doc.removeEventListener('scroll', scrolled, true); doc.removeEventListener('keydown', keys); win.removeEventListener('resize', hide); win.removeEventListener('blur', hide); };
  }, []);
  return <div ref={root} className="desktop-context-menu" role="menu" aria-label="小窗操作" style={{ left: point.x, top: point.y }}>
    <div className="desktop-menu-label">今日小窗</div>
    {actions.map(action => <button key={action.label} type="button" role="menuitem" disabled={action.disabled} onClick={() => { onDismiss(true); action.action(); }}>{action.icon}<span>{action.label}</span></button>)}
    <div className="desktop-menu-divider" role="separator" />
    <div className="desktop-menu-label">主题</div>
    <div role="group" aria-label="主题模式">{THEME_OPTIONS.map(option => {
      const Icon = icons[option];
      return <button key={option} type="button" role="menuitemradio" aria-checked={theme.preference === option} onClick={() => { theme.setPreference(option); onDismiss(true); }}><Icon size={15} /><span>{labels[option]}</span>{theme.preference === option && <Check size={14} />}</button>;
    })}</div>
    <small className="desktop-menu-hint">Shift + 右键使用浏览器菜单</small>
  </div>;
}
