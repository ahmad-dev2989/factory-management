import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

interface NotificationContextProps {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (title: string, message: string, onConfirm: () => void, options?: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    options?: ConfirmOptions;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback(
    (title: string, message: string, onConfirm: () => void, options?: ConfirmOptions) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          setConfirmModal(null);
        },
        options
      });
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Unified Toasts Container (Top-Right) */}
      <div className="fixed top-5 right-5 z-[9999] space-y-3 max-w-sm w-full pointer-events-none select-none font-sans">
        {toasts.map((t) => {
          let bgClass = 'bg-white border-[#E5E7EB] text-gray-800';
          let icon = <Info className="w-5 h-5 text-blue-500" />;

          if (t.type === 'success') {
            bgClass = 'bg-green-50 border-green-200 text-green-800';
            icon = <CheckCircle className="w-5 h-5 text-green-600" />;
          } else if (t.type === 'error') {
            bgClass = 'bg-red-50 border-red-200 text-red-800';
            icon = <XCircle className="w-5 h-5 text-red-600" />;
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-200 text-amber-800';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
          }

          return (
            <div
              key={t.id}
              className={`p-4 border rounded-[8px] shadow-lg flex items-start justify-between gap-3 pointer-events-auto transition-all duration-300 transform translate-x-0 animate-fadeIn ${bgClass}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="shrink-0 mt-0.5">{icon}</div>
                <p className="text-xs font-bold leading-normal">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Unified Confirmation Dialog Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9998] p-4 font-sans select-none animate-fadeIn">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full shrink-0 ${
                  confirmModal.options?.type === 'danger'
                    ? 'bg-red-50 text-red-600'
                    : confirmModal.options?.type === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-[#EEF5FF] text-[#2F80ED]'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F6F8FB] text-xs font-bold text-gray-700 rounded-[6px] transition-colors cursor-pointer focus:outline-none"
              >
                {confirmModal.options?.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white text-xs font-bold rounded-[6px] transition-colors cursor-pointer shadow-sm focus:outline-none ${
                  confirmModal.options?.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.options?.type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-[#2F80ED] hover:bg-[#1B6FD1]'
                }`}
              >
                {confirmModal.options?.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
