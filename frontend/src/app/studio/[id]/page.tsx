'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, ErrorBox, I, Ic, Loading, Pill } from '@/components/ui';
import { api, ago, useApi } from '@/lib/api';

export default function Workspace({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi(`/studio/courses/${params.id}`);
  const router = useRouter();
  const [msg, setMsg] = useState<any>(null);
  const input = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Objective state
  const [objective, setObjective] = useState('');
  const [savingObj, setSavingObj] = useState(false);

  // Practical Task & Rubric state (Priority 2)
  const [requiresPractical, setRequiresPractical] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState('');
  const [rubricCriteria, setRubricCriteria] = useState<any[]>([]);
  const [newCritTitle, setNewCritTitle] = useState('');
  const [newCritText, setNewCritText] = useState('');
  const [savingPractical, setSavingPractical] = useState(false);

  // Lesson modal state
  const [lessonModal, setLessonModal] = useState<any>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  // Question modal state
  const [questionModal, setQuestionModal] = useState<any>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const uploadLessonVideo = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const fd = new FormData();
    fd.append('file', file);
    setUploadingVideo(true);
    setMsg(null);
    try {
      const res = await api<any>(`/studio/courses/${params.id}/upload-video`, { form: fd });
      setLessonModal((prev: any) => ({
        ...prev,
        videoUrl: res.videoUrl,
      }));
      setMsg({ k: 'ok', t: `Video "${res.filename}" uploaded successfully.` });
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message || 'Video upload failed.' });
    } finally {
      setUploadingVideo(false);
    }
  };

  useEffect(() => {
    if (data?.course) {
      setObjective(data.course.objective || '');
      setRequiresPractical(!!data.course.requiresPractical);
      setTaskPrompt(data.course.taskPrompt || '');
    }
    if (data?.rubricCriteria) {
      setRubricCriteria(data.rubricCriteria);
    }
  }, [data?.course, data?.rubricCriteria]);

  const handleSavePractical = async () => {
    setSavingPractical(true);
    setMsg(null);
    try {
      await api(`/studio/courses/${params.id}`, {
        method: 'PATCH',
        body: { requiresPractical, taskPrompt },
      });
      if (requiresPractical && rubricCriteria.length > 0) {
        await api(`/studio/courses/${params.id}/rubric`, {
          body: { criteria: rubricCriteria },
        });
      }
      setMsg({ k: 'ok', t: 'Practical task and rubric configuration saved.' });
      await reload();
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message });
    } finally {
      setSavingPractical(false);
    }
  };

  const addCriterion = () => {
    if (!newCritTitle.trim() || !newCritText.trim()) {
      alert('Provide both a title and description for the rubric criterion.');
      return;
    }
    setRubricCriteria([
      ...rubricCriteria,
      {
        position: rubricCriteria.length + 1,
        title: newCritTitle.trim(),
        text: newCritText.trim(),
      },
    ]);
    setNewCritTitle('');
    setNewCritText('');
  };

  const removeCriterion = (idx: number) => {
    const updated = rubricCriteria.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i + 1 }));
    setRubricCriteria(updated);
  };

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ k: 'ok', t: ok });
      await reload();
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

  const upload = (files: FileList | null) => {
    const fd = new FormData();
    Array.from(files || []).forEach((f) => fd.append('file', f));
    run(() => api(`/studio/courses/${params.id}/sources`, { form: fd }), 'Material added.');
  };

  const saveObjective = async () => {
    setSavingObj(true);
    try {
      await api(`/studio/courses/${params.id}`, {
        method: 'PATCH',
        body: { objective },
      });
      setMsg({ k: 'ok', t: 'Course objective saved successfully.' });
      await reload();
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    } finally {
      setSavingObj(false);
    }
  };

  const openNewLesson = () => {
    setLessonModal({
      id: null,
      title: '',
      minutes: 5,
      videoUrl: '',
      transcript: '',
      sourceRef: data?.sources?.[0]?.name ? `${data.sources[0].name}, p. 1` : '',
    });
  };

  const openEditLesson = (l: any) => {
    setLessonModal({
      id: l.id,
      title: l.title || '',
      minutes: l.minutes || 5,
      videoUrl: l.videoUrl || '',
      transcript: l.transcript || '',
      sourceRef: l.sourceRef || '',
    });
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonModal.title.trim()) {
      alert('Lesson title is required.');
      return;
    }
    setSavingLesson(true);
    try {
      if (lessonModal.id) {
        await api(`/studio/lessons/${lessonModal.id}`, {
          method: 'PATCH',
          body: {
            title: lessonModal.title,
            minutes: Number(lessonModal.minutes) || 5,
            videoUrl: lessonModal.videoUrl || null,
            transcript: lessonModal.transcript || null,
            sourceRef: lessonModal.sourceRef || null,
          },
        });
        setMsg({ k: 'ok', t: 'Lesson updated.' });
      } else {
        await api(`/studio/courses/${params.id}/lessons`, {
          body: {
            title: lessonModal.title,
            minutes: Number(lessonModal.minutes) || 5,
            videoUrl: lessonModal.videoUrl || null,
            transcript: lessonModal.transcript || null,
            sourceRef: lessonModal.sourceRef || null,
          },
        });
        setMsg({ k: 'ok', t: 'New lesson added.' });
      }
      setLessonModal(null);
      await reload();
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message });
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    run(() => api(`/studio/lessons/${id}`, { method: 'DELETE' }), 'Lesson deleted.');
    setLessonModal(null);
  };

  const openNewQuestion = () => {
    setQuestionModal({
      prompt: '',
      explanation: '',
      sourceRef: data?.sources?.[0]?.name ? `${data.sources[0].name}` : '',
      options: [
        { label: 'A', text: '', isCorrect: true },
        { label: 'B', text: '', isCorrect: false },
        { label: 'C', text: '', isCorrect: false },
        { label: 'D', text: '', isCorrect: false },
      ],
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionModal.prompt.trim()) {
      alert('Question prompt is required.');
      return;
    }
    const filledOptions = questionModal.options.filter((o: any) => o.text.trim());
    if (filledOptions.length < 2) {
      alert('Please provide at least 2 non-empty options.');
      return;
    }
    const hasCorrect = filledOptions.some((o: any) => o.isCorrect);
    if (!hasCorrect) {
      alert('Select which option is correct.');
      return;
    }
    setSavingQuestion(true);
    try {
      await api(`/studio/courses/${params.id}/questions`, {
        body: {
          prompt: questionModal.prompt,
          explanation: questionModal.explanation || null,
          sourceRef: questionModal.sourceRef || null,
          options: filledOptions,
        },
      });
      setMsg({ k: 'ok', t: 'Assessment question added.' });
      setQuestionModal(null);
      await reload();
    } catch (err: any) {
      setMsg({ k: 'warn', t: err.message });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question?')) return;
    run(() => api(`/studio/questions/${id}`, { method: 'DELETE' }), 'Question removed.');
  };

  const editQ = (x: any) => {
    const p = window.prompt('Edit the question', x.prompt);
    if (p) run(() => api(`/studio/questions/${x.id}`, { method: 'PATCH', body: { prompt: p } }));
  };

  const submit = async () => {
    setMsg(null);
    try {
      await api(`/studio/courses/${params.id}/submit`, { body: {} });
      router.push('/studio');
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

  const pill = (s: string) =>
    s === 'ready' ? <Pill k="go">Ready</Pill> : s === 'needs_source' ? <Pill k="warn">Needs source</Pill> : <Pill>Empty</Pill>;

  return (
    <Shell allow={['instructor']}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <Head
            eye="Content Studio"
            title={`${data.course.title}${data.course.status === 'draft' ? ', draft' : ''}`}
            sub={`Version ${data.course.version}`}
          >
            <Pill>{data.course.status === 'draft' ? 'Draft' : 'In review'}</Pill>
            <Btn kind="sec" disabled title="Available once a version is published">
              Preview learner view
            </Btn>
            <Btn disabled={data.course.status !== 'draft'} onClick={submit}>
              Submit for review
            </Btn>
          </Head>

          {msg && <Alert k={msg.k}>{msg.t}</Alert>}

          {/* Measurable Course Objective Card */}
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
            <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                <Ic n="target" s={22} color="var(--navy)" />
                <h2 className="m-h3" style={{ margin: 0 }}>Course Objective</h2>
                {objective && objective.trim().length > 10 ? (
                  <Pill k="go">Measurable criterion met</Pill>
                ) : (
                  <Pill k="warn">Objective required for approval</Pill>
                )}
              </div>
              <Btn sm disabled={savingObj || data.course.status !== 'draft'} onClick={saveObjective}>
                {savingObj ? 'Saving...' : 'Save Objective'}
              </Btn>
            </div>
            <div className="m-sub" style={{ fontSize: 14 }}>
              Specify the measurable learning goal. The Training Owner verifies that this objective is clear, demonstrable, and assessed before approving.
            </div>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={data.course.status !== 'draft'}
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
                background: data.course.status === 'draft' ? '#fff' : 'var(--surface)',
                color: 'var(--ink)',
              }}
            />
          </div>

          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            {/* Left Column: Outline & Lessons & Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1.2, minWidth: 0 }}>
              {/* Existing Material */}
              <div
                className="m-row"
                style={{
                  gap: 16,
                  padding: '16px 18px',
                  border: '2px dashed var(--field-border)',
                  borderRadius: 12,
                  background: '#fff',
                }}
              >
                <Ic n="upload" s={34} color="var(--navy)" />
                <div style={{ flex: 1 }}>
                  <b style={{ color: 'var(--navy)', fontSize: 18 }}>Add existing material</b>
                  <div className="m-sub" style={{ fontSize: 15 }}>
                    Decks, SOPs, PDFs or docs · {data.sources.length} files added
                  </div>
                </div>
                <Btn onClick={() => input.current?.click()}>Upload</Btn>
                <input
                  ref={input}
                  hidden
                  multiple
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                  onChange={(e) => upload(e.target.files)}
                />
              </div>

              {/* Course Outline & Lessons */}
              <div className="m-card" style={{ paddingBottom: 0, overflow: 'hidden' }}>
                <div className="m-row" style={{ justifyContent: 'space-between', paddingBottom: 10 }}>
                  <h2 className="m-h3">Course Outline ({data.lessons.length} lessons)</h2>
                  <button
                    className="m-link m-row"
                    style={{ fontSize: 15, gap: 4 }}
                    disabled={data.course.status !== 'draft'}
                    onClick={openNewLesson}
                  >
                    <I n="plus" s={16} /> Add lesson
                  </button>
                </div>
                <div style={{ margin: '0 -18px' }}>
                  {data.lessons.map((l: any) => (
                    <div
                      key={l.id}
                      className="m-row"
                      style={{
                        gap: 12,
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <span aria-hidden style={{ color: 'var(--ink-muted)', fontSize: 20, letterSpacing: -2 }}>
                        &#8942;&#8942;
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Lesson {l.position}: {l.title}</span>
                          <span className="m-sub" style={{ fontSize: 13, fontWeight: 400 }}>({l.minutes || 5} mins)</span>
                        </div>
                        <div className="m-sub" style={{ fontSize: 13, marginTop: 2, display: 'flex', gap: 12 }}>
                          {l.videoUrl && <span><I n="play" s={13} /> Video attached</span>}
                          {l.transcript && <span><I n="file" s={13} /> Transcript attached</span>}
                          {l.sourceRef && <span><I n="book" s={13} /> Source: {l.sourceRef}</span>}
                        </div>
                      </div>
                      {pill(l.sourceRef ? 'ready' : 'needs_source')}
                      <button
                        className="m-link"
                        aria-label={`Edit ${l.title}`}
                        style={{ color: 'var(--navy)', padding: 4 }}
                        onClick={() => openEditLesson(l)}
                      >
                        <I n="pencil" s={18} />
                      </button>
                    </div>
                  ))}
                  {data.lessons.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-muted)', borderTop: '1px solid var(--border)' }}>
                      No lessons added yet. Click &quot;Add lesson&quot; to author your first lesson with video and transcript.
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment Questions (Hand-authored + Accepted) */}
              <div className="m-card">
                <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h2 className="m-h3" style={{ margin: 0 }}>Quiz Assessment</h2>
                    <div className="m-sub" style={{ fontSize: 14 }}>
                      {data.questionCount || 0} questions configured for this course
                    </div>
                  </div>
                  <Btn sm onClick={openNewQuestion} disabled={data.course.status !== 'draft'}>
                    <I n="plus" s={15} />&nbsp; Add Question
                  </Btn>
                </div>

                {data.questions && data.questions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.questions.map((q: any, idx: number) => (
                      <div
                        key={q.id}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: 'var(--surface)',
                        }}
                      >
                        <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <b style={{ color: 'var(--navy)', fontSize: 15 }}>
                            Q{idx + 1}. {q.prompt}
                          </b>
                          {data.course.status === 'draft' && (
                            <button
                              type="button"
                              className="m-link"
                              style={{ color: 'var(--required-ink)', fontSize: 14 }}
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {q.sourceRef && (
                          <div className="m-sub" style={{ fontSize: 13, marginTop: 4 }}>
                            Source: {q.sourceRef}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                          {q.options?.map((opt: any) => (
                            <div
                              key={opt.id || opt.label}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                fontSize: 13,
                                background: opt.isCorrect ? 'var(--success-bg)' : '#fff',
                                color: opt.isCorrect ? 'var(--success-ink)' : 'var(--ink)',
                                border: opt.isCorrect ? '1px solid var(--success-ink)' : '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <b>{opt.label}.</b>
                              <span style={{ flex: 1 }}>{opt.text}</span>
                              {opt.isCorrect && <Ic n="checkc" s={16} color="var(--success-ink)" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      background: 'var(--surface)',
                      borderRadius: 8,
                      color: 'var(--ink-muted)',
                      fontSize: 14,
                    }}
                  >
                    No questions yet. Click <b>&quot;Add Question&quot;</b> to write a question by hand, or use <b>&quot;Draft questions with AI&quot;</b> from uploaded sources.
                  </div>
                )}
              </div>

              {/* Practical Task & Rubric Authoring (Priority 2) */}
              <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                    <Ic n="award" s={22} color="var(--navy)" />
                    <h2 className="m-h3" style={{ margin: 0 }}>Practical Task &amp; Rubric</h2>
                  </div>
                  <Btn sm onClick={handleSavePractical} disabled={savingPractical || data.course.status !== 'draft'}>
                    {savingPractical ? 'Saving...' : 'Save Task & Rubric'}
                  </Btn>
                </div>
                <div className="m-sub" style={{ fontSize: 14 }}>
                  Enable a practical assessment requiring learners to submit evidence (documents, links, or recordings) evaluated by human assessors against a structured rubric.
                </div>

                {/* Practical Toggle */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: requiresPractical ? 'var(--highlight)' : 'var(--surface)',
                    border: requiresPractical ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                    cursor: data.course.status === 'draft' ? 'pointer' : 'default',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requiresPractical}
                    disabled={data.course.status !== 'draft'}
                    onChange={(e) => setRequiresPractical(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <b style={{ color: 'var(--navy)', fontSize: 15 }}>Require Practical Task Submission</b>
                    <div className="m-sub" style={{ fontSize: 13 }}>
                      Learners must submit work evaluated against the rubric below before their credential can be issued.
                    </div>
                  </div>
                  {requiresPractical ? <Pill k="go">Enabled</Pill> : <Pill>Optional</Pill>}
                </label>

                {requiresPractical && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                    {/* Task Prompt Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        Learner Task Prompt *
                      </label>
                      <textarea
                        rows={3}
                        value={taskPrompt}
                        disabled={data.course.status !== 'draft'}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        placeholder="e.g. Conduct a simulated customer intake interview. Submit your completed Customer Due Diligence (CDD) profile PDF and explain the risk categorization reasoning."
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      />
                    </div>

                    {/* Rubric Criteria Builder */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <b style={{ color: 'var(--navy)', fontSize: 15 }}>Evaluation Rubric Criteria</b>
                          <div className="m-sub" style={{ fontSize: 13 }}>
                            Assessors grade each submission against these criteria on a scale of Not Yet / Partly / Meets.
                          </div>
                        </div>
                        <span className="m-sub" style={{ fontSize: 13, fontWeight: 600 }}>
                          {rubricCriteria.length} {rubricCriteria.length === 1 ? 'criterion' : 'criteria'}
                        </span>
                      </div>

                      {/* Criteria List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {rubricCriteria.map((crit, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                            }}
                          >
                            <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <b style={{ color: 'var(--navy)', fontSize: 14 }}>
                                #{idx + 1}. {crit.title}
                              </b>
                              {data.course.status === 'draft' && (
                                <button
                                  type="button"
                                  className="m-link"
                                  style={{ color: 'var(--required-ink)', fontSize: 13 }}
                                  onClick={() => removeCriterion(idx)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--ink)' }}>{crit.text}</div>
                          </div>
                        ))}

                        {rubricCriteria.length === 0 && (
                          <div
                            style={{
                              padding: 14,
                              textAlign: 'center',
                              background: 'var(--surface)',
                              borderRadius: 8,
                              color: 'var(--ink-muted)',
                              fontSize: 13,
                            }}
                          >
                            No rubric criteria defined yet. Add criteria below to guide assessors.
                          </div>
                        )}
                      </div>

                      {/* Add Criterion Form */}
                      {data.course.status === 'draft' && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 8,
                            border: '1px dashed var(--border)',
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <b style={{ color: 'var(--navy)', fontSize: 14 }}>+ Add New Rubric Criterion</b>
                          <input
                            type="text"
                            placeholder="Criterion Title (e.g. Identity Verification)"
                            value={newCritTitle}
                            onChange={(e) => setNewCritTitle(e.target.value)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              fontSize: 14,
                            }}
                          />
                          <textarea
                            rows={2}
                            placeholder="Description of standard (e.g. Accurately verifies two valid primary identity documents against the watchlist without discrepancy)"
                            value={newCritText}
                            onChange={(e) => setNewCritText(e.target.value)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              fontFamily: 'inherit',
                              fontSize: 13,
                            }}
                          />
                          <Btn
                            kind="sec sm"
                            type="button"
                            style={{ alignSelf: 'flex-start' }}
                            onClick={addCriterion}
                          >
                            Add Criterion to Rubric
                          </Btn>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI Drafting, Sources, Reviewer Comments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
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
                {!data.ai.length && <div className="m-sub" style={{ marginBottom: 12 }}>No suggestions waiting.</div>}
                {data.ai.map((x: any) => (
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
                    <b style={{ color: 'var(--navy)' }}>{x.prompt}</b>
                    <div className="m-sub" style={{ fontSize: 14, marginTop: 2 }}>
                      <I n="file" s={14} /> Source: {x.sourceRef}
                    </div>
                  </div>
                ))}
                <div className="m-row" style={{ gap: 12, marginTop: 6 }}>
                  {data.ai.length ? (
                    <>
                      <Btn kind="sec" style={{ flex: 1 }} onClick={() => editQ(data.ai[0])}>
                        Edit
                      </Btn>
                      <Btn
                        style={{ flex: 1 }}
                        onClick={() =>
                          run(async () => {
                            for (const x of data.ai) await api(`/studio/questions/${x.id}/accept`, { body: {} });
                          }, 'Questions accepted into the assessment.')
                        }
                      >
                        Accept draft
                      </Btn>
                    </>
                  ) : (
                    <Btn
                      kind="sec"
                      style={{ flex: 1 }}
                      onClick={() =>
                        run(
                          () => api(`/studio/courses/${params.id}/ai-draft`, { body: {} }),
                          'Draft questions added for your review.'
                        )
                      }
                    >
                      <I n="spark" s={18} />&nbsp; Draft questions with AI
                    </Btn>
                  )}
                </div>
              </div>

              {data.needsSource.length > 0 && (
                <div className="m-card" style={{ background: 'var(--warning-bg)', borderColor: '#ecd9b0' }}>
                  <div className="m-row" style={{ gap: 12 }}>
                    <Ic n="info" s={22} color="var(--warning-ink)" />
                    <span style={{ fontSize: 15 }}>
                      Lesson {data.needsSource[0].position} needs a source before this course can go for review.
                    </span>
                  </div>
                </div>
              )}

              {data.comments.length > 0 && (
                <div className="m-card">
                  <h2 className="m-h3">Comments from reviewers</h2>
                  {data.comments.map((c: any, i: number) => (
                    <div key={i} style={{ marginTop: 10 }}>
                      <b style={{ color: 'var(--navy)' }}>{c.author}</b>{' '}
                      <span className="m-sub" style={{ fontSize: 14 }}>{ago(c.createdAt)}</span>
                      <div>{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lesson Authoring Modal */}
          {lessonModal && (
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
              onClick={() => setLessonModal(null)}
            >
              <div
                className="m-card"
                style={{
                  width: '100%',
                  maxWidth: 620,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#fff',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="m-row"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 10,
                  }}
                >
                  <div className="m-h3" style={{ margin: 0 }}>
                    {lessonModal.id ? 'Edit Lesson' : 'Add New Lesson'}
                  </div>
                  <button type="button" className="m-link" onClick={() => setLessonModal(null)} style={{ fontSize: 22 }}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonModal.title}
                      onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
                      placeholder="e.g. Identifying High-Risk Customers"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 15,
                      }}
                    />
                  </div>

                  <div className="m-row" style={{ gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={lessonModal.minutes}
                        onChange={(e) => setLessonModal({ ...lessonModal, minutes: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 15,
                        }}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        Source Reference (SOP / Policy)
                      </label>
                      <input
                        type="text"
                        value={lessonModal.sourceRef}
                        onChange={(e) => setLessonModal({ ...lessonModal, sourceRef: e.target.value })}
                        placeholder="e.g. Compliance SOP Section 2, p. 14"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 15,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                      Lesson Video Content
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="m-row" style={{ gap: 10, alignItems: 'center' }}>
                        <input
                          ref={videoInputRef}
                          type="file"
                          hidden
                          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                          onChange={(e) => uploadLessonVideo(e.target.files)}
                        />
                        <Btn
                          type="button"
                          kind="sec sm"
                          disabled={uploadingVideo}
                          onClick={() => videoInputRef.current?.click()}
                        >
                          <I n="upload" s={16} />&nbsp; {uploadingVideo ? 'Uploading Video...' : 'Upload Video File (.mp4, .webm, .mov)'}
                        </Btn>
                        {lessonModal.videoUrl && (
                          <span style={{ fontSize: 13, color: 'var(--success-ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Ic n="checkc" s={16} color="var(--success-ink)" /> Video attached
                          </span>
                        )}
                      </div>

                      {lessonModal.videoUrl && (
                        <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <video
                            src={lessonModal.videoUrl}
                            controls
                            style={{ width: '100%', maxHeight: 200, borderRadius: 6, background: '#000' }}
                          />
                          <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <span className="m-sub" style={{ fontSize: 12, wordBreak: 'break-all' }}>Source: {lessonModal.videoUrl}</span>
                            <button
                              type="button"
                              className="m-link"
                              style={{ color: 'var(--required-ink)', fontSize: 13 }}
                              onClick={() => setLessonModal({ ...lessonModal, videoUrl: '' })}
                            >
                              Remove video
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="m-sub" style={{ fontSize: 13, marginBottom: 4 }}>Or enter an external video/stream URL:</div>
                        <input
                          type="url"
                          value={lessonModal.videoUrl}
                          onChange={(e) => setLessonModal({ ...lessonModal, videoUrl: e.target.value })}
                          placeholder="https://example.com/videos/aml_lesson1.mp4"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: 14,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                      Lesson Transcript &amp; Content
                    </label>
                    <textarea
                      rows={5}
                      value={lessonModal.transcript}
                      onChange={(e) => setLessonModal({ ...lessonModal, transcript: e.target.value })}
                      placeholder="Provide the complete lesson script or notes. Learner captions and transcripts are automatically synchronized from this text."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  <div className="m-row" style={{ justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                    {lessonModal.id ? (
                      <button
                        type="button"
                        className="m-link"
                        style={{ color: 'var(--required-ink)', fontSize: 14 }}
                        onClick={() => handleDeleteLesson(lessonModal.id)}
                      >
                        Delete Lesson
                      </button>
                    ) : <span />}

                    <div className="m-row" style={{ gap: 10 }}>
                      <Btn kind="sec" type="button" onClick={() => setLessonModal(null)}>
                        Cancel
                      </Btn>
                      <Btn type="submit" disabled={savingLesson}>
                        {savingLesson ? 'Saving...' : 'Save Lesson'}
                      </Btn>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Question Builder Modal */}
          {questionModal && (
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
              onClick={() => setQuestionModal(null)}
            >
              <div
                className="m-card"
                style={{
                  width: '100%',
                  maxWidth: 640,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#fff',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="m-row"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 10,
                  }}
                >
                  <div className="m-h3" style={{ margin: 0 }}>Add Assessment Question</div>
                  <button type="button" className="m-link" onClick={() => setQuestionModal(null)} style={{ fontSize: 22 }}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                      Question Prompt *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={questionModal.prompt}
                      onChange={(e) => setQuestionModal({ ...questionModal, prompt: e.target.value })}
                      placeholder="e.g. Under the customer due diligence procedure, when must enhanced due diligence be triggered?"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontFamily: 'inherit',
                        fontSize: 15,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                      Answer Choices (Select radio button for the correct answer) *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {questionModal.options.map((opt: any, idx: number) => (
                        <div
                          key={opt.label}
                          className="m-row"
                          style={{
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: opt.isCorrect ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                            background: opt.isCorrect ? 'var(--highlight)' : '#fff',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            type="radio"
                            name="correct_choice"
                            checked={opt.isCorrect}
                            onChange={() => {
                              const updated = questionModal.options.map((o: any, i: number) => ({
                                ...o,
                                isCorrect: i === idx,
                              }));
                              setQuestionModal({ ...questionModal, options: updated });
                            }}
                            style={{ cursor: 'pointer', width: 18, height: 18 }}
                          />
                          <b style={{ color: 'var(--navy)', minWidth: 24 }}>{opt.label}.</b>
                          <input
                            type="text"
                            required={idx < 2}
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...questionModal.options];
                              updated[idx].text = e.target.value;
                              setQuestionModal({ ...questionModal, options: updated });
                            }}
                            placeholder={`Choice ${opt.label} text`}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              fontSize: 14,
                            }}
                          />
                          {opt.isCorrect && (
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-ink)' }}>
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="m-row" style={{ gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        Explanation (Shown after grading)
                      </label>
                      <input
                        type="text"
                        value={questionModal.explanation}
                        onChange={(e) => setQuestionModal({ ...questionModal, explanation: e.target.value })}
                        placeholder="Explain why this choice is correct according to policy"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 14,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        Source Reference
                      </label>
                      <input
                        type="text"
                        value={questionModal.sourceRef}
                        onChange={(e) => setQuestionModal({ ...questionModal, sourceRef: e.target.value })}
                        placeholder="e.g. AML SOP Section 3.1"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>

                  <div className="m-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <Btn kind="sec" type="button" onClick={() => setQuestionModal(null)}>
                      Cancel
                    </Btn>
                    <Btn type="submit" disabled={savingQuestion}>
                      {savingQuestion ? 'Adding...' : 'Add Question'}
                    </Btn>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
