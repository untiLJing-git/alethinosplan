import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';
import { Brand } from '../components/Brand';
import { supabase, authConfigurationError } from '../lib/supabase';
import { authErrorMessage } from '../lib/errors';

type AuthMode = 'login' | 'signup' | 'reset' | 'recovery';
interface Props { onDemo(): void; recovering: boolean; onRecovered(): void; sessionError?: string }

export function AuthPage({ onDemo, recovering, onRecovered, sessionError }: Props) {
  const [mode, setMode] = useState<AuthMode>(recovering ? 'recovery' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const titles = { login: '欢迎回来', signup: '创建你的账号', reset: '找回密码', recovery: '设置新密码' };
  const submitLabels = { login: '登录', signup: '注册', reset: '发送重置邮件', recovery: '保存新密码' };

  function changeMode(next: AuthMode) { setMode(next); setError(''); setMessage(''); setPassword(''); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setError(authConfigurationError || '邮箱服务尚未配置。'); return; }
    setPending(true); setError(''); setMessage('');
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      } else if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin } });
        if (result.error) throw result.error;
        if (!result.data.session) setMessage('验证邮件已发送，请在邮箱中完成验证后登录。');
        setPassword('');
      } else if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/?auth=recovery` });
        if (result.error) throw result.error;
        setMessage('如果该邮箱已注册，你将收到密码重置邮件。');
      } else {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); onRecovered();
      }
    } catch (issue) { setError(authErrorMessage(issue)); }
    finally { setPending(false); }
  }

  return <main className="auth-page">
    <section className="auth-story" aria-label="alēthinósplan">
      <Brand light />
      <div className="auth-story-copy"><span className="eyebrow">A LITTLE PLAN. A REAL STEP.</span><h1>计划很轻，<br />每一步都算数。</h1></div>
      <div className="auth-paper-scene" aria-hidden="true">
        <div className="auth-paper paper-sky"><span className="paper-tape" /><small>今天</small><strong>读一章喜欢的书</strong><span className="paper-detail">20 分钟，留给自己。</span></div>
        <div className="auth-paper paper-lemon"><span className="paper-tape" /><small>一件一件，慢慢来</small><strong>开始那个想做的计划</strong><span className="auth-paper-check"><Check size={19} /> 完成，然后放下。</span></div>
      </div>
      <span className="auth-story-bottom">YOUR DAY, YOUR OWN PACE.</span>
    </section>
    <section className="auth-panel">
      <div className="auth-mobile-brand"><Brand /></div>
      <div className="auth-form-wrap">
        {(mode === 'reset') && <button className="text-button auth-back" type="button" onClick={() => changeMode('login')}><ArrowLeft size={16} /> 返回登录</button>}
        <h2>{titles[mode]}</h2>
        <p className="auth-subtitle">{mode === 'signup' ? '用邮箱保存你的计划。' : mode === 'reset' ? '我们会发送一封重置邮件。' : mode === 'recovery' ? '为账号设置新的密码。' : '继续你的计划。'}</p>
        {(mode === 'login' || mode === 'signup') && <div className="auth-switch" role="group" aria-label="账号操作">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')}>登录</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => changeMode('signup')}>注册</button>
        </div>}
        <form onSubmit={submit}>
          {mode !== 'recovery' && <label className="field">邮箱<input type="email" name="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required disabled={pending} /></label>}
          {mode !== 'reset' && <label className="field">{mode === 'recovery' ? '新密码' : '密码'}<span className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'login' ? '输入密码' : '至少 8 个字符'} minLength={mode === 'login' ? 1 : 8} required disabled={pending} /><button type="button" className="icon-button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
          {mode === 'login' && <div className="auth-forgot"><button className="text-button" type="button" onClick={() => changeMode('reset')}>忘记密码？</button></div>}
          {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
          {message && <p className="form-success" role="status"><Mail size={17} />{message}</p>}
          <button className="button primary auth-submit" type="submit" disabled={pending || !supabase}>{pending ? <LoaderCircle className="spin" size={18} /> : null}{submitLabels[mode]}{!pending && <ArrowRight size={17} />}</button>
        </form>
        {!supabase && <p className="auth-config" role="status">{authConfigurationError}可先体验演示。</p>}
        {!recovering && <button className="demo-link" type="button" onClick={onDemo}>先体验，不注册 <ArrowRight size={15} /></button>}
      </div>
      <span className="auth-footer">alēthinósplan</span>
    </section>
  </main>;
}
