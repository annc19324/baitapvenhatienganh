import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  subMessage?: string;
  hint?: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  copyAndNotify: (url: string, title?: string, subMessage?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const duration = toast.duration ?? 3500;
      const newToast: ToastItem = { ...toast, id };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const copyAndNotify = useCallback(
    async (url: string, title?: string, subMessage?: string) => {
      try {
        const fullUrl =
          url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullUrl);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = fullUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        showToast({
          type: 'success',
          message: title || 'Đã sao chép liên kết chia sẻ!',
          subMessage: subMessage || fullUrl,
          hint: 'Dán và gửi ngay cho học sinh',
          duration: 3200,
        });

        return true;
      } catch (err) {
        console.error('Lỗi khi sao chép liên kết:', err);
        showToast({
          type: 'error',
          message: 'Không thể tự động sao chép liên kết.',
          subMessage: 'Trình duyệt không cho phép truy cập bộ nhớ tạm.',
          duration: 3200,
        });
        return false;
      }
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, copyAndNotify }}>
      {children}

      {/* Floating Toasts Container — responsive positioning above mobile bottom nav */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-[100] flex flex-col gap-2.5 w-[calc(100%-2rem)] sm:max-w-sm pointer-events-none pt-safe">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-elevated border backdrop-blur-xl animate-slide-up ${
              toast.type === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                : toast.type === 'info'
                ? 'bg-blue-50/95 dark:bg-blue-950/95 border-blue-200 dark:border-blue-800/80 text-blue-950 dark:text-blue-100'
                : 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug">{toast.message}</p>
              {toast.subMessage && (
                <p className="text-xs opacity-80 mt-0.5 line-clamp-2 leading-relaxed break-words">
                  {toast.subMessage}
                </p>
              )}
              {toast.hint && (
                <span className="text-[11px] opacity-70 mt-1 block font-semibold">
                  {toast.hint}
                </span>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Đóng thông báo"
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
