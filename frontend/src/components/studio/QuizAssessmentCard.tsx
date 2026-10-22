'use client';
import { useState, useEffect } from 'react';
import { Btn, I, Ic, Pill } from '@/components/ui';
import { api } from '@/lib/api';

export interface QuestionOption {
  id?: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionItem {
  id: string;
  position: number;
  prompt: string;
  explanation?: string | null;
  sourceRef?: string | null;
  aiDrafted?: boolean;
  options: QuestionOption[];
}

interface QuizAssessmentCardProps {
  courseId?: string;
  passMark?: number;
  quizTimeLimitMinutes?: number;
  questions: QuestionItem[];
  questionCount: number;
  isDraft: boolean;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void | Promise<void>;
  onSettingsSaved?: () => void;
}

export default function QuizAssessmentCard({
  courseId,
  passMark: initialPassMark = 80,
  quizTimeLimitMinutes: initialQuizTimeLimitMinutes = 10,
  questions,
  questionCount,
  isDraft,
  onAddQuestion,
  onDeleteQuestion,
  onSettingsSaved,
}: QuizAssessmentCardProps) {
  const [passMark, setPassMark] = useState(initialPassMark);
  const [timeLimit, setTimeLimit] = useState(initialQuizTimeLimitMinutes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialPassMark !== undefined) setPassMark(initialPassMark);
  }, [initialPassMark]);

  useEffect(() => {
    if (initialQuizTimeLimitMinutes !== undefined) setTimeLimit(initialQuizTimeLimitMinutes);
  }, [initialQuizTimeLimitMinutes]);

  const hasChanged =
    passMark !== initialPassMark || timeLimit !== initialQuizTimeLimitMinutes;

  const handleSaveSettings = async () => {
    if (!courseId || saving) return;
    setSaving(true);
    try {
      await api(`/studio/courses/${courseId}`, {
        method: 'PATCH',
        body: { passMark: Number(passMark), quizTimeLimitMinutes: Number(timeLimit) },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSettingsSaved?.();
    } catch (e) {
      console.error('Failed to save quiz settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-card">
      <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 className="m-h3" style={{ margin: 0 }}>Quiz Assessment</h2>
          <div className="m-sub" style={{ fontSize: 14 }}>
            {questionCount || 0} questions configured for this course
          </div>
        </div>
        <Btn sm onClick={onAddQuestion} disabled={!isDraft}>
          <I n="plus" s={15} />&nbsp; Add Question
        </Btn>
      </div>

      {/* Quiz Rules & Timing Configuration */}
      <div
        style={{
          background: 'var(--bg-subtle, #f8f9fa)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic n="clock" s={16} color="var(--navy)" />
            <b style={{ fontSize: 14, color: 'var(--navy)' }}>Quiz Rules & Timing</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pill k="nv">{passMark}% pass mark</Pill>
            <Pill k={timeLimit > 0 ? 'go' : 'sub'}>
              {timeLimit > 0 ? `⏳ ${timeLimit} min timer` : 'Untimed'}
            </Pill>
          </div>
        </div>

        {isDraft ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 14,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span>Pass mark:</span>
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                value={passMark}
                onChange={(e) => setPassMark(Math.max(10, Math.min(100, Number(e.target.value))))}
                style={{
                  width: 64,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
              <span className="m-sub">%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span>Time limit:</span>
              <input
                type="number"
                min="0"
                max="180"
                step="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Math.max(0, Math.min(180, Number(e.target.value))))}
                style={{
                  width: 64,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
              <span className="m-sub">minutes (0 = untimed)</span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saved && (
                <span style={{ fontSize: 12, color: 'var(--success-ink, #059669)', fontWeight: 600 }}>
                  Settings saved ✓
                </span>
              )}
              {hasChanged && (
                <Btn sm kind="sec" onClick={handleSaveSettings} disabled={saving} style={{ height: 28, fontSize: 12 }}>
                  {saving ? 'Saving...' : 'Save rules'}
                </Btn>
              )}
            </div>
          </div>
        ) : (
          <div className="m-sub" style={{ fontSize: 13 }}>
            Learners must score at least {passMark}% to pass and receive a credential.{' '}
            {timeLimit > 0
              ? `The assessment has a strict ${timeLimit}-minute countdown timer with auto-submit.`
              : 'This assessment is untimed.'}
          </div>
        )}
      </div>

      {questions && questions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  width: '100%',
                }}
              >
                <b
                  style={{
                    color: 'var(--navy)',
                    fontSize: 15,
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  Q{idx + 1}. {q.prompt}
                </b>
                {isDraft && (
                  <button
                    type="button"
                    className="m-link"
                    style={{ color: 'var(--required-ink)', fontSize: 14, flexShrink: 0 }}
                    onClick={() => onDeleteQuestion(q.id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              {q.sourceRef && (
                <div className="m-sub" style={{ fontSize: 13, marginTop: 4, overflowWrap: 'anywhere' }}>
                  Source: {q.sourceRef}
                </div>
              )}

              <div
                style={{
                  marginTop: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 8,
                  width: '100%',
                }}
              >
                {q.options?.map((opt) => (
                  <div
                    key={opt.id || opt.label}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      background: opt.isCorrect ? 'var(--success-bg)' : '#fff',
                      color: opt.isCorrect ? 'var(--success-ink)' : 'var(--ink)',
                      border: opt.isCorrect ? '1px solid var(--success-ink)' : '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <b style={{ flexShrink: 0 }}>{opt.label}.</b>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {opt.text}
                    </span>
                    {opt.isCorrect && <Ic n="checkc" s={16} color="var(--success-ink)" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: 8,
            color: 'var(--ink-muted)',
            fontSize: 14,
          }}
        >
          No questions yet. Click <b>&quot;Add Question&quot;</b> to write a question by hand, or use <b>&quot;Draft questions with AI&quot;</b> from uploaded sources.
        </div>
      )}
    </div>
  );
}
