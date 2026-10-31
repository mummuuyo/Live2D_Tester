import { LAppDelegate } from './lappdelegate';

const status = document.querySelector<HTMLElement>('#status');
document.querySelector<HTMLElement>('#toolbar')?.addEventListener('pointerdown', event => event.stopPropagation());

function showStatus(message: string, isError = false): void {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function startTracking(): Promise<void> {
  const modelUrl = sessionStorage.getItem('live2d-selected-model-url');
  sessionStorage.removeItem('live2d-selected-model-url');
  try {
    if (!modelUrl || new URL(modelUrl).protocol !== 'https:') {
      window.location.replace('../');
      return;
    }
  } catch {
    window.location.replace('../');
    return;
  }

  try {
    window.__LIVE2D_MODEL_URLS__ = [modelUrl];

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

