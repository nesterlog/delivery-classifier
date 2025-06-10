import React, { useEffect, useState } from 'react';
import { CheckIcon, AlertIcon, InfoIcon, TrashIcon } from './Icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>;
  onRemoveToast: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckIcon size={20} color="#28a745" />;
      case 'error':
        return <AlertIcon size={20} color="#dc3545" />;
      case 'warning':
        return <AlertIcon size={20} color="#ffc107" />;
      case 'info':
      default:
        return <InfoIcon size={20} color="#17a2b8" />;
    }
  };

  return (
    <div className={`toast ${type}`}>
      <div className="toast-content">
        {getIcon()}
        <span>{message}</span>
        <button className="toast-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  );
};

// 토스트 훅
export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>>([]);

  const addToast = (message: string, type: ToastType, duration?: number) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message: string, duration?: number) => addToast(message, 'success', duration);
  const showError = (message: string, duration?: number) => addToast(message, 'error', duration);
  const showInfo = (message: string, duration?: number) => addToast(message, 'info', duration);
  const showWarning = (message: string, duration?: number) => addToast(message, 'warning', duration);

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}; 