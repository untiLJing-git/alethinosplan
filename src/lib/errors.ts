export const REGISTERED_EMAIL_MESSAGE = '该邮箱已注册，请直接登录，或找回密码。';

export function isRegisteredEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'user_already_exists' || code === 'email_exists') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('user already registered') || message.includes('email already registered');
}

export function authErrorMessage(error: unknown): string {
  if (isRegisteredEmailError(error)) return REGISTERED_EMAIL_MESSAGE;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login')) return '邮箱或密码不正确。';
  if (message.includes('email not confirmed')) return '请先打开验证邮件，完成邮箱验证。';
  if (message.includes('rate limit') || message.includes('too many')) return '操作有些频繁，请稍后再试。';
  if (message.includes('password') && (message.includes('weak') || message.includes('least'))) return '密码强度不足，请使用更长且不常见的密码。';
  if (message.includes('fetch') || message.includes('network')) return '网络连接失败，请检查网络后重试。';
  if (message.includes('same password')) return '请使用与旧密码不同的新密码。';
  return '操作未完成，请稍后重试。';
}

export function dataErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('alethinos_tasks') || message.includes('schema cache')) return '数据库尚未初始化，请执行项目中的 Supabase SQL。';
  if (message.includes('row-level') || message.includes('permission')) return '当前账号没有操作权限，请重新登录。';
  if (message.includes('QuotaExceeded') || message.includes('localStorage')) return '浏览器存储不可用，演示数据未保存。';
  return '保存未完成，请检查网络后重试。';
}
