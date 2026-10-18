'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, Empty, ErrorBox, Field, I, Ic, Loading, Pill, Select, TextArea } from '@/components/ui';
import { api, fmtDate, initials, useApi } from '@/lib/api';
import { useSession, ROLE_NAMES } from '@/lib/session';

const CATEGORY_LABELS: Record<string, { label: string; pill: string }> = {
  feedback: { label: 'Task Feedback', pill: 'warn' },
  course: { label: 'Course Question', pill: 'info' },
  supervisor: { label: 'Supervisor', pill: 'go' },
  support: { label: 'Support', pill: 'nv' },
  general: { label: 'General', pill: '' },
};

export default function MessagesPage() {
  const { user } = useSession();
  const convos = useApi<any[]>('/messages/conversations');
  const recipients = useApi<any[]>('/messages/recipients');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New message dialog state
  const [newModal, setNewModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newBody, setNewBody] = useState('');
  const [starting, setStarting] = useState(false);
  const [msgNotice, setMsgNotice] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const list = convos.data || [];

  // Auto-select first conversation once list loads
  useEffect(() => {
    if (list.length > 0 && !activeId) {
      setActiveId(list[0].id);
    }
  }, [list, activeId]);

  // Load active conversation messages when selected
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoadingActive(true);
    api(`/messages/conversations/${activeId}`)
      .then((data) => {
        if (!cancelled) {
          setActiveData(data);
          setLoadingActive(false);
          // scroll to bottom
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Filter conversations
  const filteredConvos = useMemo(() => {
    return list.filter((c) => {
      const matchCat = filterCat === 'all' || c.category === filterCat;
      const other = c.participants?.[0];
      const otherName = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : '';
      const subject = (c.subject || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || otherName.includes(term) || subject.includes(term);
      return matchCat && matchSearch;
    });
  }, [list, filterCat, searchTerm]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const newMsg = await api(`/messages/conversations/${activeId}/messages`, {
        body: { body: replyText.trim() },
      });
      setActiveData((prev: any) => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
      setReplyText('');
      await convos.reload();
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (err: any) {
      setMsgNotice({ k: 'warn', t: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleStartConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecipient || !newSubject.trim() || !newBody.trim() || starting) return;
    setStarting(true);
    setMsgNotice(null);
    try {
      const created = await api('/messages/conversations', {
        body: {
          recipientId: newRecipient,
          subject: newSubject.trim(),
          category: newCategory,
          body: newBody.trim(),
        },
      });
      setNewModal(false);
      setNewRecipient('');
      setNewSubject('');
      setNewBody('');
      await convos.reload();
      setActiveId(created.id);
      setMsgNotice({ k: 'ok', t: 'Conversation started.' });
    } catch (err: any) {
      setMsgNotice({ k: 'warn', t: err.message });
    } finally {
      setStarting(false);
    }
  }

  const otherParticipant = activeData?.participants?.find((p: any) => p.id !== user?.id) || activeData?.participants?.[0];
  const otherRole = otherParticipant?.roles?.[0] ? ROLE_NAMES[otherParticipant.roles[0]] || otherParticipant.roles[0] : 'Colleague';

  return (
    <Shell>
      <Head eye="Communication" title="Messages & Feedback" sub="Direct feedback on submissions, mentor discussions, and instructor inquiries.">
        <Btn sm onClick={() => setNewModal(true)}>
          <I n="plus" s={16} />&nbsp; New message
        </Btn>
      </Head>

      {msgNotice && <Alert k={msgNotice.k}>{msgNotice.t}</Alert>}

      <div className="m-row" style={{ gap: 16, alignItems: 'stretch', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
        {/* Left Pane: Conversations List */}
        <div
          className="m-card"
          style={{
            flex: '1 1 320px',
            maxWidth: 380,
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '14px 14px 8px',
          }}
        >
          {/* Search bar */}
          <div className="m-in" style={{ height: 40, fontSize: 14 }}>
            <I n="search" s={16} />
            <input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search conversations"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="m-row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['feedback', 'Feedback'], ['course', 'Courses'], ['supervisor', 'Supervisor']].map(([k, label]) => (
              <button
                key={k}
                aria-pressed={filterCat === k}
                onClick={() => setFilterCat(k)}
                className={`m-btn sm ${filterCat === k ? '' : 'sec'}`}
                style={{ padding: '0 10px', fontSize: 13, minHeight: 30 }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* List of Conversations */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 360 }}>
            {convos.loading ? (
              <Loading text="Loading conversations..." />
            ) : filteredConvos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--ink-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy)' }}>No conversations found</div>
                <div className="m-sub" style={{ fontSize: 13, marginTop: 4 }}>
                  {searchTerm ? 'Try a different search keyword.' : 'Click "New message" to start a conversation.'}
                </div>
              </div>
            ) : (
              filteredConvos.map((c) => {
                const isSelected = c.id === activeId;
                const other = c.participants?.[0];
                const displayName = other ? `${other.firstName} ${other.lastName}` : 'Colleague';
                const roleKey = other?.roles?.[0];
                const roleTitle = roleKey ? ROLE_NAMES[roleKey] || roleKey : 'Colleague';
                const catInfo = CATEGORY_LABELS[c.category] || CATEGORY_LABELS.general;
                const timeAgo = c.lastMessage?.createdAt ? fmtDate(c.lastMessage.createdAt, { day: 'numeric', month: 'short' }) : '';

                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveId(c.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveId(c.id); }}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--navy)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--highlight)' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <span
                      className="m-av"
                      style={{
                        width: 38,
                        height: 38,
                        fontSize: 14,
                        flexShrink: 0,
                        background: isSelected ? 'var(--navy)' : 'var(--sand)',
                        color: isSelected ? 'var(--gold-soft)' : 'var(--navy)',
                      }}
                    >
                      {initials(displayName)}
                    </span>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-muted)', flexShrink: 0 }}>
                          {timeAgo}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.subject}
                      </div>

                      <div className="m-sub" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.lastMessage?.body || 'No messages yet'}
                      </div>

                      <div className="m-row" style={{ gap: 6, marginTop: 4 }}>
                        {catInfo.label && <span className={`m-pill ${catInfo.pill}`} style={{ fontSize: 11, padding: '2px 6px' }}>{catInfo.label}</span>}
                        {c.unreadCount > 0 && <span className="m-pill warn" style={{ fontSize: 11, padding: '2px 6px' }}>{c.unreadCount} unread</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div
          className="m-card"
          style={{
            flex: '2 1 480px',
            minWidth: 300,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {loadingActive ? (
            <div style={{ padding: 40 }}><Loading text="Loading conversation..." /></div>
          ) : !activeData ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Empty
                icon="mail"
                title="Select a conversation"
                text="Choose an existing conversation on the left or click 'New message' to reach an instructor, assessor, or mentor."
              />
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-raised)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div className="m-row" style={{ gap: 12 }}>
                  <span className="m-av" style={{ width: 44, height: 44, background: 'var(--navy)', color: 'var(--gold-soft)' }}>
                    {initials(otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'User')}
                  </span>
                  <div>
                    <div className="m-row" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}>
                        {otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Colleague'}
                      </span>
                      <Pill k="nv">{otherRole}</Pill>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
                      Subject: <b>{activeData.subject}</b>
                    </div>
                  </div>
                </div>

                {activeData.courseTitle && (
                  <span className="m-pill info" style={{ fontSize: 12 }}>
                    Course: {activeData.courseTitle}
                  </span>
                )}
              </div>

              {/* Messages Timeline */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  padding: '18px 20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  minHeight: 340,
                  maxHeight: 'calc(100vh - 360px)',
                  background: 'var(--surface)',
                }}
              >
                {activeData.messages?.map((m: any) => {
                  const isMe = m.senderId === user?.id;
                  const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                  const date = m.createdAt ? fmtDate(m.createdAt, { day: 'numeric', month: 'short' }) : '';

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div className="m-row" style={{ gap: 6, marginBottom: 4, fontSize: 12, color: 'var(--ink-muted)' }}>
                        {!isMe && <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.senderFirstName || m.senderName}</span>}
                        <span>{date} at {time}</span>
                      </div>

                      <div
                        style={{
                          background: isMe ? 'var(--navy)' : '#fff',
                          color: isMe ? '#fff' : 'var(--ink)',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '12px 16px',
                          fontSize: 15,
                          lineHeight: 1.45,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border)',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div className="m-in" style={{ height: 'auto', padding: '10px 14px', alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${otherParticipant?.firstName || 'colleague'}... (Press Enter to send)`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      minWidth: 0,
                      font: 'inherit',
                      background: 'transparent',
                      resize: 'none',
                      fontSize: 15,
                    }}
                  />
                  <Btn
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    sm
                    style={{ alignSelf: 'flex-end', minHeight: 36, padding: '0 16px' }}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </Btn>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'right' }}>
                  Press <b>Enter</b> to send, <b>Shift + Enter</b> for new line
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {newModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 28, 54, 0.6)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setNewModal(false)}
        >
          <div
            className="m-card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div className="m-h3">Start a new conversation</div>
              <button type="button" className="m-link" onClick={() => setNewModal(false)} style={{ fontSize: 20 }}>✕</button>
            </div>

            <form onSubmit={handleStartConversation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Select
                label="Recipient"
                value={newRecipient}
                onChange={(e: any) => setNewRecipient(e.target.value)}
                required
              >
                <option value="">Select a colleague, instructor, or mentor...</option>
                {recipients.data?.map((r) => {
                  const roleName = r.roles?.[0] ? ROLE_NAMES[r.roles[0]] || r.roles[0] : 'Member';
                  return (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName} ({roleName}{r.team ? ` · ${r.team}` : ''})
                    </option>
                  );
                })}
              </Select>

              <Field
                label="Subject"
                placeholder="e.g. Question on Effective Communication task"
                value={newSubject}
                onChange={(e: any) => setNewSubject(e.target.value)}
                required
              />

              <Select
                label="Topic category"
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
              >
                <option value="feedback">Task Feedback & Submissions</option>
                <option value="course">Course Question</option>
                <option value="supervisor">Supervisor 1:1 Check-in</option>
                <option value="support">Platform Support</option>
                <option value="general">General</option>
              </Select>

              <TextArea
                label="Message"
                placeholder="Write your message here..."
                value={newBody}
                onChange={(e: any) => setNewBody(e.target.value)}
                required
              />

              <div className="m-row" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <Btn kind="sec" onClick={() => setNewModal(false)}>Cancel</Btn>
                <Btn type="submit" disabled={starting || !newRecipient || !newSubject.trim() || !newBody.trim()}>
                  {starting ? 'Sending...' : 'Send message'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
