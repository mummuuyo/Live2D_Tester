export {};

declare global {
  interface Window {
    __LIVE2D_MODEL_URLS__?: string[];
    __LIVE2D_NEXT_MODEL__?: () => void;
  }
}
