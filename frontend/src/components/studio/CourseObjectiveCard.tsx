'use client';
import { useState } from 'react';
import { Btn, Ic, Pill } from '@/components/ui';
import { api } from '@/lib/api';

interface CourseObjectiveCardProps {
  courseId: string;
  initialObjective: string;
  isDraft: boolean;
  onSaved: (newObjective: string) => void;
  onError: (msg: string) => void;
}

export default function CourseObjectiveCard({
  courseId,
  initialObjective,
  isDraft,
  onSaved,
  onError,
}: CourseObjectiveCardProps) {
  const [objective, setObjective] = useState(initialObjective || '');
  const [saving, setSaving] = useState(false);

  const saveObjective = async () => {
    setSaving(true);
    try {
      await api(`/studio/courses/${courseId}`, {
        method: 'PATCH',
        body: { objective },
      });
      onSaved(objective);
    } catch (e: any) {
      onError(e.message || 'Failed to save course objective.');
    } finally {
      setSaving(false);
    }
  };

  const isMeasurable = objective.trim().length > 10;

  return (
    <div
      className="m-card"
      style={{
        marginBottom: 18,
        border: '1px solid var(--border)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0, flex: '1 1 300px' }}>
          <Ic n="target" s={22} color="var(--navy)" />
          <h2 className="m-h3" style={{ margin: 0, overflowWrap: 'anywhere' }}>Course Objective</h2>
          {isMeasurable ? (
            <Pill k="go">Measurable criterion met</Pill>
          ) : (
            <Pill k="warn">Objective required for approval</Pill>
          )}
        </div>
        <Btn sm disabled={saving || !isDraft} onClick={saveObjective} style={{ flexShrink: 0 }}>
          {saving ? 'Saving...' : 'Save Objective'}
        </Btn>
      </div>

      <div className="m-sub" style={{ fontSize: 14 }}>
        Specify the measurable learning goal. The Training Owner verifies that this objective is clear, demonstrable, and assessed before approving.
      </div>

      <textarea
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        disabled={!isDraft}
        rows={2}
        placeholder="e.g. Learners will demonstrate 100% compliance with AML identification requirements and verify high-risk customer profiles according to the risk framework."
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          fontFamily: 'inherit',
          fontSize: 15,
          lineHeight: 1.5,
          background: isDraft ? '#fff' : 'var(--surface)',
          color: 'var(--ink)',
        }}
      />
    </div>
  );
}
