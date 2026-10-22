'use client';
import { useState } from 'react';
import { api, ago } from '@/lib/api';
import { Btn, Ic, Pill } from '@/components/ui';

export interface CourseComment {
  id?: string;
  body: string;
  createdAt?: string;
  author: string;
  firstName?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface ReviewerCommentsCardProps {
  comments: CourseComment[];
  courseId?: string;
  onCommentChange?: () => void;
}

export default function ReviewerCommentsCard({
  comments,
  courseId,
  onCommentChange,
}: ReviewerCommentsCardProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!comments || comments.length === 0) return null;

  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.length - openCount;

  const handleToggleResolve = async (comment: CourseComment) => {
    if (!comment.id || !courseId) return;
    setTogglingId(comment.id);
    try {
      await api(`/studio/courses/${courseId}/comments/${comment.id}/resolve`, {
        method: 'PATCH',
        body: { resolved: !comment.resolved },
      });
      onCommentChange?.();
    } catch (err: any) {
      console.error('Failed to toggle comment resolution:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !courseId || submitting) return;
    setSubmitting(true);
    try {
      await api(`/studio/courses/${courseId}/comments`, {
        body: { body: newComment.trim() },
      });
      setNewComment('');
      onCommentChange?.();
    } catch (err: any) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="m-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="m-h3" style={{ margin: 0 }}>Reviewer Comments & Feedback</h2>
        <div>
          {openCount > 0 ? (
            <Pill k="warn">{openCount} unresolved</Pill>
          ) : (
            <Pill k="go">All addressed ({resolvedCount}) ✓</Pill>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.map((c, i) => {
          const isResolved = !!c.resolved;
          return (
            <div
              key={c.id || i}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: isResolved ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-subtle, #f8f9fa)',
                border: `1px solid ${isResolved ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <b style={{ color: 'var(--navy)', fontSize: 14 }}>{c.author}</b>
                  {c.createdAt && (
                    <span className="m-sub" style={{ fontSize: 12, marginLeft: 8 }}>
                      {ago(c.createdAt)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isResolved ? (
                    <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ic n="check" s={14} color="#059669" />
                      Resolved
                    </span>
                  ) : (
                    <Pill k="warn">Open</Pill>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  color: isResolved ? 'var(--ink-muted)' : 'inherit',
                  textDecoration: isResolved ? 'line-through' : 'none',
                }}
              >
                {c.body}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                {isResolved && c.resolvedBy ? (
                  <span className="m-sub" style={{ fontSize: 12 }}>
                    Marked resolved by {c.resolvedBy}
                  </span>
                ) : (
                  <span />
                )}

                {courseId && c.id && (
                  <Btn
                    kind={isResolved ? 'ghost' : 'sec'}
                    sm
                    onClick={() => handleToggleResolve(c)}
                    disabled={togglingId === c.id}
                    style={{
                      fontSize: 12,
                      padding: isResolved ? '2px 8px' : '4px 10px',
                      height: 'auto',
                    }}
                  >
                    {togglingId === c.id
                      ? 'Updating...'
                      : isResolved
                      ? 'Reopen issue'
                      : '✓ Mark as resolved'}
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {courseId && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="m-sub" style={{ fontSize: 13, marginBottom: 6 }}>
            Reply or post an update for the reviewer:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="e.g. Updated Lesson 2 with reference citation..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newComment.trim()) handleAddComment();
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 14,
              }}
            />
            <Btn sm onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
              {submitting ? 'Posting...' : 'Post update'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
