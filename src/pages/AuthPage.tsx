import { LanguageToggle } from '../components/LanguageToggle';
import { useLocale } from '../hooks/LocaleProvider';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';
import { FeedbackLink } from '../components/FeedbackLink';
import { Brand } from '../components/Brand';
import { ProductPreview } from '../components/ProductPreview';
import { supabase, authConfigurationError } from '../lib/supabase';
import { authErrorMessage, isRegisteredEmailError, REGISTERED_EMAIL_MESSAGE } from '../lib/errors';
import { getSignupOutcome } from '../lib/signup';
import type { SignupOutcome } from '../lib/signup';

type AuthMode = 'login' | 'signup' | 'reset' | 'recovery';
interface Props { recovering: boolean; onRecovered(): void; sessionError?: string }

export function AuthPage({ recovering, onRecovered, sessionError }: Props) {
  const { t, translateMessage } = useLocale();
  const [mode, setMode] = useState<AuthMode>(recovering ? 'recovery' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [signupOutcome, setSignupOutcome] = useState<SignupOutcome | null>(null);
  const requestPending = useRef(false);
  const [previewInterruption, setPreviewInterruption] = useState(0);
  const titles = { login: t('欢迎回来'), signup: t('创建你的账号'), reset: t('找回密码'), recovery: t('设置新密码') };
  const submitLabels = { login: t('登录'), signup: t('注册'), reset: t('发送重置邮件'), recovery: t('保存新密码') };

  function changeMode(next: AuthMode) {
    if (next === mode || requestPending.current) return;
    setPreviewInterruption(value => value + 1);
    setMode(next); setError(''); setMessage(''); setPassword(''); setShowPassword(false); setSignupOutcome(null);
  }
  function changeEmail(value: string) {
    setEmail(value); setError(''); setMessage(''); setSignupOutcome(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewInterruption(value => value + 1);
    if (requestPending.current) return;
    if (!supabase) { setError(authConfigurationError || '邮箱服务尚未配置。'); return; }
    requestPending.current = true;
    setPending(true); setError(''); setMessage(''); setSignupOutcome(null);
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      } else if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin } });
        if (result.error) throw result.error;
        const outcome = getSignupOutcome(result.data);
        setSignupOutcome(outcome);
        if (outcome === 'existing-account') setError(REGISTERED_EMAIL_MESSAGE);
        else if (outcome === 'verify-email') setMessage('请查收验证邮件，完成邮箱验证后登录。');
        else if (outcome === 'unknown') setError('暂时无法确认注册结果，请检查邮箱；已有账号可直接登录或找回密码。');
      } else if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/?auth=recovery` });
        if (result.error) throw result.error;
        setMessage('如果该邮箱已注册，你将收到密码重置邮件。');
      } else {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); onRecovered();
      }
    } catch (issue) {
      setError(authErrorMessage(issue));
      if (mode === 'signup' && isRegisteredEmailError(issue)) setSignupOutcome('existing-account');
    }
    finally { requestPending.current = false; setPending(false); }
  }

  return <main className="auth-page">
    <section className="auth-story" aria-label="alēthinósplan">
      <div className="auth-brand-row"><Brand light /></div>
      <div className="auth-story-copy"><span className="eyebrow">A LITTLE PLAN. A REAL STEP.</span><h1>{t("从一个念头，")}<br />{t("到一件完成的事。")}</h1></div>
      <ProductPreview interruption={previewInterruption} enabled={mode === 'login' || mode === 'signup'} />
      <div className="auth-story-note">
        <p className="auth-story-note-title">{t("不必填满每一天。")}</p>
        <p className="auth-story-note-body">{t("留一点余地，把在意的小事慢慢完成。")}</p>
      </div>
    </section>
    <div className="auth-language"><LanguageToggle /></div>
    <section className="auth-panel">
      <div className="auth-form-wrap" onFocusCapture={event => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) setPreviewInterruption(value => value + 1);
      }}>
        {(mode === 'reset') && <button className="text-button auth-back" type="button" onClick={() => changeMode('login')} disabled={pending}><ArrowLeft size={16} /> {t("返回登录")}</button>}
        <h2>{titles[mode]}</h2>
        <p className="auth-subtitle">{mode === 'signup' ? t('用邮箱保存你的计划。') : mode === 'reset' ? t('我们会发送一封重置邮件。') : mode === 'recovery' ? t('为账号设置新的密码。') : t('继续你的计划。')}</p>
        {(mode === 'login' || mode === 'signup') && <div className="auth-switch" role="group" aria-label={t("账号操作")}>
          <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')} disabled={pending}>{t("登录")}</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => changeMode('signup')} disabled={pending}>{t("注册")}</button>
        </div>}
        <form onSubmit={submit}>
          {mode !== 'recovery' && <label className="field">{t("邮箱")}<input type="email" name="email" autoComplete="email" value={email} onChange={event => changeEmail(event.target.value)} placeholder="you@example.com" required disabled={pending} /></label>}
          {mode !== 'reset' && <label className="field">{mode === 'recovery' ? t('新密码') : t('密码')}<span className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'login' ? t('输入密码') : t('至少 8 个字符')} minLength={mode === 'login' ? 1 : 8} required disabled={pending} /><button type="button" className="icon-button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? t('隐藏密码') : t('显示密码')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
          {mode === 'login' && <div className="auth-forgot"><button className="text-button" type="button" onClick={() => changeMode('reset')} disabled={pending}>{t("忘记密码？")}</button></div>}
          {(error || sessionError) && <p className="form-error" role="alert">{translateMessage(error || sessionError)}</p>}
          {mode === 'signup' && (signupOutcome === 'existing-account' || signupOutcome === 'unknown') && <div className="auth-alternatives" role="group" aria-label={t("已有账号操作")}><button className="text-button" type="button" onClick={() => changeMode('login')} disabled={pending}>{t("去登录")}</button><button className="text-button" type="button" onClick={() => changeMode('reset')} disabled={pending}>{t("找回密码")}</button></div>}
          {message && <p className="form-success" role="status"><Mail size={17} />{translateMessage(message)}</p>}
          <button className="button primary auth-submit" type="submit" disabled={pending || !supabase}>{pending ? <LoaderCircle className="spin" size={18} /> : null}{submitLabels[mode]}{!pending && <ArrowRight size={17} />}</button>
        </form>
        {!supabase && <p className="auth-config" role="status">{translateMessage(authConfigurationError)}</p>}
      </div>
      <footer className="auth-footer"><span>alēthinósplan</span><FeedbackLink compact /></footer>
    </section>
  </main>;
}
