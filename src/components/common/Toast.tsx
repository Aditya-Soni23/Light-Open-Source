import React, { useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-18 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#161b22]/95 border border-black/10 dark:border-white/10 shadow-xl text-xs text-slate-900 dark:text-slate-100 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 transition-colors">
      <Info className="w-4 h-4 text-accent shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-1 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
