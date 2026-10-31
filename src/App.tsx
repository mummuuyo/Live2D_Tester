import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ArrowLeft, Box, ExternalLink, LogOut, MousePointer2, RefreshCw, Save, UserRound } from 'lucide-react';
import { isSupabaseConfigured, signInWithPassword, signOut, supabaseRequest } from './lib/supabase';
import type { Live2DModel, SupabaseSession } from './lib/supabase';

const ADMIN_SESSION_KEY = 'live2d-supabase-admin-session';

function normalizeModelName(value: string): string {
  return value.normalize('NFC').trim();
}

function readAdminSession(): SupabaseSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) as SupabaseSession : null;
  } catch {
    return null;
  }
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><Box size={19}/></span> Live2D Studio <span className="dev-tag">CLOUDFLARE</span></Link>
      <nav><Link to="/admin" className="button ghost small">관리자</Link></nav>
    </header>
    <main className="main">{children}</main>
    <footer>Live2D Studio · Cloudflare 모델 주소 · Supabase 모델 목록</footer>
  </div>;
}

function SetupNotice() {
  return <div className="supabase-setup">
    <div className="eyebrow">SUPABASE CONNECTION REQUIRED</div>
    <h2>Supabase 연결이 필요합니다</h2>
    <p>프로젝트 주소와 공개용 키를 GitHub Actions 변수에 등록하고, Supabase에서 데이터베이스 설정을 실행해 주세요.</p>
    <ol>
      <li>저장소 Settings → Secrets and variables → Actions → Variables에서 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>를 추가합니다.</li>
      <li><a href="https://github.com/mummuuyo/Live2D_Tester/blob/main/supabase/schema.sql" target="_blank" rel="noreferrer">Supabase 설정 SQL 열기 <ExternalLink size={13}/></a>를 SQL Editor에서 실행합니다.</li>
      <li>Supabase Auth에서 관리자 계정을 만든 뒤, README의 안내대로 관리자 권한을 연결합니다.</li>
    </ol>
  </div>;
}

type PublicModelOption = { code: string };

function AccessPage() {
  const [models, setModels] = useState<PublicModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshModels() {
    if (!isSupabaseConfigured) {
      setError('Supabase 연결이 설정되지 않았습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await supabaseRequest<PublicModelOption[]>(
        'rest/v1/live2d_models?select=code&order=created_at.desc'
      );
      setModels(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '모델 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshModels(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCode || !password) {
      setError('모델을 선택하고 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const rows = await supabaseRequest<{ cloudflare_url: string }[]>(
        'rest/v1/rpc/get_live2d_model_for_access',
        { method: 'POST', body: { p_code: selectedCode, p_password: normalizeModelName(password) } }
      );
      const modelUrl = rows[0]?.cloudflare_url;
      if (!modelUrl || new URL(modelUrl).protocol !== 'https:') {
        throw new Error('모델 코드 또는 비밀번호가 올바르지 않습니다.');
      }
      sessionStorage.setItem('live2d-selected-model-url', modelUrl);
      setPassword('');
      window.location.assign(import.meta.env.BASE_URL + 'tracking/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '입장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) return <section className="entry-layout access-layout"><SetupNotice/></section>;

  return <section className="entry-layout access-layout">
    <div className="hero-copy-block">
      <div className="eyebrow"><span className="live-dot"/> LIVE2D MODEL LAB</div>
      <h1>모델을 선택하고,<br/><span className="gradient-text">바로 만나 보세요.</span></h1>
      <p className="hero-copy">모델 코드를 선택하고 비밀번호를 입력하면 트래킹 화면으로 이동합니다.</p>
      <div className="mini-points"><span><Box size={15}/> 모델 코드 선택</span><span><UserRound size={15}/> 비밀번호 입력</span><span><MousePointer2 size={15}/> Live2D 트래킹</span></div>
    </div>
    <div className="entry-card access-card">
      <div className="entry-icon"><Box size={23}/></div>
      <div className="eyebrow">MODEL ACCESS</div>
      <h2>모델 입장</h2>
      <p className="muted">입장 후에는 닉네임이나 주소를 표시하지 않습니다.</p>
      {loading ? <div className="empty-state compact-state"><RefreshCw className="spin" size={24}/><p>모델 목록을 불러오는 중…</p></div>
        : error && models.length === 0 ? <div className="error-state compact-state"><p>{error}</p><button className="button" onClick={() => void refreshModels()}>다시 시도</button></div>
        : models.length === 0 ? <div className="empty-state compact-state"><p>등록된 모델이 없습니다.</p><Link className="button" to="/admin">관리자 열기</Link></div>
        : <form className="form-stack access-form" onSubmit={submit}>
          <label>모델 선택<select value={selectedCode} onChange={event => { setSelectedCode(event.target.value); setPassword(''); setError(''); }} required>
            <option value="" disabled>모델 코드를 선택해 주세요</option>
            {models.map(model => <option key={model.code} value={model.code}>{model.code}</option>)}
          </select></label>
          <label>비밀번호<input type="text" autoComplete="off" value={password} onChange={event => { setPassword(event.target.value); setError(''); }} placeholder="모델 비밀번호 입력" required /></label>
          {error && <p className="inline-error">{error}</p>}
          <button className="button full" type="submit" disabled={busy || !selectedCode}>{busy ? '확인 중…' : <>트래킹 시작 <ArrowLeft className="flip" size={16}/></>}</button>
        </form>}
    </div>
  </section>;
}

function AdminPage() {
  const [session, setSession] = useState<SupabaseSession | null>(readAdminSession);
  const [models, setModels] = useState<Live2DModel[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modelName, setModelName] = useState('');
  const [cloudflareUrl, setCloudflareUrl] = useState('');
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadModels(auth: SupabaseSession) {
    const membership = await supabaseRequest<{ user_id: string }[]>(
      'rest/v1/live2d_admins?select=user_id&user_id=eq.' + encodeURIComponent(auth.user.id),
      { token: auth.access_token }
    );
    if (membership.length === 0) throw new Error('이 Supabase 계정에 관리자 권한이 없습니다.');
    const rows = await supabaseRequest<Live2DModel[]>(
      'rest/v1/live2d_models?select=id,code,name,cloudflare_url,enabled,created_at&order=created_at.desc',
      { token: auth.access_token }
    );
    setModels(rows);
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      setLoading(false);
      return;
    }
    let active = true;
    void loadModels(session).catch(e => {
      if (!active) return;
      setError(e instanceof Error ? e.message : '관리자 정보를 확인하지 못했습니다.');
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setSession(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  async function logIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const auth = await signInWithPassword(email.trim(), password);
      await loadModels(auth);
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(auth));
      setSession(auth);
      setPassword('');
      setNotice('Supabase 관리자에 연결했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function logOut() {
    if (session) {
      try { await signOut(session); } catch { /* local session is still cleared */ }
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
    setModels([]);
    setError('');
    setNotice('');
  }

  async function addModel(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const cleanName = normalizeModelName(modelName);
    const cleanUrl = cloudflareUrl.trim();
    if (!cleanName) { setError('모델명을 입력해 주세요.'); return; }
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'https:') throw new Error('invalid URL');
    } catch {
      setError('https://로 시작하는 공개 Cloudflare 주소를 입력해 주세요.');
      return;
    }
    let code = '';
    do { code = String(Math.floor(1000 + Math.random() * 9000)); }
    while (models.some(model => model.code === code));
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await supabaseRequest<Live2DModel[]>('rest/v1/live2d_models', {
        method: 'POST',
        token: session.access_token,
        prefer: 'return=representation',
        body: { code, name: cleanName, cloudflare_url: cleanUrl, enabled: true }
      });
      setModelName('');
      setCloudflareUrl('');
      await loadModels(session);
      setNotice('모델을 Supabase에 저장했습니다. 공개 목록에 자동 반영됩니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '모델을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function saveUrl(model: Live2DModel) {
    if (!session) return;
    const value = (draftUrls[model.id] ?? model.cloudflare_url).trim();
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') throw new Error('invalid URL');
    } catch {
      setError('https://로 시작하는 Cloudflare 주소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await supabaseRequest<Live2DModel[]>('rest/v1/live2d_models?id=eq.' + encodeURIComponent(model.id), {
        method: 'PATCH',
        token: session.access_token,
        prefer: 'return=representation',
        body: { cloudflare_url: value }
      });
      await loadModels(session);
      setNotice('Cloudflare 주소를 Supabase에 저장했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '주소를 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) return <section className="admin-page"><SetupNotice/></section>;

  if (!session) return <section className="entry-layout access-layout">
    <div className="hero-copy-block"><div className="eyebrow">ADMIN CHANNEL</div><h1>모델을 관리하고,<br/><span className="gradient-text">Cloudflare로 연결하세요.</span></h1><p className="hero-copy">Supabase Auth 관리자 계정으로 로그인합니다. 모델 목록과 주소는 Supabase에 저장되어 사이트에 자동 반영됩니다.</p></div>
    <div className="entry-card access-card"><div className="eyebrow">SUPABASE ADMIN</div><h2>관리자 로그인</h2><p className="muted">Supabase에서 미리 만든 관리자 계정을 사용하세요.</p>
      <form className="form-stack" onSubmit={logIn}>
        <label>이메일<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label>
        <label>비밀번호<input type="text" value={password} onChange={event => setPassword(event.target.value)} autoComplete="off" required /></label>
        {error && <p className="inline-error">{error}</p>}
        <button className="button full" type="submit" disabled={busy}>{busy ? '연결 중…' : '로그인'}</button>
      </form>
    </div>
  </section>;

  return <section className="admin-page">
    <div className="page-heading"><div><div className="eyebrow">SUPABASE ADMIN</div><h1>모델 관리</h1><p className="muted">모델명과 Cloudflare 주소는 Supabase에 저장됩니다.</p></div><button className="button ghost small" onClick={() => void logOut()}><LogOut size={15}/> 로그아웃</button></div>
    {loading && <div className="empty-state"><RefreshCw className="spin" size={24}/><p>Supabase 연결 중…</p></div>}
    {!loading && error && <p className="inline-error">{error}</p>}
    {notice && <p className="admin-success">{notice}</p>}
    {!loading && <form className="admin-add-form" onSubmit={addModel}>
      <div className="admin-add-heading"><div className="eyebrow">ADD A NEW MODEL</div><h2>새 Cloudflare 모델 추가</h2><p className="muted">Cloudflare R2 등에 업로드한 모델의 공개 HTTPS 주소를 입력하세요.</p></div>
      <div className="admin-add-grid supabase-add-grid">
        <label>모델명 (입장 비밀번호)<input value={modelName} onChange={event => setModelName(event.target.value)} placeholder="예: 차서나 모델" required /></label>
        <label>Cloudflare 공개 주소<input type="url" value={cloudflareUrl} onChange={event => setCloudflareUrl(event.target.value)} placeholder="https://…/model.model3.json" required /></label>
      </div>
      <button className="button" type="submit" disabled={busy}><Save size={15}/> Supabase에 저장</button>
    </form>}
    {!loading && !error && <><div className="admin-list-heading"><h2>등록된 모델 <span>{models.length}</span></h2><p className="muted">랜덤 코드와 실제 모델명을 확인할 수 있습니다.</p></div>
      {models.length === 0 ? <div className="empty-state"><p>아직 모델이 없습니다.</p></div> : <div className="admin-model-list">
        {models.map(model => <article className="admin-model-row supabase-model-row" key={model.id}>
          <div className="admin-model-identity"><span className="admin-code">{model.code}</span><div><strong>{model.name}</strong><span className="muted">{model.enabled ? '사용 중' : '숨김'}</span></div></div>
          <label className="admin-drive-link supabase-url-field"><span>Cloudflare 공개 주소</span><input type="url" value={draftUrls[model.id] ?? model.cloudflare_url} onChange={event => setDraftUrls(current => ({ ...current, [model.id]: event.target.value }))} /></label>
          <div className="supabase-row-actions"><a className="button ghost small" href={model.cloudflare_url} target="_blank" rel="noreferrer">주소 열기 <ExternalLink size={13}/></a><button className="button secondary small" onClick={() => void saveUrl(model)} disabled={busy}><Save size={13}/> 저장</button></div>
        </article>)}
      </div>}
    </>}
  </section>;
}

export default function App() {
  return <Shell><Routes>
    <Route path="/" element={<AccessPage/>}/>
    <Route path="/admin" element={<AdminPage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Shell>;
}

