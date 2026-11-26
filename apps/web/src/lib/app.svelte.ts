/** Application state, mirrored to the URL hash (shareable, reload-safe). */
import { parseHash, serializeHash, DEFAULT_STATE, type UrlState } from './url-state';
import { translate, type Lang, type MessageKey } from './i18n';

declare const __APP_VERSION__: string;
declare const __COMMIT__: string;
export const APP_VERSION: string = __APP_VERSION__;
export const COMMIT: string = __COMMIT__;

function browserLang(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

class AppState {
  s = $state<UrlState>({ ...DEFAULT_STATE });

  constructor() {
    if (typeof window === 'undefined') return;
    this.s = parseHash(window.location.hash, browserLang());
    window.addEventListener('hashchange', () => {
      this.s = parseHash(window.location.hash, this.s.lang);
    });
  }

  /** Updates state and the URL (replaceState: no history spam for sliders). */
  set(patch: Partial<UrlState>, push = false): void {
    this.s = { ...this.s, ...patch };
    const hash = serializeHash(this.s, APP_VERSION);
    if (window.location.hash !== hash) {
      if (push) history.pushState(null, '', hash);
      else history.replaceState(null, '', hash);
    }
    document.documentElement.lang = this.s.lang;
  }

  href(patch: Partial<UrlState>): string {
    return serializeHash({ ...this.s, ...patch }, APP_VERSION);
  }

  t = (key: MessageKey, params?: Record<string, string | number>): string => translate(this.s.lang, key, params);
}

export const app = new AppState();
