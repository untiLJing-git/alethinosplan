import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AlertCircle, CalendarDays, Check, ChevronDown, LoaderCircle, LogOut, RotateCcw, StickyNote, Sun, X } from 'lucide-react';
import { Brand } from './components/Brand';
import { TaskDialog } from './components/TaskDialog';
import type { TaskEditorState } from './components/TaskDialog';
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
import type { Page, Task, TaskDraft } from './lib/types';

interface Toast { label: string; action?: () => Promise<boolean> }
interface WorkspaceProps { demo: boolean; user?: User; onExit(): Promise<boolean>; authError: string }

function Workspace({ demo, user, onExit, authError }: WorkspaceProps) {
  const today = useToday();
  const repository = useMemo(() => demo ? demoRepository() : cloudRepository(supabase!, user!.id), [demo, user?.id]);
  const data = useTasks(repository);
  const [page, setPage] = useState<Page>('today');
  const [editor, setEditor] = useState<TaskEditorState | null>(null);
  const [focus, setFocus] = useState<Task | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [exiting, setExiting] = useState(false);
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
    { page: 'today' as const, label: '我的一天', icon: Sun, count: todayCount },
    { page: 'calendar' as const, label: '规划日历', icon: CalendarDays },
    { page: 'notes' as const, label: '随手记', icon: StickyNote, count: noteCount },
  ];

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
  async function complete(task: Task): Promise<boolean> {
    if (task.status !== 'planned') return false;
    const saved = await data.update(task.id, { status: 'done', completedAt: new Date().toISOString() }, true);
    if (!saved) return false;
    setToast({ label: '已完成', action: async () => Boolean(await data.update(task.id, { status: 'planned', completedAt: null })) });
    return true;
  }
  function completeFromFocus(task: Task) {
    const transition = focusCompletion.current;
    if (transition.pending || data.pending.has(task.id)) return;
    transition.pending = true;
    setFocus(null);
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
    <header className="app-topbar"><Brand light /><div className="account-area">{demo && <span className="demo-badge">演示</span>}<details className="account-menu"><summary aria-label="账号菜单"><span className="avatar">{user?.email?.slice(0, 1).toUpperCase() || '我'}</span><ChevronDown size={14} /></summary><div className="account-popover"><span className="account-email">{demo ? '本机演示' : user?.email}</span><button type="button" onClick={() => { setExiting(true); void onExit().finally(() => setExiting(false)); }} disabled={exiting || data.pending.size > 0}><LogOut size={15} />{demo ? '退出演示 / 登录' : '退出登录'}</button></div></details></div></header>
    <aside className="app-sidebar"><span className="sidebar-label">个人空间</span><nav aria-label="主要导航">{nav.map(item => <button type="button" key={item.page} className={page === item.page ? 'nav-item active' : 'nav-item'} aria-current={page === item.page ? 'page' : undefined} onClick={() => { setPage(item.page); setToast(null); }}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.count !== undefined && <small>{item.count}</small>}</button>)}</nav></aside>
    <main className="app-workspace">
      {(data.error || authError) && <div className="error-banner" role="alert"><AlertCircle size={17} /><span>{data.error || authError}</span><button className="text-button" type="button" onClick={() => void data.reload()} disabled={data.pending.size > 0 || data.loading}>重试</button>{data.error && <button type="button" className="icon-button" onClick={data.clearError} aria-label="关闭错误提示"><X size={16} /></button>}</div>}
      {data.loading ? <div className="loading-state" role="status"><LoaderCircle size={25} className="spin" /><span>正在打开计划</span></div> : page === 'today' ? <TodayPage today={today} tasks={data.tasks} pending={data.pending} tearing={data.tearing} onTearEnd={data.finishTear} onCreate={() => setEditor({ date: today, kind: 'plan' })} onEdit={editTask} onFocus={setFocus} onComplete={task => { void complete(task); }} onRestore={task => { void data.update(task.id, { status: 'planned', completedAt: null }).then(saved => { if (saved) setToast({ label: '已恢复到今天' }); }); }} /> : page === 'calendar' ? <CalendarPage today={today} tasks={data.tasks} pending={data.pending} onCreate={date => setEditor({ date, kind: 'plan' })} onEdit={editTask} onMove={move} /> : <NotesPage tasks={data.tasks} pending={data.pending} onCreate={() => setEditor({ date: null, kind: 'note' })} onEdit={editTask} onSchedule={task => setEditor({ task, date: today, kind: 'plan' })} />}
    </main>
    {editor && <TaskDialog key={`${editor.task?.id || 'new'}-${editor.kind}`} editor={editor} onClose={() => setEditor(null)} onSave={saveTask} onDelete={removeTask} />}
    {focus && <FocusDialog task={focus} pending={data.pending.has(focus.id)} onClose={() => setFocus(null)} onComplete={completeFromFocus} />}
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast.label}</span>{toast.action && <button type="button" onClick={() => { setUndoBusy(true); void toast.action!().then(success => { if (success) setToast({ label: '已撤销' }); }).finally(() => setUndoBusy(false)); }} disabled={undoBusy}><RotateCcw size={14} />撤销</button>}<button type="button" className="toast-dismiss" aria-label="关闭提示" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}

export default function App() {
  const auth = useAuth();
  const [demo, setDemo] = useState(() => new URLSearchParams(location.search).get('demo') === '1');
  function enterDemo() { const url = new URL(location.href); url.searchParams.set('demo', '1'); history.replaceState(null, '', url); setDemo(true); }
  async function exit() {
    if (demo) { const url = new URL(location.href); url.searchParams.delete('demo'); history.replaceState(null, '', url); setDemo(false); return true; }
    return auth.signOut();
  }
  if (!auth.ready && !demo) return <div className="boot-state"><Brand /><LoaderCircle className="spin" size={22} /></div>;
  if (auth.recovering || (!demo && !auth.session)) return <AuthPage key={auth.recovering ? 'recovery' : 'account'} recovering={auth.recovering} onRecovered={auth.finishRecovery} onDemo={enterDemo} sessionError={auth.error} />;
  return <Workspace key={demo ? 'demo' : auth.session!.user.id} demo={demo} user={auth.session?.user} onExit={exit} authError={auth.error} />;
}
