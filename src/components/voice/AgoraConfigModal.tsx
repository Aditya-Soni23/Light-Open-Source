import React from 'react';
import { KeyRound, ExternalLink, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AGORA_APP_ID } from '../../services/agora';

interface AgoraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgoraConfigModal: React.FC<AgoraConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl relative text-slate-800 dark:text-slate-100 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle dark:bg-accent-subtle text-accent dark:text-accent flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Agora Voice Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Secure Server-Side Token Generation
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 mb-4 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            As required by the security specification, your Agora App Certificate is never exposed in the browser bundle. It is safely read by the server at <code className="font-mono text-amber-900 dark:text-amber-200">/api/agora/token</code>.
          </p>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#12151b] border border-black/5 dark:border-white/5 space-y-1">
            <div className="text-slate-400 uppercase font-mono text-[10px]">Your Agora App ID</div>
            <div className="font-mono text-accent dark:text-accent break-all select-all font-semibold">
              {AGORA_APP_ID}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">
              How to activate Live Voice:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>
                Open the{' '}
                <a
                  href="https://console.agora.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent dark:text-accent underline inline-flex items-center gap-1"
                >
                  Agora Console <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Under <strong>Project Management</strong>, find project with App ID{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {AGORA_APP_ID.slice(0, 8)}...
                </span>
              </li>
              <li>
                Enable <strong>Primary Certificate</strong> and copy the generated certificate string.
              </li>
              <li>
                Add to your backend environment: <code className="font-mono text-accent dark:text-accent">AGORA_APP_CERTIFICATE=your_cert</code>.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end pt-5 mt-4 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
