'use client';
import { useEffect, useRef } from 'react';
import { I } from '@/components/ui';

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  itemTitle?: string;
  confirmText?: string;
  cancelText?: string;
  kind?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Please Confirm',
  message,
  itemTitle,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  kind = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Auto-focus cancel button for safe keyboard accessibility
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isDanger = kind === 'danger';
  const isWarning = kind === 'warning';

  const iconBg = isDanger ? '#fee2e2' : isWarning ? 'var(--warning-bg)' : 'var(--sand)';
  const iconColor = isDanger ? '#991b1b' : isWarning ? 'var(--warning-ink)' : 'var(--navy)';
  const confirmBtnBg = isDanger ? '#dc2626' : isWarning ? 'var(--navy)' : 'var(--gold)';
  const confirmBtnFg = isDanger ? '#ffffff' : isWarning ? 'var(--gold-soft)' : 'var(--on-gold)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 28, 54, 0.68)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="m-card"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px -12px rgba(17, 30, 56, 0.35), 0 0 0 1px rgba(17, 30, 56, 0.05)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Close Button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <I n={isDanger ? 'trash' : isWarning ? 'warn' : 'info'} s={24} c={iconColor} />
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <h3
              id="confirm-modal-title"
              className="m-h3"
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: 'var(--navy)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>
            <p
              id="confirm-modal-desc"
              style={{
                fontSize: 14,
                color: 'var(--ink-muted)',
                margin: '6px 0 0',
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>

          {!loading && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              style={{
                background: 'transparent',
                border: 0,
                padding: 4,
                cursor: 'pointer',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
              }}
            >
              <I n="xc" s={20} />
            </button>
          )}
        </div>

        {/* Item Title Callout Box (if provided) */}
        {itemTitle && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--surface)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <I n="file" s={18} c="var(--navy)" />
            <span
              style={{
                fontWeight: 600,
                color: 'var(--navy)',
                fontSize: 14,
                wordBreak: 'break-all',
              }}
            >
              {itemTitle}
            </span>
          </div>
        )}

        {/* Subtext info */}
        {isDanger && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--required-ink)',
              fontWeight: 500,
            }}
          >
            <I n="info" s={15} c="var(--required-ink)" />
            <span>This action is permanent and cannot be undone.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 4,
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={loading}
            className="m-btn sec sm"
            onClick={onCancel}
            style={{ minWidth: 84 }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              minHeight: 40,
              padding: '0 18px',
              borderRadius: 8,
              background: confirmBtnBg,
              color: confirmBtnFg,
              font: '700 15px var(--font-sans)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'background 0.15s ease',
              gap: 6,
            }}
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                {isDanger && <I n="trash" s={15} c={confirmBtnFg} />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
