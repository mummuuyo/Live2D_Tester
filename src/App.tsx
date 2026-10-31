import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Box, ExternalLink, LogOut, MousePointer2, RefreshCw, UserRound } from 'lucide-react';
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

function ViewerPage({ authorizedId }: { authorizedId: string }) {
  const { id } = useParams();
  const { models, loading, error } = useSheetModels();
  const requestedId = decodeURIComponent(id || '');
  const model = models.find(item => item.id === requestedId);

  if (requestedId !== authorizedId) return <Navigate to="/" replace/>;
  if (loading) return <p className="muted">모델 정보를 불러오는 중…</p>;
  if (error || !model) return <div className="empty-state"><h2>모델을 찾을 수 없습니다.</h2><p>{error}</p><Link className="button" to="/">모델 선택으로</Link></div>;

  return <section>
    <Link to="/" className="back-link"><ArrowLeft size={16}/> 모델 코드 목록</Link>
    <div className="viewer-layout">
      <div className="viewer-stage">
        <div className="stage-grid"></div>
        <div className="viewer-placeholder">
          <div className="avatar-large"><Box size={56}/></div>
          <span className="eyebrow">DRIVE FOLDER CONNECTED</span>
          <h2>{model.nickname}</h2>
          <p>Drive 폴더 링크가 연결되었습니다.</p>
          <span className="muted">실제 Live2D 렌더링을 위해서는 폴더 내부 모델 파일과 Cubism SDK를 연결해야 합니다.</span>
          <a className="button drive-button" href={model.driveUrl} target="_blank" rel="noreferrer">Google Drive 폴더 열기 <ExternalLink size={15}/></a>
        </div>
        <div className="stage-corner">FOLDER / {model.folderId || 'LINK'}</div>
      </div>
      <aside className="panel">
        <div className="eyebrow">MODEL SOURCE</div>
        <h2>{model.nickname}</h2>
        <p className="muted">비밀번호를 확인한 모델의 정보입니다.</p>
        <div className="detail-field"><span>모델명</span><strong>{model.nickname}</strong></div>
        <div className="detail-field"><span>Drive 폴더 ID</span><code>{model.folderId || 'URL에서 추출하지 못함'}</code></div>
        <div className="detail-field"><span>폴더 주소</span><a href={model.driveUrl} target="_blank" rel="noreferrer">새 탭에서 열기 <ExternalLink size={13}/></a></div>
        <div className="divider"></div>
        <h3><MousePointer2 size={16}/> 마우스 트래킹</h3>
        <p className="muted">Cubism SDK 연결 후 실제 모델 파라미터에 마우스 위치를 연결할 예정입니다.</p>
      </aside>
    </div>
  </section>;
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
      <Route path="/models/:id" element={authorizedId ? <ViewerPage authorizedId={authorizedId}/> : <Navigate to="/" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </Shell>;
}
