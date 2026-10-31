export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export type Live2DModel = {
  id: string;
  code: string;
  name: string;
  cloudflare_url: string;
  enabled: boolean;
  created_at?: string;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string };
};

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
  prefer?: string;
};

export async function supabaseRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 아직 연결되지 않았습니다.');
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(SUPABASE_URL + '/' + path.replace(/^\//, ''), {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : 'Supabase 요청에 실패했습니다.';
    throw new Error(detail);
  }
  return data as T;
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession> {
  return supabaseRequest<SupabaseSession>('auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
}

export async function signOut(session: SupabaseSession): Promise<void> {
  await supabaseRequest<unknown>('auth/v1/logout', { method: 'POST', token: session.access_token });
}
