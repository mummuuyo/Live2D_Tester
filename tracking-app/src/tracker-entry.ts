import { isSupabaseConfigured, supabaseRequest } from '../../src/lib/supabase';
import { LAppDelegate } from './lappdelegate';

type PublicModelSource = { cloudflare_url: string };

const status = document.querySelector<HTMLElement>('#status');
const nextModel = document.querySelector<HTMLButtonElement>('#next-model');
document.querySelector<HTMLElement>('#toolbar')?.addEventListener('pointerdown', event => event.stopPropagation());

function showStatus(message: string, isError = false): void {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function startTracking(): Promise<void> {
  if (!isSupabaseConfigured) {
    showStatus('모델 목록 연결이 설정되지 않았습니다. 관리자에게 문의해 주세요.', true);
    return;
  }

  try {
    const models = await supabaseRequest<PublicModelSource[]>(
      'rest/v1/live2d_models?select=cloudflare_url&order=created_at.desc'
    );
    const urls = models.map(model => model.cloudflare_url).filter(url => {
      try { return new URL(url).protocol === 'https:'; } catch { return false; }
    });

    if (urls.length === 0) {
      showStatus('표시할 모델이 없습니다. 관리자 화면에서 Cloudflare 모델을 추가해 주세요.', true);
      return;
    }

    window.__LIVE2D_MODEL_URLS__ = urls;
    if (urls.length > 1 && nextModel) {
      nextModel.hidden = false;
      nextModel.addEventListener('click', event => {
        event.stopPropagation();
        window.__LIVE2D_NEXT_MODEL__?.();
      });
    }

    showStatus('모델을 불러오는 중…');
    const app = LAppDelegate.getInstance();
    if (!app.initialize()) throw new Error('Live2D 그래픽 초기화에 실패했습니다.');
    app.run();
    showStatus('포인터를 움직이거나 화면을 터치하세요. 모델이 보이지 않으면 Cloudflare 주소와 CORS 설정을 확인해 주세요.');
  } catch (error) {
    showStatus(error instanceof Error ? error.message : '모델 연결에 실패했습니다.', true);
  }
}

void startTracking();
window.addEventListener('beforeunload', () => LAppDelegate.releaseInstance(), { passive: true });
