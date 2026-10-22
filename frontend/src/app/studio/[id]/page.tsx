'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, ErrorBox, I, Ic, Loading, Pill, Toast, ToastData } from '@/components/ui';
import ConfirmModal from '@/components/ConfirmModal';
import PromptModal from '@/components/PromptModal';
import { api, useApi } from '@/lib/api';

import CourseObjectiveCard from '@/components/studio/CourseObjectiveCard';
import CoursePrerequisiteCard from '@/components/studio/CoursePrerequisiteCard';
import SourceMaterialsManager from '@/components/studio/SourceMaterialsManager';
import CourseOutline, { LessonItem } from '@/components/studio/CourseOutline';
import LessonModal, { LessonModalData } from '@/components/studio/LessonModal';
import QuizAssessmentCard from '@/components/studio/QuizAssessmentCard';
import QuestionBuilderModal, { QuestionBuilderForm } from '@/components/studio/QuestionBuilderModal';
import PracticalTaskCard from '@/components/studio/PracticalTaskCard';
import AiDraftCard, { AiSuggestion } from '@/components/studio/AiDraftCard';
import ReviewerCommentsCard from '@/components/studio/ReviewerCommentsCard';

export default function Workspace({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi(`/studio/courses/${params.id}`);
  const router = useRouter();
  const [msg, setMsg] = useState<{ k: 'warn' | 'info' | 'ok'; t: string } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Modals state
  const [lessonModal, setLessonModal] = useState<LessonModalData | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Generic confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    itemTitle?: string;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Prompt modal state for editing AI suggestions
  const [editAiSuggestion, setEditAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isSavingAiEdit, setIsSavingAiEdit] = useState(false);

  const isDraft = data?.course?.status === 'draft';

  // Course Actions
  const submitForReview = async () => {
    setMsg(null);
    try {
      await api(`/studio/courses/${params.id}/submit`, { body: {} });
      setToast({ k: 'ok', t: 'Course submitted for review. The Training Owner will be notified to approve it.' });
      setTimeout(() => router.push('/studio'), 2800);
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

  const handleDiscardDraft = () => {
    setConfirmAction({
      title: 'Discard course draft?',
      message: 'Are you sure you want to discard this course draft and all its uploaded materials? This cannot be undone.',
      itemTitle: data?.course?.title,
      confirmText: 'Discard draft',
      onConfirm: async () => {
        await api(`/studio/courses/${params.id}`, { method: 'DELETE' });
        router.push('/studio');
      },
    });
  };

  // Source Materials Actions
  const handleUploadSources = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('file', f));
    setMsg(null);
    try {
      const res = await api<any>(`/studio/courses/${params.id}/sources`, { form: fd });
      setMsg({ k: 'ok', t: `${res.added || 'New'} material(s) added successfully.` });
      await reload();
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    await api(`/studio/sources/${sourceId}`, { method: 'DELETE' });
    setMsg({ k: 'ok', t: `Source material "${sourceName}" removed successfully.` });
    await reload();
  };

  // Lesson Actions
  const handleSaveLesson = async (form: LessonModalData) => {
    if (form.id) {
      await api(`/studio/lessons/${form.id}`, {
        method: 'PATCH',
        body: {
          title: form.title,
          minutes: Number(form.minutes) || 5,
          kind: form.kind,
          videoUrl: form.videoUrl || null,
          documentUrl: form.documentUrl || null,
          transcript: form.transcript || null,
          sourceRef: form.sourceRef || null,
        },
      });
      setMsg({ k: 'ok', t: 'Lesson updated.' });
    } else {
      await api(`/studio/courses/${params.id}/lessons`, {
        body: {
          title: form.title,
          minutes: Number(form.minutes) || 5,
          kind: form.kind,
          videoUrl: form.videoUrl || null,
          documentUrl: form.documentUrl || null,
          transcript: form.transcript || null,
          sourceRef: form.sourceRef || null,
        },
      });
      setMsg({ k: 'ok', t: 'New lesson added.' });
    }
    await reload();
  };

  const handleDeleteLesson = async (id: string) => {
    const targetLesson = data?.lessons?.find((l: any) => l.id === id);
    setConfirmAction({
      title: 'Delete lesson?',
      message: 'Are you sure you want to delete this lesson from the course outline?',
      itemTitle: targetLesson?.title || 'Lesson',
      confirmText: 'Delete lesson',
      onConfirm: async () => {
        await api(`/studio/lessons/${id}`, { method: 'DELETE' });
        setMsg({ k: 'ok', t: 'Lesson deleted.' });
        setLessonModal(null);
        await reload();
      },
    });
  };

  // Question Actions
  const handleSaveQuestion = async (payload: QuestionBuilderForm) => {
    await api(`/studio/courses/${params.id}/questions`, {
      body: {
        prompt: payload.prompt,
        explanation: payload.explanation || null,
        sourceRef: payload.sourceRef || null,
        options: payload.options,
      },
    });
    setMsg({ k: 'ok', t: 'Assessment question added.' });
    await reload();
  };

  const handleDeleteQuestion = async (id: string) => {
    const targetQ = data?.questions?.find((q: any) => q.id === id);
    setConfirmAction({
      title: 'Remove assessment question?',
      message: 'Are you sure you want to remove this question from the course assessment?',
      itemTitle: targetQ?.prompt,
      confirmText: 'Remove question',
      onConfirm: async () => {
        await api(`/studio/questions/${id}`, { method: 'DELETE' });
        setMsg({ k: 'ok', t: 'Question removed.' });
        await reload();
      },
    });
  };

  // AI Drafting Actions
  const handleDraftWithAi = async () => {
    setMsg(null);
    try {
      await api(`/studio/courses/${params.id}/ai-draft`, { body: {} });
      setMsg({ k: 'ok', t: 'Draft questions added for your review.' });
      await reload();
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

  const handleEditAiSuggestion = (x: AiSuggestion) => {
    setEditAiSuggestion(x);
  };

  const handleAcceptAiDraft = async () => {
    setMsg(null);
    try {
      for (const x of data?.ai || []) {
        await api(`/studio/questions/${x.id}/accept`, { body: {} });
      }
      setMsg({ k: 'ok', t: 'Questions accepted into the assessment.' });
      await reload();
    } catch (e: any) {
      setMsg({ k: 'warn', t: e.message });
    }
  };

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
            title={data.course.title || 'Untitled Course'}
            sub={`Version ${data.course.version}`}
          >
            <Pill>{isDraft ? 'Draft' : 'In review'}</Pill>
            <Btn kind="sec" disabled title="Available once a version is published">
              Preview learner view
            </Btn>
            <Btn disabled={!isDraft} onClick={submitForReview}>
              Submit for review
            </Btn>
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
                  gap: 6,
                }}
                onClick={handleDiscardDraft}
                title="Discard this course draft and all its uploaded files"
              >
                <I n="trash" s={15} c="var(--required-ink)" />
                <span>Discard draft</span>
              </button>
            )}
          </Head>

          {msg && <Alert k={msg.k}>{msg.t}</Alert>}

          {/* Measurable Course Objective */}
          <CourseObjectiveCard
            courseId={params.id}
            initialObjective={data.course.objective || ''}
            isDraft={isDraft}
            onSaved={() => {
              setMsg({ k: 'ok', t: 'Course objective saved successfully.' });
              reload();
            }}
            onError={(errMsg) => setMsg({ k: 'warn', t: errMsg })}
          />

          {/* Course Prerequisite Requirement */}
          <CoursePrerequisiteCard
            courseId={params.id}
            initialPrerequisiteId={data.course.prerequisiteId || null}
            prerequisiteCourse={data.course.prerequisiteCourse || null}
            availablePrerequisites={data.availablePrerequisites || []}
            isDraft={isDraft}
            onSaved={reload}
            onError={(errMsg) => setMsg({ k: 'warn', t: errMsg })}
            onSuccess={(successMsg) => setMsg({ k: 'ok', t: successMsg })}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              alignItems: 'flex-start',
              width: '100%',
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* Left Column: Source Materials, Outline, Questions, Practical Task */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                flex: '1 1 540px',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {/* Source Materials Upload & Inspection */}
              <SourceMaterialsManager
                sources={data.sources || []}
                isDraft={isDraft}
                onUpload={handleUploadSources}
                onDeleteSource={handleDeleteSource}
              />

              {/* Course Outline & Lessons */}
              <CourseOutline
                lessons={data.lessons || []}
                isDraft={isDraft}
                onAddLesson={() =>
                  setLessonModal({
                    id: null,
                    title: '',
                    minutes: 5,
                    kind: 'Video',
                    videoUrl: '',
                    documentUrl: '',
                    transcript: '',
                    sourceRef: data?.sources?.[0]?.name ? `${data.sources[0].name}, p. 1` : '',
                  })
                }
                onEditLesson={(l: LessonItem) =>
                  setLessonModal({
                    id: l.id,
                    title: l.title || '',
                    minutes: l.minutes || 5,
                    kind: (l.kind as any) || 'Video',
                    videoUrl: l.videoUrl || '',
                    documentUrl: (l as any).documentUrl || '',
                    transcript: l.transcript || '',
                    sourceRef: l.sourceRef || '',
                  })
                }
              />

              {/* Assessment Questions */}
              <QuizAssessmentCard
                courseId={params.id}
                passMark={data.course?.passMark ?? 80}
                quizTimeLimitMinutes={data.course?.quizTimeLimitMinutes ?? 10}
                questions={data.questions || []}
                questionCount={data.questionCount || 0}
                isDraft={isDraft}
                onAddQuestion={() => setShowQuestionModal(true)}
                onDeleteQuestion={handleDeleteQuestion}
                onSettingsSaved={reload}
              />

              {/* Practical Task & Rubric (Priority 2) */}
              <PracticalTaskCard
                courseId={params.id}
                initialRequiresPractical={!!data.course.requiresPractical}
                initialTaskPrompt={data.course.taskPrompt || ''}
                initialRubricCriteria={data.rubricCriteria || []}
                isDraft={isDraft}
                onSaved={reload}
                onError={(m) => setMsg({ k: 'warn', t: m })}
                onSuccess={(m) => setMsg({ k: 'ok', t: m })}
              />
            </div>

            {/* Right Column: AI Drafting, Needs Source Notice, Reviewer Comments */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                flex: '1 1 360px',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {/* AI Drafting Card */}
              <AiDraftCard
                suggestions={data.ai || []}
                isDraft={isDraft}
                onDraftWithAi={handleDraftWithAi}
                onEditSuggestion={handleEditAiSuggestion}
                onAcceptDraft={handleAcceptAiDraft}
              />

              {/* Needs Source Alert */}
              {data.needsSource && data.needsSource.length > 0 && (
                <div className="m-card" style={{ background: 'var(--warning-bg)', borderColor: '#ecd9b0' }}>
                  <div className="m-row" style={{ gap: 12 }}>
                    <Ic n="info" s={22} color="var(--warning-ink)" />
                    <span style={{ fontSize: 15 }}>
                      Lesson {data.needsSource[0].position} needs a source before this course can go for review.
                    </span>
                  </div>
                </div>
              )}

              {/* Reviewer Comments */}
              <ReviewerCommentsCard
                comments={data.comments || []}
                courseId={params.id}
                onCommentChange={reload}
              />
            </div>
          </div>

          {/* Lesson Authoring Modal */}
          {lessonModal && (
            <LessonModal
              courseId={params.id}
              data={lessonModal}
              onClose={() => setLessonModal(null)}
              onSave={handleSaveLesson}
              onDelete={handleDeleteLesson}
              onError={(m) => setMsg({ k: 'warn', t: m })}
              onSuccess={(m) => setMsg({ k: 'ok', t: m })}
            />
          )}

          {/* Question Authoring Modal */}
          {showQuestionModal && (
            <QuestionBuilderModal
              initialSourceRef={data?.sources?.[0]?.name ? `${data.sources[0].name}` : ''}
              onClose={() => setShowQuestionModal(false)}
              onSave={handleSaveQuestion}
              onError={(m) => setMsg({ k: 'warn', t: m })}
            />
          )}

          {/* Dedicated Confirmation Modal */}
          <ConfirmModal
            open={!!confirmAction}
            title={confirmAction?.title}
            message={confirmAction?.message || ''}
            itemTitle={confirmAction?.itemTitle}
            confirmText={confirmAction?.confirmText || 'Confirm'}
            kind="danger"
            loading={isActionLoading}
            onConfirm={async () => {
              if (!confirmAction) return;
              setIsActionLoading(true);
              try {
                await confirmAction.onConfirm();
                setConfirmAction(null);
              } catch (e: any) {
                setMsg({ k: 'warn', t: e.message || 'Operation failed.' });
              } finally {
                setIsActionLoading(false);
              }
            }}
            onCancel={() => {
              if (!isActionLoading) setConfirmAction(null);
            }}
          />

          {/* Dedicated Prompt Modal for Editing AI Suggestions */}
          <PromptModal
            open={!!editAiSuggestion}
            title="Edit AI Question Suggestion"
            description="Revise this AI-suggested question prompt before accepting it into the assessment:"
            placeholder="Question prompt..."
            initialValue={editAiSuggestion?.prompt || ''}
            confirmText="Save question"
            loading={isSavingAiEdit}
            onSubmit={async (newPrompt) => {
              if (!editAiSuggestion) return;
              setIsSavingAiEdit(true);
              try {
                await api(`/studio/questions/${editAiSuggestion.id}`, {
                  method: 'PATCH',
                  body: { prompt: newPrompt },
                });
                setEditAiSuggestion(null);
                setMsg({ k: 'ok', t: 'Question updated.' });
                await reload();
              } catch (e: any) {
                setMsg({ k: 'warn', t: e.message });
              } finally {
                setIsSavingAiEdit(false);
              }
            }}
            onCancel={() => {
              if (!isSavingAiEdit) setEditAiSuggestion(null);
            }}
          />
        </>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </Shell>
  );
}
