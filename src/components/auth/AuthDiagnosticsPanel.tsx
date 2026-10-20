import React, { useEffect, useState } from 'react';
import { Clipboard, Copy, X } from 'lucide-react';
import {
  AuthDiagnosticEntry,
  getAuthDiagnostics,
  subscribeToAuthDiagnostics,
} from '../../services/authDiagnostics';

const formatEntry = (entry: AuthDiagnosticEntry) => {
  const details = entry.details
    ? ` ${Object.entries(entry.details).map(([key, value]) => `${key}=${String(value)}`).join(' ')}`
    : '';
  return `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}${details}`;
};

export const AuthDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<AuthDiagnosticEntry[]>(getAuthDiagnostics);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeToAuthDiagnostics(() => setEntries(getAuthDiagnostics())), []);

  const copyLogs = async () => {
    await navigator.clipboard.writeText(entries.map(formatEntry).join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 mx-auto flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
      >
        <Clipboard className="w-3 h-3" />
        Sign-in diagnostics
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl light-surface light-divider border rounded-2xl p-5 shadow-xl text-slate-800 dark:text-slate-100">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-sm font-semibold">Google sign-in diagnostics</h2>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Only redacted Google/Firebase lifecycle entries are retained on this device across a redirect.
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label="Close diagnostics">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-64 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
              {entries.length ? entries.map(formatEntry).join('\n') : 'No Google/Firebase diagnostic entries yet.'}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">Close</button>
              <button type="button" onClick={() => void copyLogs()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
