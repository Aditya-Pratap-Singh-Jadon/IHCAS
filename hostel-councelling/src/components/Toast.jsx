import { useState, useEffect } from 'react';

const toastStyles = {
  container: {
    position: 'fixed',
    top: 80,
    right: 24,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    borderRadius: '0.75rem',
    boxShadow: '0 12px 40px rgba(26,35,126,0.12)',
    minWidth: 320,
    maxWidth: 420,
    fontSize: '0.8125rem',
    fontWeight: 500,
    animation: 'slideUp 0.3s ease',
    position: 'relative',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.6,
    fontSize: '1.125rem',
    lineHeight: 1,
    padding: 0,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: '0 0 0.75rem 0.75rem',
    transition: 'width linear',
  },
};

const typeConfig = {
  success: { bg: '#a3f69c', color: '#005312', icon: 'check_circle', barColor: '#005312' },
  error: { bg: '#ffdad6', color: '#93000a', icon: 'error', barColor: '#93000a' },
  warning: { bg: '#fff3cd', color: '#856404', icon: 'warning', barColor: '#856404' },
  info: { bg: '#e0e0ff', color: '#000767', icon: 'info', barColor: '#000767' },
};

let toastId = 0;
let addToastFn = null;

export function showToast(message, type = 'info', duration = 4000) {
  if (addToastFn) {
    addToastFn({ id: ++toastId, message, type, duration });
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastFn = (toast) => setToasts((prev) => [...prev, toast]);
    return () => { addToastFn = null; };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={toastStyles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [width, setWidth] = useState(100);
  const config = typeConfig[toast.type] || typeConfig.info;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setWidth(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [toast, onRemove]);

  return (
    <div
      style={{
        ...toastStyles.toast,
        background: config.bg,
        color: config.color,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
        {config.icon}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        style={{ ...toastStyles.closeBtn, color: config.color }}
        onClick={() => onRemove(toast.id)}
      >
        ×
      </button>
      <div
        style={{
          ...toastStyles.progressBar,
          width: `${width}%`,
          background: config.barColor,
          opacity: 0.3,
        }}
      />
    </div>
  );
}
