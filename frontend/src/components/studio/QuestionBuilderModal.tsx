'use client';
import { useState } from 'react';
import { Btn } from '@/components/ui';

export interface QuestionBuilderForm {
  prompt: string;
  explanation: string;
  sourceRef: string;
  options: { label: string; text: string; isCorrect: boolean }[];
}

interface QuestionBuilderModalProps {
  initialSourceRef?: string;
  onClose: () => void;
  onSave: (payload: QuestionBuilderForm) => Promise<void>;
  onError: (msg: string) => void;
}

export default function QuestionBuilderModal({
  initialSourceRef,
  onClose,
  onSave,
  onError,
}: QuestionBuilderModalProps) {
  const [form, setForm] = useState<QuestionBuilderForm>({
    prompt: '',
    explanation: '',
    sourceRef: initialSourceRef || '',
    options: [
      { label: 'A', text: '', isCorrect: true },
      { label: 'B', text: '', isCorrect: false },
      { label: 'C', text: '', isCorrect: false },
      { label: 'D', text: '', isCorrect: false },
    ],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prompt.trim()) {
      alert('Question prompt is required.');
      return;
    }
    const filledOptions = form.options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      alert('Please provide at least 2 non-empty options.');
      return;
    }
    const hasCorrect = filledOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      alert('Select which option is correct.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        options: filledOptions,
      });
      onClose();
    } catch (err: any) {
      onError(err.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 28, 54, 0.65)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="m-card"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="m-row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 10,
          }}
        >
          <div className="m-h3" style={{ margin: 0 }}>Add Assessment Question</div>
          <button type="button" className="m-link" onClick={onClose} style={{ fontSize: 22 }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              Question Prompt *
            </label>
            <textarea
              rows={2}
              required
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="e.g. Under the customer due diligence procedure, when must enhanced due diligence be triggered?"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: 15,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
              Answer Choices (Select radio button for the correct answer) *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.options.map((opt, idx) => (
                <div
                  key={opt.label}
                  className="m-row"
                  style={{
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: opt.isCorrect ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                    background: opt.isCorrect ? 'var(--highlight)' : '#fff',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="radio"
                    name="correct_choice"
                    checked={opt.isCorrect}
                    onChange={() => {
                      const updated = form.options.map((o, i) => ({
                        ...o,
                        isCorrect: i === idx,
                      }));
                      setForm({ ...form, options: updated });
                    }}
                    style={{ cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <b style={{ color: 'var(--navy)', minWidth: 24 }}>{opt.label}.</b>
                  <input
                    type="text"
                    required={idx < 2}
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...form.options];
                      updated[idx].text = e.target.value;
                      setForm({ ...form, options: updated });
                    }}
                    placeholder={`Choice ${opt.label} text`}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 14,
                    }}
                  />
                  {opt.isCorrect && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-ink)' }}>
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="m-row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                Explanation (Shown after grading)
              </label>
              <input
                type="text"
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Explain why this choice is correct according to policy"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                Source Reference
              </label>
              <input
                type="text"
                value={form.sourceRef}
                onChange={(e) => setForm({ ...form, sourceRef: e.target.value })}
                placeholder="e.g. AML SOP Section 3.1"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div className="m-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <Btn kind="sec" type="button" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Question'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
