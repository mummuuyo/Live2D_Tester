import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Box, ExternalLink, FileSpreadsheet, LogOut, MousePointer2, RefreshCw, UserRound } from 'lucide-react';
import { loadSheetModels, SHEET_CSV_URL } from './lib/sheet';
import type { SheetModel } from './types';

const AUTHORIZED_MODEL_KEY = 'live2d-authorized-model-id';
const AUTHORIZED_CODE_KEY = 'live2d-authorized-model-code';
const MODEL_CODES_KEY = 'live2d-model-codes';

function Shell({ code, onExit, children }: { code: string; onExit: () => void; children: ReactNode }) {
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><Box size={19}/></span> Live2D Studio <span className="dev-tag">MODEL ACCESS</span></Link>
      <nav>{code && <><span className="nickname"><UserRound size={15}/> 모델 코드 {code}</span><button className="button ghost small" onClick={onExit}><LogOut size={15}/> 나가기</button></>}</nav>
    </header>
    <main className="main">{children}</main>
    <footer>Live2D Studio · 모델 코드와 원래 모델명으로 입장</footer>
  </div>;
}

function useSheetModels() {
  const [models, setModels] = useState<SheetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const rows = await loadSheetModels();
      setModels(rows);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : '시트 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  return { models, loading, error, lastUpdated, refresh };
}

function useModelCodes(models: SheetModel[]) {
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!models.length) return;
    let saved: Record<string, string> = {};
    try {
      const raw = sessionStorage.getItem(MODEL_CODES_KEY);
      if (raw) saved = JSON.parse(raw) as Record<string, string>;
    } catch {
      saved = {};
    }

    const next: Record<string, string> = {};
    const used = new Set<string>();
    for (const model of models) {
      const savedCode = saved[model.id];
      if (typeof savedCode === 'string' && /^\d{4}$/.test(savedCode) && !used.has(savedCode)) {
        next[model.id] = savedCode;
        used.add(savedCode);
      }
    }

    for (const model of models) {
      if (next[model.id]) continue;
      let code = '';
      do {
        code = String(Math.floor(1000 + Math.random() * 9000));
      } while (used.has(code));
      next[model.id] = code;
      used.add(code);
    }

    try {
      sessionStorage.setItem(MODEL_CODES_KEY, JSON.stringify(next));
    } catch {
      // Codes remain usable for this page even when browser storage is unavailable.
    }
    setCodes(next);
  }, [models]);

  return codes;
}

function AccessPage({ onEnter }: { onEnter: (modelId: string, code: string) => void }) {
  const { models, loading, error, refresh } = useSheetModels();
  const codes = useModelCodes(models);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const selectedModel = models.find(model => model.id === selectedId);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedModel) {
      setFormError('먼저 모델 코드를 선택해 주세요.');
      return;
    }
    if (password.trim() !== selectedModel.nickname) {
      setFormError('비밀번호가 맞지 않습니다. 원래 모델명을 확인해 주세요.');
      return;
    }
    const code = codes[selectedModel.id];
    onEnter(selectedModel.id, code);
    navigate('/models/' + encodeURIComponent(selectedModel.id));
  }

  return <section className="entry-layout access-layout">
    <div className="hero-copy-block">
      <div className="eyebrow"><span className="live-dot"/> LIVE2D MODEL LAB</div>
      <h1>모델 코드를 고르고,<br/><span className="gradient-text">이름으로 입장하세요.</span></h1>
      <p className="hero-copy">목록에 표시된 4자리 코드를 선택한 뒤, 해당 모델의 원래 이름을 비밀번호로 입력해 주세요.</p>
      <div className="mini-points"><span><Box size={15}/> 4자리 모델 코드</span><span><UserRound size={15}/> 모델명 비밀번호</span><span><MousePointer2 size={15}/> 모델별 입장</span></div>
    </div>

    <div className="entry-card access-card">
      <div className="entry-icon"><Box size={23}/></div>
      <div className="eyebrow">MODEL ACCESS</div>
      <h2>모델 선택하기</h2>
      <p className="muted">모델 이름은 숨기고 4자리 코드로 표시합니다.</p>

      {loading ? <div className="empty-state compact-state"><RefreshCw className="spin" size={24}/><p>모델 목록을 불러오는 중…</p></div>
        : error ? <div className="error-state compact-state"><p>{error}</p><button className="button" onClick={() => void refresh()}>다시 시도</button></div>
        : models.length === 0 ? <div className="empty-state compact-state"><p>현재 등록된 모델이 없습니다.</p></div>
        : <div className="model-code-list" aria-label="모델 코드 목록">
          {models.map((model, index) => <button
            key={model.id}
            type="button"
            className={'model-code-option' + (selectedId === model.id ? ' selected' : '')}
            onClick={() => { setSelectedId(model.id); setPassword(''); setFormError(''); }}
            aria-pressed={selectedId === model.id}
          >
            <span className="model-code-number">{codes[model.id] || '----'}</span>
            <span className="model-code-caption">MODEL {String(index + 1).padStart(2, '0')}</span>
          </button>)}
        </div>}

      {!loading && !error && models.length > 0 && <form className="form-stack access-form" onSubmit={submit}>
        <div className="selected-model-label">{selectedModel ? <>선택한 코드 <strong>{codes[selectedModel.id] || '----'}</strong></> : '모델 코드를 선택해 주세요.'}</div>
        <label>원래 모델명 (비밀번호)
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={event => { setPassword(event.target.value); setFormError(''); }}
            placeholder="모델의 원래 이름 입력"
            required
          />
        </label>
        {formError && <p className="inline-error">{formError}</p>}
        <button className="button full" type="submit" disabled={!selectedModel}>입장하기 <ArrowLeft className="flip" size={16}/></button>
      </form>}
      <p className="small-note">모델 코드는 이 브라우저 세션 동안 유지됩니다.</p>
    </div>
  </section>;
}

function ModelListPage({ nickname }: { nickname: string }) {
  const { models, loading, error, lastUpdated, refresh } = useSheetModels();
  return <section>
    <div className="page-heading"><div><div className="eyebrow">GOOGLE SHEETS MODEL LIST</div><h1>반가워요, {nickname}님</h1><p className="muted">공개 시트에 등록된 Drive 폴더를 불러옵니다.</p></div><button className="button secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15}/> 새로고침</button></div>
    <div className="notice"><FileSpreadsheet size={16}/><span>시트 수정 후 새로고침하면 목록에 반영됩니다.</span><a href={SHEET_CSV_URL} target="_blank" rel="noreferrer">CSV 확인 <ExternalLink size={13}/></a></div>
    {loading ? <div className="empty-state"><RefreshCw className="spin" size={27}/><h3>Google Sheets 읽는 중…</h3></div>
      : error ? <div className="error-state"><h3>시트 데이터를 불러오지 못했습니다.</h3><p>{error}</p><p className="muted">시트가 웹에 게시되어 있고 CSV 링크가 공개 상태인지 확인해 주세요.</p><button className="button" onClick={() => void refresh()}>다시 시도</button></div>
      : models.length === 0 ? <div className="empty-state"><Box size={32}/><h3>등록된 모델이 없습니다</h3><p>시트의 닉네임과 Google Drive 주소 열을 확인해 주세요.</p></div>
      : <><div className="model-grid">{models.map((model, index) => <article className="model-card" key={model.id}><div className="model-thumb"><div className="avatar-placeholder"><Box size={38}/><span>DRIVE MODEL</span></div><span className="card-category">MODEL {String(index + 1).padStart(2, '0')}</span></div><div className="model-card-body"><h3>{model.nickname}</h3><p>Google Drive 폴더가 시트에 등록되어 있습니다.</p><div className="card-actions"><Link className="button small" to={'/models/' + encodeURIComponent(model.id)}>상세 보기</Link><a className="button secondary small" href={model.driveUrl} target="_blank" rel="noreferrer">Drive 폴더 <ExternalLink size={13}/></a></div></div></article>)}</div><div className="section-note"><span className="live-dot"/> {models.length}개 행 · {lastUpdated} 갱신</div></>}
  </section>;
}

function ViewerPage({ authorizedId, nickname }: { authorizedId: string; nickname: string }) {
  const { id } = useParams();
  const { models, loading, error } = useSheetModels();
  const model = models.find(item => item.id === decodeURIComponent(id || ''));

  if (id !== encodeURIComponent(authorizedId)) return <Navigate to="/" replace/>;
  if (loading) return <p className="muted">시트에서 모델 정보를 불러오는 중…</p>;
  if (error || !model) return <div className="empty-state"><h2>모델을 찾을 수 없습니다.</h2><p>{error}</p><Link className="button" to="/">모델 선택으로</Link></div>;

  return <ModelListPage nickname={nickname}/>;
}

export default function App() {
  const [authorizedId, setAuthorizedId] = useState(() => {
    try { return sessionStorage.getItem(AUTHORIZED_MODEL_KEY) || ''; } catch { return ''; }
  });
  const [authorizedCode, setAuthorizedCode] = useState(() => {
    try { return sessionStorage.getItem(AUTHORIZED_CODE_KEY) || ''; } catch { return ''; }
  });

  function enter(modelId: string, code: string) {
    try {
      sessionStorage.setItem(AUTHORIZED_MODEL_KEY, modelId);
      sessionStorage.setItem(AUTHORIZED_CODE_KEY, code);
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }
    setAuthorizedId(modelId);
    setAuthorizedCode(code);
  }

  function exit() {
    try {
      sessionStorage.removeItem(AUTHORIZED_MODEL_KEY);
      sessionStorage.removeItem(AUTHORIZED_CODE_KEY);
    } catch {
      // Ignore unavailable browser storage.
    }
    setAuthorizedId('');
    setAuthorizedCode('');
  }

  return <Shell code={authorizedCode} onExit={exit}>
    <Routes>
      <Route path="/" element={<AccessPage onEnter={enter}/>}/>
      <Route path="/models/:id" element={authorizedId ? <ViewerPage authorizedId={authorizedId} nickname={authorizedId}/> : <Navigate to="/" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </Shell>;
}
