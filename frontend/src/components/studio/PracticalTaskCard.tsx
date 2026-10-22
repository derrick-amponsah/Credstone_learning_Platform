'use client';
import { useState } from 'react';
import { Btn, Ic, Pill } from '@/components/ui';
import { api } from '@/lib/api';

export interface RubricCriterion {
  id?: string;
  position?: number;
  title: string;
  text: string;
}

interface PracticalTaskCardProps {
  courseId: string;
  initialRequiresPractical: boolean;
  initialTaskPrompt: string;
  initialRubricCriteria: RubricCriterion[];
  isDraft: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function PracticalTaskCard({
  courseId,
  initialRequiresPractical,
  initialTaskPrompt,
  initialRubricCriteria,
  isDraft,
  onSaved,
  onError,
  onSuccess,
}: PracticalTaskCardProps) {
  const [requiresPractical, setRequiresPractical] = useState(initialRequiresPractical);
  const [taskPrompt, setTaskPrompt] = useState(initialTaskPrompt || '');
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>(initialRubricCriteria || []);
  const [newCritTitle, setNewCritTitle] = useState('');
  const [newCritText, setNewCritText] = useState('');
  const [saving, setSaving] = useState(false);

  const addCriterion = () => {
    if (!newCritTitle.trim() || !newCritText.trim()) {
      alert('Provide both a title and description for the rubric criterion.');
      return;
    }
    setRubricCriteria([
      ...rubricCriteria,
      {
        position: rubricCriteria.length + 1,
        title: newCritTitle.trim(),
        text: newCritText.trim(),
      },
    ]);
    setNewCritTitle('');
    setNewCritText('');
  };

  const removeCriterion = (idx: number) => {
    const updated = rubricCriteria.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i + 1 }));
    setRubricCriteria(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/studio/courses/${courseId}`, {
        method: 'PATCH',
        body: { requiresPractical, taskPrompt },
      });
      if (requiresPractical && rubricCriteria.length > 0) {
        await api(`/studio/courses/${courseId}/rubric`, {
          body: { criteria: rubricCriteria },
        });
      }
      onSuccess('Practical task and rubric configuration saved.');
      onSaved();
    } catch (err: any) {
      onError(err.message || 'Failed to save practical task configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
          <Ic n="award" s={22} color="var(--navy)" />
          <h2 className="m-h3" style={{ margin: 0, overflowWrap: 'anywhere' }}>Practical Task &amp; Rubric</h2>
        </div>
        <Btn sm onClick={handleSave} disabled={saving || !isDraft} style={{ flexShrink: 0 }}>
          {saving ? 'Saving...' : 'Save Task & Rubric'}
        </Btn>
      </div>

      <div className="m-sub" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>
        Enable a practical assessment requiring learners to submit evidence (documents, links, or recordings) evaluated by human assessors against a structured rubric.
      </div>

      {/* Practical Toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 8,
          background: requiresPractical ? 'var(--highlight)' : 'var(--surface)',
          border: requiresPractical ? '1.5px solid var(--gold)' : '1px solid var(--border)',
          cursor: isDraft ? 'pointer' : 'default',
        }}
      >
        <input
          type="checkbox"
          checked={requiresPractical}
          disabled={!isDraft}
          onChange={(e) => setRequiresPractical(e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
        />
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 15, overflowWrap: 'anywhere' }}>Require Practical Task Submission</b>
          <div className="m-sub" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
            Learners must submit work evaluated against the rubric below before their credential can be issued.
          </div>
        </div>
        <span style={{ flexShrink: 0 }}>
          {requiresPractical ? <Pill k="go">Enabled</Pill> : <Pill>Optional</Pill>}
        </span>
      </label>

      {requiresPractical && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
          {/* Task Prompt Input */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              Learner Task Prompt *
            </label>
            <textarea
              rows={3}
              value={taskPrompt}
              disabled={!isDraft}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="e.g. Conduct a simulated customer intake interview. Submit your completed Customer Due Diligence (CDD) profile PDF and explain the risk categorization reasoning."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Rubric Criteria Builder */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <b style={{ color: 'var(--navy)', fontSize: 15 }}>Evaluation Rubric Criteria</b>
                <div className="m-sub" style={{ fontSize: 13 }}>
                  Assessors grade each submission against these criteria on a scale of Not Yet / Partly / Meets.
                </div>
              </div>
              <span className="m-sub" style={{ fontSize: 13, fontWeight: 600 }}>
                {rubricCriteria.length} {rubricCriteria.length === 1 ? 'criterion' : 'criteria'}
              </span>
            </div>

            {/* Criteria List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rubricCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%' }}>
                    <b style={{ color: 'var(--navy)', fontSize: 14, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                      #{idx + 1}. {crit.title}
                    </b>
                    {isDraft && (
                      <button
                        type="button"
                        className="m-link"
                        style={{ color: 'var(--required-ink)', fontSize: 13, flexShrink: 0 }}
                        onClick={() => removeCriterion(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{crit.text}</div>
                </div>
              ))}

              {rubricCriteria.length === 0 && (
                <div
                  style={{
                    padding: 14,
                    textAlign: 'center',
                    background: 'var(--surface)',
                    borderRadius: 8,
                    color: 'var(--ink-muted)',
                    fontSize: 13,
                  }}
                >
                  No rubric criteria defined yet. Add criteria below to guide assessors.
                </div>
              )}
            </div>

            {/* Add Criterion Form */}
            {isDraft && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <b style={{ color: 'var(--navy)', fontSize: 14 }}>+ Add New Rubric Criterion</b>
                <input
                  type="text"
                  placeholder="Criterion Title (e.g. Identity Verification)"
                  value={newCritTitle}
                  onChange={(e) => setNewCritTitle(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                  }}
                />
                <textarea
                  rows={2}
                  placeholder="Description of standard (e.g. Accurately verifies two valid primary identity documents against the watchlist without discrepancy)"
                  value={newCritText}
                  onChange={(e) => setNewCritText(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                  }}
                />
                <Btn
                  kind="sec sm"
                  type="button"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={addCriterion}
                >
                  Add Criterion to Rubric
                </Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
