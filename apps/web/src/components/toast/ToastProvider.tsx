import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { Toast, type ToastItem, type ToastTone } from './Toast';

interface ToastContextValue {
  pushToast: (input: { title: string; body?: string; tone?: ToastTone; durationMs?: number }) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback<ToastContextValue['pushToast']>(
    ({ title, body, tone = 'info', durationMs = 6000 }) => {
      const id = `t_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
      setToasts((prev) => [...prev, { id, title, body, tone }]);
      if (durationMs > 0) {
        const timer = setTimeout(() => dismissToast(id), durationMs);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-3 right-3 z-50 flex flex-col gap-2 pointer-events-auto"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} item={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
