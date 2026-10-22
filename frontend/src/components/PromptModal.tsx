'use client';
import { useEffect, useRef, useState } from 'react';
import { Btn, I } from '@/components/ui';

export interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onSubmit: (val: string) => void | Promise<void>;
  onCancel: () => void;
}

export default function PromptModal({
  open,
  title,
  description,
  placeholder = 'Enter value...',
  initialValue = '',
  confirmText = 'Continue',
  cancelText = 'Cancel',
  loading = false,
  onSubmit,
  onCancel,
}: PromptModalProps) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setVal(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim() || loading) return;
    onSubmit(val.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
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
          boxShadow: '0 24px 48px -12px rgba(17, 30, 56, 0.35)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 className="m-h3" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
              {title}
            </h3>
            {description && (
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: '6px 0 0' }}>{description}</p>
            )}
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: 0,
                padding: 4,
                cursor: 'pointer',
                color: 'var(--ink-muted)',
              }}
            >
              <I n="xc" s={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="m-in"
            style={{
              height: 44,
              border: '2px solid var(--field-border)',
              borderRadius: 8,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              style={{
                width: '100%',
                border: 0,
                outline: 'none',
                font: 'inherit',
                fontSize: 15,
                background: 'transparent',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            <button type="button" disabled={loading} className="m-btn sec sm" onClick={onCancel}>
              {cancelText}
            </button>
            <Btn type="submit" disabled={!val.trim() || loading} sm>
              {loading ? 'Saving...' : confirmText}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
