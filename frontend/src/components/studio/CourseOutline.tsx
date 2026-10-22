'use client';
import { I, Pill } from '@/components/ui';

export interface LessonItem {
  id: string;
  position: number;
  title: string;
  minutes?: number;
  kind?: string;
  status: string;
  videoUrl?: string | null;
  documentUrl?: string | null;
  transcript?: string | null;
  sourceRef?: string | null;
}

interface CourseOutlineProps {
  lessons: LessonItem[];
  isDraft: boolean;
  onAddLesson: () => void;
  onEditLesson: (lesson: LessonItem) => void;
}

export default function CourseOutline({
  lessons,
  isDraft,
  onAddLesson,
  onEditLesson,
}: CourseOutlineProps) {
  const isReady = (l: LessonItem) =>
    !!(l.sourceRef) || (l.kind === 'Document' && !!l.documentUrl) || (l.kind === 'Video' && !!l.videoUrl && !!l.sourceRef);

  const pill = (l: LessonItem) =>
    l.status === 'ready' || isReady(l) ? (
      <Pill k="go">Ready</Pill>
    ) : l.status === 'needs_source' ? (
      <Pill k="warn">Needs source</Pill>
    ) : (
      <Pill>Empty</Pill>
    );

  return (
    <div className="m-card" style={{ paddingBottom: 0, overflow: 'hidden' }}>
      <div className="m-row" style={{ justifyContent: 'space-between', paddingBottom: 10 }}>
        <h2 className="m-h3">Course Outline ({lessons.length} lessons)</h2>
        <button
          className="m-link m-row"
          style={{ fontSize: 15, gap: 4 }}
          disabled={!isDraft}
          onClick={onAddLesson}
        >
          <I n="plus" s={16} /> Add lesson
        </button>
      </div>

      <div style={{ margin: '0 -18px' }}>
        {lessons.map((l) => (
          <div
            key={l.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              width: '100%',
            }}
          >
            <span aria-hidden style={{ color: 'var(--ink-muted)', fontSize: 20, letterSpacing: -2, flexShrink: 0 }}>
              &#8942;&#8942;
            </span>

            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--navy)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  Lesson {l.position}: {l.title}
                </span>
                <span className="m-sub" style={{ fontSize: 13, fontWeight: 400, flexShrink: 0 }}>
                  ({l.minutes || 5} mins)
                </span>
              </div>

              <div className="m-sub" style={{ fontSize: 13, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Kind badge */}
                {l.kind === 'Document' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'rgba(16,185,129,0.1)',
                      color: '#047857',
                      fontWeight: 600,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    📄 Document
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'rgba(99,102,241,0.1)',
                      color: '#4338CA',
                      fontWeight: 600,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    🎥 Video
                  </span>
                )}
                {l.videoUrl && l.kind !== 'Document' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <I n="play" s={13} /> Video attached
                  </span>
                )}
                {l.documentUrl && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <I n="file" s={13} /> Document attached
                  </span>
                )}
                {l.transcript && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <I n="file" s={13} /> Notes
                  </span>
                )}
                {l.sourceRef && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflowWrap: 'anywhere', minWidth: 0 }}>
                    <I n="book" s={13} /> Source: {l.sourceRef}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
              {pill(l)}

              <button
                className="m-link"
                aria-label={`Edit ${l.title}`}
                style={{ color: 'var(--navy)', padding: 4, flexShrink: 0 }}
                onClick={() => onEditLesson(l)}
              >
                <I n="pencil" s={18} />
              </button>
            </div>
          </div>
        ))}

        {lessons.length === 0 && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--ink-muted)',
              borderTop: '1px solid var(--border)',
            }}
          >
            No lessons added yet. Click "Add lesson" to choose a Video or Document lesson format.
          </div>
        )}
      </div>
    </div>
  );
}
