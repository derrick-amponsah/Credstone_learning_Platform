'use client';
import { Btn, Disc, I } from '@/components/ui';

export interface SourceMaterialItem {
  id: string;
  name: string;
  fileKey?: string;
  createdAt?: string;
}

interface MaterialPreviewModalProps {
  material: SourceMaterialItem | null;
  isDraft: boolean;
  deleting: boolean;
  onClose: () => void;
  onRemove: (id: string, name: string) => void;
}

export default function MaterialPreviewModal({
  material,
  isDraft,
  deleting,
  onClose,
  onRemove,
}: MaterialPreviewModalProps) {
  if (!material) return null;

  const ext = material.name.split('.').pop()?.toLowerCase() || '';
  const isPdf = ext === 'pdf';
  const isTxt = ext === 'txt';
  const isVideo = ['mp4', 'webm', 'mov', 'm4v'].includes(ext);
  const mediaUrl = material.fileKey ? `/api/media/${material.fileKey}` : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 28, 54, 0.72)',
        zIndex: 1000,
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
          maxWidth: 920,
          maxHeight: '92vh',
          background: '#fff',
          boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 20,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="m-row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Disc n="file" size={36} sand />
            <div style={{ minWidth: 0 }}>
              <b style={{ color: 'var(--navy)', fontSize: 16, display: 'block', wordBreak: 'break-word' }}>
                {material.name}
              </b>
              <span className="m-sub" style={{ fontSize: 12 }}>
                Inspect uploaded material for accuracy, mistakes, or needed corrections
              </span>
            </div>
          </div>

          <div className="m-row" style={{ gap: 8 }}>
            {mediaUrl && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="m-btn sec sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <I n="external" s={14} /> Open in New Tab
              </a>
            )}
            <button
              type="button"
              className="m-link"
              onClick={onClose}
              style={{ fontSize: 24, lineHeight: 1, padding: '0 6px', color: 'var(--ink-muted)' }}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewer Content */}
        <div
          style={{
            flex: 1,
            minHeight: 380,
            maxHeight: '62vh',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mediaUrl && (isPdf || isTxt) ? (
            <iframe
              src={mediaUrl}
              title={material.name}
              style={{ width: '100%', height: '100%', minHeight: 460, border: 'none' }}
            />
          ) : mediaUrl && isVideo ? (
            <video
              controls
              src={mediaUrl}
              style={{ width: '100%', maxHeight: 460, background: '#000' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 32, maxWidth: 500 }}>
              <Disc n="file" size={54} sand style={{ margin: '0 auto 14px' }} />
              <b style={{ color: 'var(--navy)', fontSize: 17, display: 'block', marginBottom: 6 }}>
                Document Ready for Inspection
              </b>
              <div className="m-sub" style={{ fontSize: 14, marginBottom: 16 }}>
                Presentation slides (.ppt, .pptx) and documents (.doc, .docx) can be opened with your desktop application or browser viewer to verify content, references, and citations.
              </div>
              {mediaUrl && (
                <a
                  href={mediaUrl}
                  download={material.name}
                  className="m-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <I n="download" s={16} /> Open / Download File
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer with removal option */}
        <div
          className="m-row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: 10,
          }}
        >
          <div className="m-sub" style={{ fontSize: 13 }}>
            Uploaded the wrong version or spotted an error? Remove it below and upload the correct file.
          </div>
          <div className="m-row" style={{ gap: 8 }}>
            {isDraft && (
              <button
                type="button"
                disabled={deleting}
                className="m-btn sec sm"
                style={{
                  color: 'var(--required-ink)',
                  borderColor: '#fad2d2',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => onRemove(material.id, material.name)}
              >
                <I n="trash" s={14} c="var(--required-ink)" />
                <span>{deleting ? 'Removing...' : 'Remove This Material'}</span>
              </button>
            )}
            <Btn sm kind="sec" onClick={onClose}>
              Done Reviewing
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
