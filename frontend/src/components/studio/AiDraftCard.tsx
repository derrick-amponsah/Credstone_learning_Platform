'use client';
import { Btn, I } from '@/components/ui';

export interface AiSuggestion {
  id: string;
  prompt: string;
  sourceRef?: string | null;
}

interface AiDraftCardProps {
  suggestions: AiSuggestion[];
  isDraft: boolean;
  onDraftWithAi: () => void;
  onEditSuggestion: (suggestion: AiSuggestion) => void;
  onAcceptDraft: () => void;
}

export default function AiDraftCard({
  suggestions,
  isDraft,
  onDraftWithAi,
  onEditSuggestion,
  onAcceptDraft,
}: AiDraftCardProps) {
  return (
    <div className="m-card">
      <div className="m-row" style={{ justifyContent: 'space-between' }}>
        <h2 className="m-h3">AI-assisted draft</h2>
        <span className="m-ai">
          <I n="spark" s={16} /> AI draft
        </span>
      </div>

      <div className="m-sub" style={{ margin: '8px 0 12px' }}>
        Suggested questions drawn from approved source material. Check each against the source before approving.
      </div>

      {!suggestions.length && (
        <div className="m-sub" style={{ marginBottom: 12 }}>
          No suggestions waiting.
        </div>
      )}

      {suggestions.map((x) => (
        <div
          key={x.id}
          style={{
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            marginBottom: 8,
            background: 'var(--surface)',
          }}
        >
          <b style={{ color: 'var(--navy)', overflowWrap: 'anywhere', wordBreak: 'break-word', display: 'block' }}>
            {x.prompt}
          </b>
          {x.sourceRef && (
            <div className="m-sub" style={{ fontSize: 14, marginTop: 2, overflowWrap: 'anywhere' }}>
              <I n="file" s={14} /> Source: {x.sourceRef}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        {suggestions.length > 0 ? (
          <>
            <Btn
              kind="sec"
              style={{ flex: 1 }}
              disabled={!isDraft}
              onClick={() => onEditSuggestion(suggestions[0])}
            >
              Edit
            </Btn>
            <Btn
              style={{ flex: 1 }}
              disabled={!isDraft}
              onClick={onAcceptDraft}
            >
              Accept draft
            </Btn>
          </>
        ) : (
          <Btn
            kind="sec"
            style={{ flex: 1 }}
            disabled={!isDraft}
            onClick={onDraftWithAi}
          >
            <I n="spark" s={18} />&nbsp; Draft questions with AI
          </Btn>
        )}
      </div>
    </div>
  );
}
