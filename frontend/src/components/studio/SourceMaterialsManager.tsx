'use client';
import { useRef, useState } from 'react';
import { Btn, I, Ic } from '@/components/ui';
import { ago } from '@/lib/api';
import MaterialPreviewModal, { SourceMaterialItem } from './MaterialPreviewModal';

import ConfirmModal from '@/components/ConfirmModal';

interface SourceMaterialsManagerProps {
  sources: SourceMaterialItem[];
  isDraft: boolean;
  onUpload: (files: FileList | null) => void;
  onDeleteSource: (sourceId: string, sourceName: string) => Promise<void>;
}

export default function SourceMaterialsManager({
  sources,
  isDraft,
  onUpload,
  onDeleteSource,
}: SourceMaterialsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMaterial, setPreviewMaterial] = useState<SourceMaterialItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRequestDelete = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteSource(confirmDelete.id, confirmDelete.name);
      if (previewMaterial?.id === confirmDelete.id) setPreviewMaterial(null);
      setConfirmDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Upload Dropzone */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: '16px 18px',
          border: '2px dashed var(--field-border)',
          borderRadius: 12,
          background: '#fff',
          width: '100%',
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (isDraft && e.dataTransfer.files) onUpload(e.dataTransfer.files);
        }}
      >
        <Ic n="upload" s={34} color="var(--navy)" />
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 18, overflowWrap: 'anywhere' }}>Add source material</b>
          <div className="m-sub" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>
            Decks, SOPs, PDFs, Word documents or text files · {sources.length} {sources.length === 1 ? 'file' : 'files'} attached
          </div>
        </div>
        <Btn disabled={!isDraft} onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0 }}>
          Upload Material
        </Btn>
        <input
          ref={fileInputRef}
          hidden
          multiple
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
          onChange={(e) => onUpload(e.target.files)}
        />
      </div>

      {/* Uploaded Materials & Documents List */}
      <div className="m-card" style={{ paddingBottom: 0, overflow: 'hidden' }}>
        <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 }}>
          <div>
            <h2 className="m-h3" style={{ margin: 0 }}>
              Uploaded Source Materials ({sources.length})
            </h2>
            <div className="m-sub" style={{ fontSize: 13, marginTop: 2 }}>
              Click <b>Open &amp; Review</b> to verify material for errors or mistakes. Remove any wrong uploads.
            </div>
          </div>
        </div>

        <div style={{ margin: '0 -18px' }}>
          {sources && sources.length > 0 ? (
            sources.map((s) => {
              const ext = s.name.split('.').pop()?.toUpperCase() || 'DOC';
              const isPdf = ext === 'PDF';
              const isTxt = ext === 'TXT';
              const badgeBg = isPdf ? '#fee2e2' : isTxt ? '#f1f5f9' : '#e0f2fe';
              const badgeFg = isPdf ? '#b91c1c' : isTxt ? '#475569' : '#0369a1';

              return (
                <div
                  key={s.id}
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
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      background: badgeBg,
                      color: badgeFg,
                      border: '1px solid rgba(0,0,0,0.06)',
                      flexShrink: 0,
                    }}
                  >
                    {ext}
                  </span>

                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--navy)',
                        fontSize: 15,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {s.name}
                    </div>
                    <div className="m-sub" style={{ fontSize: 13, marginTop: 2, overflowWrap: 'anywhere' }}>
                      {s.createdAt ? `Uploaded ${ago(s.createdAt)}` : 'Attached to course'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="m-btn sec sm"
                      onClick={() => setPreviewMaterial(s)}
                      title={`Open and inspect "${s.name}" for mistakes or errors`}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
                    >
                      <I n="eye" s={14} />
                      <span>Open &amp; Review</span>
                    </button>

                    {s.fileKey && (
                      <a
                        href={`/api/media/${s.fileKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="m-btn sec sm"
                        title="Open in new browser tab"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'none',
                          padding: '6px 8px',
                        }}
                      >
                        <I n="external" s={14} />
                      </a>
                    )}

                    {isDraft && (
                      <button
                        type="button"
                        className="m-btn sec sm"
                        style={{
                          color: 'var(--required-ink)',
                          borderColor: '#fad2d2',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 13,
                        }}
                        onClick={() => handleRequestDelete(s.id, s.name)}
                        title={`Remove "${s.name}" from this course`}
                      >
                        <I n="trash" s={14} c="var(--required-ink)" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--ink-muted)',
                fontSize: 14,
                borderTop: '1px solid var(--border)',
              }}
            >
              No source materials uploaded yet. Upload decks, SOPs or PDFs above to use as course reference.
            </div>
          )}
        </div>
      </div>

      {/* Material Inspection & Preview Modal */}
      <MaterialPreviewModal
        material={previewMaterial}
        isDraft={isDraft}
        deleting={isDeleting && confirmDelete?.id === previewMaterial?.id}
        onClose={() => setPreviewMaterial(null)}
        onRemove={handleRequestDelete}
      />

      {/* Confirmation Modal for Material Removal */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Remove source material?"
        message="Are you sure you want to remove this file from the course? Any lesson references citing this material may need to be updated."
        itemTitle={confirmDelete?.name}
        confirmText="Remove material"
        cancelText="Keep file"
        kind="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setConfirmDelete(null);
        }}
      />
    </>
  );
}
