import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function configError(): string | null {
  if (!url || !key || url.includes('YOUR_PROJECT') || key.includes('YOUR_PUBLISHABLE')) return '邮箱服务尚未配置。';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) return '邮箱服务地址需要使用 HTTPS。';
    if (key.startsWith('sb_secret_')) return '不能在网页端使用私密服务密钥。';
    if (key.startsWith('eyJ')) {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
      if (payload.role !== 'anon') return '请使用 publishable key，而不是服务端密钥。';
    } else if (!key.startsWith('sb_publishable_')) return '请配置有效的 Supabase publishable key。';
    return null;
  } catch { return '邮箱服务配置无效。'; }
}

export const authConfigurationError = configError();
export const supabase = authConfigurationError ? null : createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
