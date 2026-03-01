import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle  className="w-4 h-4 text-green-400  shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-red-400    shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />,
  info:    <Info          className="w-4 h-4 text-blue-400   shrink-0" />,
};

const STYLES = {
  success: 'border-green-500/20  bg-green-500/10  text-green-300',
  error:   'border-red-500/20    bg-red-500/10    text-red-300',
  warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
  info:    'border-blue-500/20   bg-blue-500/10   text-blue-300',
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Portal — fixed bottom-right stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm text-sm font-medium max-w-sm animate-slide-in ${STYLES[t.type] ?? STYLES.info}`}
          >
            {ICONS[t.type] ?? ICONS.info}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const addToast = useContext(ToastContext);
  if (!addToast) throw new Error('useToast must be used inside ToastProvider');

  return {
    success: (msg, opts) => addToast({ message: msg, type: 'success', ...opts }),
    error:   (msg, opts) => addToast({ message: msg, type: 'error',   ...opts }),
    warning: (msg, opts) => addToast({ message: msg, type: 'warning', ...opts }),
    info:    (msg, opts) => addToast({ message: msg, type: 'info',    ...opts }),
  };
}
