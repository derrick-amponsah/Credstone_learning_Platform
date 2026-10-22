'use client';
import { useRef, useState } from 'react';
import { Btn, I, Ic } from '@/components/ui';
import { api } from '@/lib/api';

export type LessonKind = 'Video' | 'Document';

export interface LessonModalData {
  id?: string | null;
  title: string;
  minutes: number;
  kind: LessonKind;
  videoUrl?: string | null;
  documentUrl?: string | null;
  transcript?: string | null;
  sourceRef?: string | null;
}

interface LessonModalProps {
  courseId: string;
  data: LessonModalData;
  onClose: () => void;
  onSave: (payload: LessonModalData) => Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 0',
  border: 'none',
  borderBottom: active ? '3px solid var(--brand)' : '3px solid transparent',
  background: active ? 'rgba(99,102,241,0.06)' : 'transparent',
  color: active ? 'var(--navy)' : 'var(--ink-muted)',
  fontWeight: active ? 700 : 500,
  fontSize: 14,
  cursor: 'pointer',
  borderRadius: '8px 8px 0 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'all 0.15s ease',
});

export default function LessonModal({
  courseId,
  data: initialData,
  onClose,
  onSave,
  onDelete,
  onError,
  onSuccess,
}: LessonModalProps) {
  const [form, setForm] = useState<LessonModalData>({
    kind: 'Video',
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const isVideo = form.kind === 'Video';
  const isDoc = form.kind === 'Document';
  const isDocUploaded = !!(form.documentUrl && form.documentUrl.startsWith('/api/media/'));
  const isVideoUploaded = !!(form.videoUrl && form.videoUrl.startsWith('/api/media/'));

  const uploadVideo = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const fd = new FormData();
    fd.append('file', files[0]);
    setUploadingVideo(true);
    try {
      const res = await api<any>(`/studio/courses/${courseId}/upload-video`, { form: fd });
      setForm((prev) => ({ ...prev, videoUrl: res.videoUrl }));
      onSuccess(`Video "${res.filename}" uploaded successfully.`);
    } catch (err: any) {
      onError(err.message || 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const uploadDocument = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const fd = new FormData();
    fd.append('file', files[0]);
    setUploadingDoc(true);
    try {
      const res = await api<any>(`/studio/courses/${courseId}/upload-document`, { form: fd });
      setForm((prev) => ({ ...prev, documentUrl: res.documentUrl }));
      onSuccess(`Document "${res.filename}" uploaded successfully.`);
    } catch (err: any) {
      onError(err.message || 'Document upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      onError('Lesson title is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      onError(err.message || 'Failed to save lesson.');
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
          maxWidth: 660,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#fff',
          boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="m-h3" style={{ margin: 0 }}>
              {form.id ? 'Edit Lesson' : 'Add New Lesson'}
            </div>
            <div className="m-sub" style={{ marginTop: 2, fontSize: 13 }}>
              Choose the lesson format — Video or Document
            </div>
          </div>
          <button type="button" className="m-link" onClick={onClose} style={{ fontSize: 22, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* ── Lesson Type Toggle ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: '#fafbfc',
            padding: '0 24px',
          }}
        >
          <button type="button" style={tabStyle(isVideo)} onClick={() => setForm((p) => ({ ...p, kind: 'Video' }))}>
            <I n="play" s={16} /> Video Lesson
          </button>
          <button type="button" style={tabStyle(isDoc)} onClick={() => setForm((p) => ({ ...p, kind: 'Document' }))}>
            <I n="file" s={16} /> Document / Reading
          </button>
        </div>

        {/* ── Kind callout banner ── */}
        <div
          style={{
            margin: '14px 24px 0',
            padding: '10px 14px',
            borderRadius: 8,
            background: isVideo ? 'rgba(99, 102, 241, 0.07)' : 'rgba(16, 185, 129, 0.07)',
            border: `1px solid ${isVideo ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
            fontSize: 13,
            color: isVideo ? '#4338CA' : '#047857',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{isVideo ? '🎥' : '📄'}</span>
          <span>
            {isVideo
              ? 'Upload a video file or paste a streaming URL. Learners will watch this lesson. Add a transcript for accessibility.'
              : 'Upload a PDF, Word, PowerPoint, or TXT document. Learners will read this material at their own pace.'}
          </span>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 24px 20px' }}
        >
          {/* ── Lesson Title ── */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              Lesson Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isVideo ? 'e.g. Identifying High-Risk Customers' : 'e.g. AML Policy Reference Guide'}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 15,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* ── Duration & Source Ref ── */}
          <div className="m-row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px', minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                {isVideo ? 'Watch Time (mins)' : 'Reading Time (mins)'}
              </label>
              <input
                type="number"
                min={1}
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: '2 1 200px', minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                Source Reference (SOP / Policy)
              </label>
              <input
                type="text"
                value={form.sourceRef || ''}
                onChange={(e) => setForm({ ...form, sourceRef: e.target.value })}
                placeholder="e.g. Compliance SOP Section 2, p. 14"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* ══ VIDEO SECTION ══ */}
          {isVideo && (
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                Video Content
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="m-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={videoInputRef}
                    type="file"
                    hidden
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                    onChange={(e) => uploadVideo(e.target.files)}
                  />
                  <Btn
                    type="button"
                    kind="sec sm"
                    disabled={uploadingVideo}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <I n="upload" s={16} />&nbsp;
                    {uploadingVideo ? 'Uploading…' : 'Upload Video (.mp4, .webm, .mov)'}
                  </Btn>
                  {form.videoUrl && (
                    <span style={{ fontSize: 13, color: 'var(--success-ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ic n="checkc" s={16} color="var(--success-ink)" /> Video attached
                    </span>
                  )}
                </div>

                {form.videoUrl && (
                  <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <video
                      src={form.videoUrl}
                      controls
                      style={{ width: '100%', maxHeight: 200, borderRadius: 6, background: '#000' }}
                    />
                    <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span className="m-sub" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                        {isVideoUploaded ? form.videoUrl.split('/').pop() : form.videoUrl}
                      </span>
                      <button
                        type="button"
                        className="m-link"
                        style={{ color: 'var(--required-ink)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                        onClick={() => setForm({ ...form, videoUrl: null })}
                      >
                        <I n="trash" s={14} c="var(--required-ink)" /> Remove
                      </button>
                    </div>
                  </div>
                )}

                {!isVideoUploaded && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>
                      Or paste an external streaming URL (optional):
                    </label>
                    <input
                      type="text"
                      value={form.videoUrl || ''}
                      onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://example.com/videos/aml_lesson1.mp4"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ DOCUMENT SECTION ══ */}
          {isDoc && (
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                Document Content
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="m-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={docInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                    onChange={(e) => uploadDocument(e.target.files)}
                  />
                  <Btn
                    type="button"
                    kind="sec sm"
                    disabled={uploadingDoc}
                    onClick={() => docInputRef.current?.click()}
                  >
                    <I n="upload" s={16} />&nbsp;
                    {uploadingDoc ? 'Uploading…' : 'Upload Document (.pdf, .docx, .pptx, .txt)'}
                  </Btn>
                  {form.documentUrl && (
                    <span style={{ fontSize: 13, color: 'var(--success-ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ic n="checkc" s={16} color="var(--success-ink)" /> Document attached
                    </span>
                  )}
                </div>

                {form.documentUrl && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'var(--surface)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', wordBreak: 'break-all' }}>
                        {isDocUploaded ? form.documentUrl.split('/').pop() : form.documentUrl}
                      </div>
                      <a
                        href={form.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="m-link"
                        style={{ fontSize: 12 }}
                      >
                        Preview / Open ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      className="m-link"
                      style={{ color: 'var(--required-ink)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                      onClick={() => setForm({ ...form, documentUrl: null })}
                    >
                      <I n="trash" s={14} c="var(--required-ink)" /> Remove
                    </button>
                  </div>
                )}

                {!isDocUploaded && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>
                      Or paste a link to an external document / source material (optional):
                    </label>
                    <input
                      type="text"
                      value={form.documentUrl || ''}
                      onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                      placeholder="https://example.com/docs/aml_policy.pdf"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Transcript / Notes ── */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
              {isVideo ? 'Lesson Transcript & Notes' : 'Summary / Key Points'}
            </label>
            <textarea
              rows={5}
              value={form.transcript || ''}
              onChange={(e) => setForm({ ...form, transcript: e.target.value })}
              placeholder={
                isVideo
                  ? 'Provide the complete lesson script or notes. Learner captions are synchronised from this text.'
                  : 'Optional: Summarise the key points learners should take away from this reading.'
              }
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* ── Approval notice ── */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              fontSize: 13,
              color: '#92400e',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>
              This lesson will be reviewed by the Training Owner before the course can be published.
              {isVideo
                ? ' Attach a video and add the Source Reference to mark it as Ready.'
                : ' Attach a document or add the Source Reference to mark it as Ready.'}
            </span>
          </div>

          {/* ── Footer ── */}
          <div className="m-row" style={{ justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
            {form.id && onDelete ? (
              <button
                type="button"
                className="m-link"
                style={{ color: 'var(--required-ink)', fontSize: 14 }}
                onClick={() => onDelete(form.id!)}
              >
                Delete Lesson
              </button>
            ) : (
              <span />
            )}

            <div className="m-row" style={{ gap: 10 }}>
              <Btn kind="sec" type="button" onClick={onClose}>
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Lesson'}
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
