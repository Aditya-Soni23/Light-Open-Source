import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'error';

/**
 * The updater is loaded only in the native shell. Browser development remains
 * independent of GitHub Releases and offline failures never interrupt LIGHT.
 */
export const UpdateManager: React.FC = () => {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!Boolean((window as any).__TAURI_INTERNALS__)) return;
    let cancelled = false;
    void (async () => {
      setState('checking');
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check({ timeout: 8_000 });
        if (cancelled) {
          await update?.close();
          return;
        }
        if (!update) {
          setState('idle');
          return;
        }
        setVersion(update.version);
        setState('available');
        await update.close();
      } catch {
        // Offline, unavailable release endpoint, and incomplete local release
        // configuration are non-blocking. A later app launch will retry.
        if (!cancelled) setState('idle');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const installUpdate = async () => {
    setState('downloading');
    setProgress(0);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check({ timeout: 8_000 });
      if (!update) {
        setState('idle');
        return;
      }
      let total: number | undefined;
      let received = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength;
        if (event.event === 'Progress') {
          received += event.data.chunkLength;
          setProgress(total ? Math.min(100, Math.round((received / total) * 100)) : null);
        }
      }, { timeout: 120_000, restartAfterInstall: true });
    } catch {
      setState('error');
    }
  };

  if (isDismissed || (state !== 'available' && state !== 'downloading' && state !== 'error')) return null;

  return (
    <div className="fixed right-5 bottom-5 z-[70] w-80 rounded-2xl light-surface light-divider border p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
          <RefreshCw className={`h-4 w-4 ${state === 'downloading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {state === 'error' ? 'Update could not be installed' : `LIGHT ${version} is ready`}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {state === 'downloading'
              ? `Downloading the signed update${progress === null ? '…' : ` (${progress}%)`}`
              : state === 'error'
                ? 'Please check your connection and try again later.'
                : 'Download, install, and restart with the latest version.'}
          </p>
        </div>
        {state !== 'downloading' && <button type="button" onClick={() => setIsDismissed(true)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Dismiss update"><X className="h-4 w-4" /></button>}
      </div>
      {state === 'available' && <button type="button" onClick={() => void installUpdate()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-600"><Download className="h-3.5 w-3.5" />Install update</button>}
      {state === 'error' && <button type="button" onClick={() => void installUpdate()} className="mt-3 w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Try again</button>}
    </div>
  );
};
