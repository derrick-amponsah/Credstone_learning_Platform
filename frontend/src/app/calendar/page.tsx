'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, ErrorBox, Field, I, Ic, Loading, Pill, Select } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

const EVENT_TYPES: Record<string, { label: string; pill: string; icon: string; color: string; bg: string }> = {
  deadline: { label: 'Course Deadline', pill: 'warn', icon: 'clock', color: '#8a4b08', bg: 'var(--warning-bg)' },
  session: { label: 'Live Session', pill: 'go', icon: 'play', color: '#165c38', bg: 'var(--success-bg)' },
  observation: { label: 'Observation', pill: 'info', icon: 'users', color: '#1e3a6d', bg: 'var(--info-bg)' },
  study: { label: 'Study Block', pill: 'nv', icon: 'book', color: 'var(--gold-soft)', bg: 'var(--navy)' },
  credential: { label: 'Credential Expiry', pill: 'req', icon: 'award', color: '#9e2a2b', bg: 'var(--required-bg)' },
};

export default function CalendarPage() {
  const events = useApi<any[]>('/calendar/events');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<any>(null);

  // Form state for adding an event
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('study');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('10:00');
  const [newDesc, setNewDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar month calculation
  const { days, monthName } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // European style: Mon (0) to Sun (6)
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const daysList: { date: Date; isCurrentMonth: boolean }[] = [];

    // Preceding month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      daysList.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      daysList.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Trailing padding to make multiple of 7 (up to 35 or 42 cells)
    const remaining = (7 - (daysList.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      daysList.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    const monthStr = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return { days: daysList, monthName: monthStr };
  }, [year, month]);

  const allEvents = events.data || [];

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return allEvents;
    return allEvents.filter((e) => e.eventType === filterType);
  }, [allEvents, filterType]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of filteredEvents) {
      if (!ev.startsAt) continue;
      const key = new Date(ev.startsAt).toISOString().slice(0, 10);
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const selectedKey = selectedDate.toISOString().slice(0, 10);
  const selectedDayEvents = eventsByDate.get(selectedKey) || [];
  const todayKey = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const startsAt = new Date(`${newDate}T${newTime}:00`).toISOString();
      await api('/calendar/events', {
        body: {
          title: newTitle,
          description: newDesc,
          eventType: newType,
          startsAt,
        },
      });
      setModal(false);
      setNewTitle('');
      setNewDesc('');
      await events.reload();
      setMsg({ k: 'ok', t: 'Calendar event added.' });
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await api(`/calendar/events/${id}`, { method: 'DELETE' });
      await events.reload();
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message });
    }
  }

  return (
    <Shell>
      <Head eye="Schedule & Planning" title="Learning Calendar" sub="Deadlines, live sessions, observational coaching, and study plans.">
        <Btn kind="sec sm" onClick={goToday}>Today</Btn>
        <Btn sm onClick={() => setModal(true)}><I n="plus" s={16} />&nbsp; Add reminder</Btn>
      </Head>

      {msg && <Alert k={msg.k}>{msg.t}</Alert>}

      {/* Filter and Month Navigation Bar */}
      <div className="m-row" style={{ justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div className="m-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {[['all', 'All Events'], ['deadline', 'Deadlines'], ['session', 'Sessions'], ['observation', 'Observations'], ['study', 'Study Blocks'], ['credential', 'Credentials']].map(([k, label]) => (
            <button
              key={k}
              aria-pressed={filterType === k}
              onClick={() => setFilterType(k)}
              className={`m-btn sm ${filterType === k ? '' : 'sec'}`}
              style={{ padding: '0 12px', fontSize: 14, minHeight: 36 }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="m-row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="m-btn sec sm" onClick={prevMonth} aria-label="Previous month" style={{ padding: '0 10px', minHeight: 36 }}>
            <I n="back" s={18} />
          </button>
          <span style={{ font: '700 18px var(--font-serif)', color: 'var(--navy)', minWidth: 150, textAlign: 'center' }}>
            {monthName}
          </span>
          <button className="m-btn sec sm" onClick={nextMonth} aria-label="Next month" style={{ padding: '0 10px', minHeight: 36 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}><I n="back" s={18} /></span>
          </button>
        </div>
      </div>

      {events.loading ? (
        <Loading text="Loading your calendar..." />
      ) : events.error ? (
        <ErrorBox error={events.error} />
      ) : (
        <div className="m-row" style={{ gap: 20, alignItems: 'stretch', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
          {/* Main Month Grid (Left Column) */}
          <div className="m-card" style={{ flex: '2 1 540px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column' }}>
            {/* Days of week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(92px, 1fr)', gap: 6, flex: 1, overflow: 'hidden', minWidth: 0 }}>
              {days.map(({ date, isCurrentMonth }, idx) => {
                const dayKey = date.toISOString().slice(0, 10);
                const dayEvents = eventsByDate.get(dayKey) || [];
                const isSelected = dayKey === selectedKey;
                const isToday = dayKey === todayKey;

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(date)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDate(date); }}
                    style={{
                      border: isSelected ? '2px solid var(--navy)' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 6,
                      background: isSelected ? 'var(--highlight)' : isCurrentMonth ? '#fff' : 'var(--surface-raised)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 88,
                      minWidth: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      opacity: isCurrentMonth ? 1 : 0.45,
                      boxShadow: isSelected ? '0 2px 8px rgba(16,28,54,0.08)' : 'none',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  >
                    <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          fontWeight: isToday ? 800 : 600,
                          fontSize: 14,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isToday ? 24 : 'auto',
                          height: isToday ? 24 : 'auto',
                          borderRadius: '50%',
                          background: isToday ? 'var(--gold)' : 'transparent',
                          color: isToday ? 'var(--on-gold)' : isCurrentMonth ? 'var(--navy)' : 'var(--ink-muted)',
                        }}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-ink)' }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event indicators */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 0, maxWidth: '100%', flex: 1 }}>
                      {dayEvents.slice(0, 2).map((ev) => {
                        const meta = EVENT_TYPES[ev.eventType] || EVENT_TYPES.study;
                        return (
                          <div
                            key={ev.id}
                            title={ev.title}
                            style={{
                              background: meta.bg,
                              color: meta.color,
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4,
                              padding: '2px 5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2,
                              minWidth: 0,
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span style={{ fontSize: 10, color: 'var(--ink-muted)', paddingLeft: 2 }}>
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Inspector & Agenda (Right Column) */}
          <div style={{ flex: '1 1 320px', minWidth: 290, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div>
                  <div className="m-eye" style={{ fontSize: 12 }}>Selected Date</div>
                  <div className="m-h3" style={{ fontSize: 18, marginTop: 2 }}>
                    {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                {selectedKey === todayKey && <Pill k="go">Today</Pill>}
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-muted)' }}>
                  <div style={{ margin: '0 auto 10px', opacity: 0.4, width: 'fit-content' }}><Ic n="calendar" s={48} /></div>
                  <div style={{ fontWeight: 600, color: 'var(--navy)' }}>No events scheduled</div>
                  <div className="m-sub" style={{ fontSize: 14, marginTop: 4 }}>You have open availability on this date.</div>
                  <button
                    className="m-btn sec sm"
                    onClick={() => {
                      setNewDate(selectedKey);
                      setModal(true);
                    }}
                    style={{ marginTop: 14 }}
                  >
                    <I n="plus" s={16} />&nbsp; Add study block
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedDayEvents.map((ev) => {
                    const meta = EVENT_TYPES[ev.eventType] || EVENT_TYPES.study;
                    const timeStr = ev.startsAt ? new Date(ev.startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: 12,
                          background: 'var(--surface-raised)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`m-pill ${meta.pill}`}>{meta.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{timeStr}</span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>{ev.title}</div>
                        {ev.description && <div className="m-sub" style={{ fontSize: 13 }}>{ev.description}</div>}
                        <div className="m-row" style={{ gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                          {ev.link && (
                            <Link href={ev.link} className="m-btn sm" style={{ minHeight: 32, fontSize: 13, padding: '0 12px' }}>
                              Open
                            </Link>
                          )}
                          {ev.isCustom && (
                            <button
                              type="button"
                              className="m-btn sec sm"
                              onClick={() => handleDeleteEvent(ev.id)}
                              style={{ minHeight: 32, fontSize: 13, padding: '0 10px', color: 'var(--required-ink)', borderColor: 'var(--required-ink)' }}
                              title="Delete reminder"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming items overview */}
            <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                <Ic n="trend" s={18} color="var(--navy)" />
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}>Upcoming across the platform</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allEvents.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="m-row"
                    onClick={() => {
                      if (ev.startsAt) {
                        const d = new Date(ev.startsAt);
                        setCurrentDate(d);
                        setSelectedDate(d);
                      }
                    }}
                    style={{
                      gap: 10,
                      padding: '8px 6px',
                      borderTop: '1px solid var(--border)',
                      cursor: 'pointer',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-ink)', minWidth: 60 }}>
                      {ev.startsAt ? fmtDate(ev.startsAt, { day: 'numeric', month: 'short' }) : ''}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.title}
                      </div>
                      <div className="m-sub" style={{ fontSize: 12 }}>
                        {EVENT_TYPES[ev.eventType]?.label || 'Event'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Calendar Event Modal */}
      {modal && (
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
          onClick={() => setModal(false)}
        >
          <div
            className="m-card"
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#fff',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div className="m-h3">Add learning reminder</div>
              <button type="button" className="m-link" onClick={() => setModal(false)} style={{ fontSize: 20 }}>✕</button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field
                label="Event title"
                placeholder="e.g. Focus Study: Lesson 3 Review"
                value={newTitle}
                onChange={(e: any) => setNewTitle(e.target.value)}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <Field
                    label="Date"
                    type="date"
                    value={newDate}
                    onChange={(e: any) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Field
                    label="Time"
                    type="time"
                    value={newTime}
                    onChange={(e: any) => setNewTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Select
                label="Category"
                value={newType}
                onChange={(e: any) => setNewType(e.target.value)}
              >
                <option value="study">Study Block</option>
                <option value="session">Live Practice Session</option>
                <option value="deadline">Self-imposed Deadline</option>
              </Select>

              <Field
                label="Notes / Objective (optional)"
                placeholder="What do you plan to achieve during this time?"
                value={newDesc}
                onChange={(e: any) => setNewDesc(e.target.value)}
              />

              <div className="m-row" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <Btn kind="sec" onClick={() => setModal(false)}>Cancel</Btn>
                <Btn type="submit" disabled={busy || !newTitle.trim()}>
                  {busy ? 'Saving...' : 'Save reminder'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
