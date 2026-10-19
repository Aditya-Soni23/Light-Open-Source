/**
 * Desktop Integration Abstraction for LIGHT by DIAMOND
 *
 * Prepared for packaging with Tauri 2 on Windows / macOS / Linux.
 * In a standard browser, provides graceful fallbacks and window simulation.
 * In a native Tauri environment, this uses the official Tauri window API.
 */

export interface DesktopEnvironmentInfo {
  isTauri: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'browser';
  hasAlwaysOnTopSupport: boolean;
  hasGlobalHotkeysSupport: boolean;
  hasNativeTraySupport: boolean;
}

export type DesktopOverlayMode = 'companion' | 'xtreme-small';

export const detectDesktopEnvironment = (): DesktopEnvironmentInfo => {
  const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

  let platform: 'windows' | 'macos' | 'linux' | 'browser' = 'browser';
  if (userAgent.includes('win')) platform = 'windows';
  else if (userAgent.includes('mac')) platform = 'macos';
  else if (userAgent.includes('linux')) platform = 'linux';

  return {
    isTauri,
    platform: isTauri ? platform : 'browser',
    hasAlwaysOnTopSupport: isTauri,
    hasGlobalHotkeysSupport: isTauri,
    hasNativeTraySupport: isTauri,
  };
};

export class DesktopBridge {
  private static instance: DesktopBridge;
  private env: DesktopEnvironmentInfo;

  private constructor() {
    this.env = detectDesktopEnvironment();
  }

  public static getInstance(): DesktopBridge {
    if (!DesktopBridge.instance) {
      DesktopBridge.instance = new DesktopBridge();
    }
    return DesktopBridge.instance;
  }

  public getEnvironment(): DesktopEnvironmentInfo {
    return this.env;
  }

  /**
   * Set window Always-on-Top state.
   * In Tauri 2: uses window.__TAURI__?.window?.getCurrentWindow().setAlwaysOnTop(enabled).
   * In Browser: toggles UI overlay simulation with fixed z-index pinned to viewport.
   */
  public async setAlwaysOnTop(enabled: boolean): Promise<boolean> {
    if (this.env.isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setAlwaysOnTop(enabled);
        return true;
      } catch (e) {
        console.warn('[DesktopBridge] Tauri setAlwaysOnTop failed, fallback to simulated mode:', e);
      }
    }
    return enabled;
  }

  /**
   * Minimize the desktop window.
   */
  public async minimizeWindow(): Promise<void> {
    if (this.env.isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
        return;
      } catch (e) {
        console.warn('[DesktopBridge] Tauri minimizeWindow error:', e);
      }
    }
    console.info('[DesktopBridge] Browser simulated minimize (handled in UI state)');
  }

  /**
   * Toggle window maximize / restore.
   */
  public async toggleMaximize(): Promise<void> {
    if (this.env.isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
        return;
      } catch (e) {
        console.warn('[DesktopBridge] Tauri toggleMaximize error:', e);
      }
    }
  }

  /**
   * Close window or hide to tray.
   */
  public async closeWindow(): Promise<void> {
    if (this.env.isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
        return;
      } catch (e) {
        console.warn('[DesktopBridge] Tauri closeWindow error:', e);
      }
    }
  }

  /** Open a genuine, independently movable OS overlay window. */
  public async openOverlay(mode: DesktopOverlayMode): Promise<boolean> {
    if (!this.env.isTauri) return false;

    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const label = mode === 'companion' ? 'companion' : 'xtreme-small';
      const existing = await WebviewWindow.getByLabel(label);
      if (existing) {
        await existing.show();
        await existing.setFocus();
        return true;
      }

      const compact = mode === 'xtreme-small';
      const overlay = new WebviewWindow(label, {
        url: `/#/${mode}`,
        title: compact ? 'LIGHT Xtreme Small' : 'LIGHT Companion',
        width: compact ? 88 : 310,
        height: compact ? 88 : 430,
        minWidth: compact ? 56 : 250,
        minHeight: compact ? 56 : 260,
        resizable: !compact,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        center: false,
      });
      await new Promise<void>((resolve, reject) => {
        overlay.once('tauri://created', () => resolve());
        overlay.once('tauri://error', (event) => reject(new Error(String(event.payload))));
      });
      return true;
    } catch (error) {
      console.error('[DesktopBridge] Could not create overlay window:', error);
      return false;
    }
  }

  public async closeOverlay(mode: DesktopOverlayMode): Promise<void> {
    if (!this.env.isTauri) return;
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const window = await WebviewWindow.getByLabel(mode === 'companion' ? 'companion' : 'xtreme-small');
    await window?.hide();
  }

  public async showMainWindow(): Promise<void> {
    if (!this.env.isTauri) return;
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const window = await WebviewWindow.getByLabel('main');
    await window?.show();
    await window?.unminimize();
    await window?.setFocus();
  }
}

export const desktop = DesktopBridge.getInstance();
