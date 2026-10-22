'use client';
import { useState, useEffect } from 'react';
import { Btn, Ic, Pill } from '@/components/ui';
import { api } from '@/lib/api';

export interface PrerequisiteOption {
  id: string;
  code?: string;
  title: string;
  level: string;
  category?: string;
}

interface CoursePrerequisiteCardProps {
  courseId: string;
  initialPrerequisiteId: string | null;
  prerequisiteCourse: PrerequisiteOption | null;
  availablePrerequisites: PrerequisiteOption[];
  isDraft: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function CoursePrerequisiteCard({
  courseId,
  initialPrerequisiteId,
  prerequisiteCourse,
  availablePrerequisites,
  isDraft,
  onSaved,
  onError,
  onSuccess,
}: CoursePrerequisiteCardProps) {
  const [selectedId, setSelectedId] = useState<string>(initialPrerequisiteId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedId(initialPrerequisiteId || '');
  }, [initialPrerequisiteId]);

  const hasChanged = (initialPrerequisiteId || '') !== selectedId;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/studio/courses/${courseId}`, {
        method: 'PATCH',
        body: { prerequisiteId: selectedId ? selectedId : null },
      });
      onSuccess(
        selectedId
          ? 'Prerequisite course requirement saved successfully.'
          : 'Prerequisite removed. This course is now open for direct enrollment.'
      );
      onSaved();
    } catch (e: any) {
      onError(e.message || 'Failed to update prerequisite.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = availablePrerequisites.find((c) => c.id === selectedId) || prerequisiteCourse;

  return (
    <div
      className="m-card"
      style={{
        marginBottom: 18,
        border: '1px solid var(--border)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <Ic n="lock" s={22} color="var(--navy)" />
          <h2 className="m-h3" style={{ margin: 0 }}>Course Prerequisites</h2>
          {selectedId ? (
            <Pill k="nv">Prerequisite required</Pill>
          ) : (
            <Pill>Open enrollment</Pill>
          )}
        </div>
        <Btn
          sm
          disabled={saving || !isDraft || !hasChanged}
          onClick={handleSave}
          style={{ flexShrink: 0 }}
        >
          {saving ? 'Saving...' : 'Save Prerequisite'}
        </Btn>
      </div>

      <div className="m-sub" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Require learners to successfully complete a prerequisite course before undertaking or enrolling in this course (e.g. require a beginner course before an advanced course).
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="prerequisite-select" style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
          Required Prerequisite Course:
        </label>
        <select
          id="prerequisite-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={!isDraft || saving}
          style={{
            width: '100%',
            maxWidth: 540,
            height: 42,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: isDraft ? '#fff' : 'var(--surface)',
            color: 'var(--ink)',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <option value="">None (Open enrollment — no prerequisite required)</option>
          {availablePrerequisites.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.level}{p.category ? ` · ${p.category}` : ''})
            </option>
          ))}
        </select>
      </div>

      {selectedId && selectedCourse && (
        <div
          style={{
            background: 'var(--highlight)',
            border: '1px solid #cce1ff',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            color: 'var(--navy)',
          }}
        >
          <Ic n="info" s={18} color="var(--navy)" />
          <div>
            Learners must complete and pass <strong>{selectedCourse.title}</strong> before they can enroll in or undertake this course.
          </div>
        </div>
      )}
    </div>
  );
}
