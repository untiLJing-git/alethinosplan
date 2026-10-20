import type { MessageKey } from './lib/messages';
import { LanguageToggle } from './components/LanguageToggle';
import { useLocale } from './hooks/LocaleProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '@supabase/supabase-js';
import { AlertCircle, CalendarDays, Check, ChevronDown, LoaderCircle, LogOut, Pause, PictureInPicture2, Play, RotateCcw, StickyNote, Sun, X } from 'lucide-react';
import { DesktopTasks } from './components/DesktopTasks';
import { useDesktopWindow } from './hooks/useDesktopWindow';
import { FeedbackLink } from './components/FeedbackLink';
import { ThemeToggle } from './components/ThemeToggle';
import { Brand } from './components/Brand';
import { TaskDialog } from './components/TaskDialog';
import type { TaskEditorState } from './components/TaskDialog';
import { FocusClock } from './components/FocusClock';
import { useFocusTimer } from './hooks/useFocusTimer';
import { FocusDialog } from './components/FocusDialog';
import { AuthPage } from './pages/AuthPage';
import { CalendarPage } from './pages/CalendarPage';
import { NotesPage } from './pages/NotesPage';
import { TodayPage } from './pages/TodayPage';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useToday } from './hooks/useToday';
import { cloudRepository, demoRepository } from './lib/repository';
import { supabase } from './lib/supabase';
import { scheduledPatch } from './lib/tasks';
import { isDevelopmentDemoRequested } from './lib/demoMode';
import type { Page, Task, TaskDraft } from './lib/types';

interface Toast { label: MessageKey; action?: () => Promise<boolean> }
interface WorkspaceProps { demo: boolean; user?: User; onExit(): Promise<boolean>; authError: string }

function Workspace({ demo, user, onExit, authError }: WorkspaceProps) {
  const { t, translateMessage } = useLocale();
  const today = useToday();
  const desktop = useDesktopWindow();
  const repository = useMemo(() => demo ? demoRepository() : cloudRepository(supabase!, user!.id), [demo, user?.id]);
  const data = useTasks(repository);
  const [page, setPage] = useState<Page>('today');
  const [editor, setEditor] = useState<TaskEditorState | null>(null);
  const timer = useFocusTimer(desktop.portal?.ownerDocument.defaultView ?? null);
  const [focusOpen, setFocusOpen] = useState(false);
  const focus = data.tasks.find(task => task.id === timer.session?.taskId && task.status === 'planned') || null;
  useEffect(() => {
    if (!data.loading && timer.session && !focus) { timer.stop(timer.session.taskId); setFocusOpen(false); }
  }, [data.loading, focus, timer.session, timer.stop]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [exiting, setExiting] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismissOutside = (event: Event) => {
      const menu = accountMenu.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      const menu = accountMenu.current;
      if (event.key !== 'Escape' || !menu?.open) return;
      event.preventDefault();
      menu.open = false;
      menu.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('focusin', dismissOutside, true);
    document.addEventListener('keydown', dismissOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('focusin', dismissOutside, true);
      document.removeEventListener('keydown', dismissOnEscape, true);
    };
  }, []);
  const focusCompletion = useRef<{ frame: number | null; pending: boolean }>({ frame: null, pending: false });
  useEffect(() => {
    const transition = focusCompletion.current;
    return () => {
      if (transition.frame !== null) cancelAnimationFrame(transition.frame);
      transition.pending = false;
    };
  }, []);
  const todayCount = data.tasks.filter(task => task.status === 'planned' && task.plannedDate === today).length;
  const noteCount = data.tasks.filter(task => task.status === 'note').length;
  const nav = [
    { page: 'today' as const, label: t('我的一天'), icon: Sun, count: todayCount },
    { page: 'calendar' as const, label: t('规划日历'), icon: CalendarDays },
    { page: 'notes' as const, label: t('随手记'), icon: StickyNote, count: noteCount },
  ];

  function startFocus(task: Task, showDialog: boolean) {
    if (task.status !== 'planned' || data.loading || data.pending.has(task.id) || focusCompletion.current.pending) return;
    if (!timer.start(task.id)) { setToast({ label: '请先结束当前计时，再开始其他任务' }); return; }
    setFocusOpen(showDialog);
  }
  function stopFocus() { timer.stop(); setFocusOpen(false); }
  function editTask(task: Task) { setEditor({ task, date: task.plannedDate, kind: task.status === 'note' ? 'note' : 'plan' }); }
  async function saveTask(draft: TaskDraft, task?: Task): Promise<boolean> {
    const saved = task
      ? await data.update(task.id, { ...draft, status: task.status === 'done' ? 'done' : draft.plannedDate ? 'planned' : 'note', completedAt: task.status === 'done' ? task.completedAt : null })
      : await data.create(draft);
    if (!saved) return false;
    if (task?.status === 'note' && saved.status === 'planned') setToast({ label: '已安排到日历' });
    else setToast({ label: saved.status === 'note' ? '已记下' : '已保存' });
    return true;
  }
  async function complete(task: Task, animate = true): Promise<boolean> {
    if (task.status !== 'planned') return false;
    timer.pause(task.id);
    const saved = await data.update(task.id, { status: 'done', completedAt: new Date().toISOString() }, animate);
    if (!saved) return false;
    timer.stop(task.id);
    if (timer.session?.taskId === task.id) setFocusOpen(false);
    setToast({ label: '已完成', action: async () => Boolean(await data.update(task.id, { status: 'planned', completedAt: null })) });
    return true;
  }
  async function restore(task: Task): Promise<boolean> {
    const saved = await data.update(task.id, { status: 'planned', completedAt: null });
    if (!saved) return false;
    setToast({ label: '已恢复到今天' });
    return true;
  }
  function completeFromFocus(task: Task) {
    const transition = focusCompletion.current;
    if (transition.pending || data.pending.has(task.id)) return;
    transition.pending = true;
    timer.pause(task.id);
    setFocusOpen(false);
    // Give the task board a painted frame without the modal before starting the tear.
    transition.frame = requestAnimationFrame(() => {
      transition.frame = requestAnimationFrame(() => {
        transition.frame = null;
        void complete(task).finally(() => { transition.pending = false; });
      });
    });
  }
  async function move(task: Task, date: string): Promise<boolean> {
    if (task.status === 'done') return false;
    const before = { plannedDate: task.plannedDate, status: task.status, completedAt: task.completedAt };
    if (!await data.update(task.id, scheduledPatch(date))) return false;
    setToast({ label: '已调整日期', action: async () => Boolean(await data.update(task.id, before)) });
    return true;
  }
  async function removeTask(task: Task) {
    if (!await data.remove(task.id)) return false;
    setToast({ label: '已删除' }); return true;
  }

  return <div className="app-shell">
    <header className="app-topbar"><Brand light /><div className="account-area"><LanguageToggle />{demo && <span className="demo-badge">{t("演示")}</span>}<details ref={accountMenu} className="account-menu"><summary aria-label={t("账号菜单")}><span className="avatar">{user?.email?.slice(0, 1).toUpperCase() || t('我')}</span><ChevronDown size={14} /></summary><div className="account-popover"><span className="account-email">{demo ? t('本机演示') : user?.email}</span><button type="button" onClick={() => { setExiting(true); void onExit().finally(() => setExiting(false)); }} disabled={exiting || data.pending.size > 0}><LogOut size={15} />{demo ? t('退出演示 / 登录') : t('退出登录')}</button><div className="account-utilities"><ThemeToggle /><FeedbackLink /></div></div></details></div></header>
    <aside className="app-sidebar"><span className="sidebar-label">{t("个人空间")}</span><nav aria-label={t("主要导航")}>{nav.map(item => <button type="button" key={item.page} className={page === item.page ? 'nav-item active' : 'nav-item'} aria-current={page === item.page ? 'page' : undefined} onClick={() => { setPage(item.page); setToast(null); }}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.count !== undefined && <small>{item.count}</small>}</button>)}</nav><div className="sidebar-utilities"><FeedbackLink /><ThemeToggle /></div></aside>
    <main className="app-workspace">
      {focus && !focusOpen && <section className="active-focus-bar" aria-label={t("当前专注计时")}><div className="active-focus-title"><small>{timer.running ? t('正在专注') : t('计时已暂停')}</small><strong title={focus.title}>{focus.title}</strong></div><FocusClock elapsed={timer.elapsed} /><div className="active-focus-actions"><button type="button" className="text-button" aria-label={timer.running ? t('暂停计时') : t('继续计时')} onClick={timer.toggle} disabled={data.pending.has(focus.id)}>{timer.running ? <Pause size={15} /> : <Play size={15} />}{timer.running ? t('暂停') : t('继续')}</button><button type="button" className="text-button" onClick={() => setFocusOpen(true)}>{t("展开专注")}</button><button type="button" className="icon-button" aria-label={t("结束计时")} title={t("结束计时，不完成任务")} onClick={stopFocus} disabled={data.pending.has(focus.id)}><X size={16} /></button></div></section>}
      {(data.error || authError) && <div className="error-banner" role="alert"><AlertCircle size={17} /><span>{translateMessage(data.error || authError)}</span><button className="text-button" type="button" onClick={() => void data.reload()} disabled={data.pending.size > 0 || data.loading}>{t("重试")}</button>{data.error && <button type="button" className="icon-button" onClick={data.clearError} aria-label={t("关闭错误提示")}><X size={16} /></button>}</div>}
      {desktop.error && <div className="error-banner" role="alert"><AlertCircle size={17} /><span>{translateMessage(desktop.error)}</span><button type="button" className="icon-button" aria-label={t("关闭小窗提示")} onClick={desktop.clearError}><X size={16} /></button></div>}
      {data.loading ? <div className="loading-state" role="status"><LoaderCircle size={25} className="spin" /><span>{t("正在打开计划")}</span></div> : page === 'today' ? <TodayPage utility={<button type="button" className="button desktop-window-trigger" onClick={() => void desktop.open()} disabled={desktop.opening} title={desktop.supported ? t("以置顶小窗显示今日任务") : t("需要支持画中画小窗的桌面浏览器")}><PictureInPicture2 size={17} />{desktop.portal ? t("小窗已开启") : t("置顶小窗")}</button>} today={today} tasks={data.tasks} pending={data.pending} tearing={data.tearing} onTearEnd={data.finishTear} onCreate={() => setEditor({ date: today, kind: 'plan' })} onEdit={editTask} onFocus={task => startFocus(task, true)} onComplete={task => { void complete(task); }} onRestore={task => { void restore(task); }} /> : page === 'calendar' ? <CalendarPage today={today} tasks={data.tasks} pending={data.pending} onCreate={date => setEditor({ date, kind: 'plan' })} onEdit={editTask} onMove={move} /> : <NotesPage tasks={data.tasks} pending={data.pending} onCreate={() => setEditor({ date: null, kind: 'note' })} onEdit={editTask} onSchedule={task => setEditor({ task, date: today, kind: 'plan' })} />}
    </main>
    {desktop.portal && createPortal(<DesktopTasks focus={focus ? { task: focus, elapsed: timer.elapsed, running: timer.running } : null} onStartFocus={task => startFocus(task, false)} onToggleFocus={timer.toggle} onStopFocus={stopFocus} today={today} tasks={data.tasks} pending={data.pending} loading={data.loading} error={data.error || authError} onCreate={async title => Boolean(await data.create({ title, plannedDate: today, estimate: null, tone: "lemon" }))} onComplete={task => complete(task, false)} onRestore={restore} onReturn={() => { setPage("today"); window.focus(); desktop.close(); }} onClose={desktop.close} />, desktop.portal)}
    {editor && <TaskDialog key={`${editor.task?.id || 'new'}-${editor.kind}`} editor={editor} onClose={() => setEditor(null)} onSave={saveTask} onDelete={removeTask} />}
    {focus && focusOpen && <FocusDialog task={focus} elapsed={timer.elapsed} running={timer.running} onToggle={timer.toggle} pending={data.pending.has(focus.id)} onClose={stopFocus} onComplete={completeFromFocus} docking={desktop.opening} dockError={desktop.error} onDock={desktop.supported ? () => { void desktop.open().then(opened => { if (opened) setFocusOpen(false); }); } : undefined} />}
    {toast && <div className="toast" role="status"><Check size={17} /><span>{t(toast.label)}</span>{toast.action && <button type="button" onClick={() => { setUndoBusy(true); void toast.action!().then(success => { if (success) setToast({ label: '已撤销' }); }).finally(() => setUndoBusy(false)); }} disabled={undoBusy}><RotateCcw size={14} />{t("撤销")}</button>}<button type="button" className="toast-dismiss" aria-label={t("关闭提示")} onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}

export default function App() {
  const auth = useAuth();
  const [demo, setDemo] = useState(() => isDevelopmentDemoRequested(location.search, import.meta.env.DEV));
  async function exit() {
    if (demo) { const url = new URL(location.href); url.searchParams.delete('demo'); history.replaceState(null, '', url); setDemo(false); return true; }
    return auth.signOut();
  }
  if (!auth.ready && !demo) return <div className="boot-state"><Brand /><LoaderCircle className="spin" size={22} /></div>;
  if (auth.recovering || (!demo && !auth.session)) return <AuthPage key={auth.recovering ? 'recovery' : 'account'} recovering={auth.recovering} onRecovered={auth.finishRecovery} sessionError={auth.error} />;
  return <Workspace key={demo ? 'demo' : auth.session!.user.id} demo={demo} user={auth.session?.user} onExit={exit} authError={auth.error} />;
}
