# Patterns

Arrange the components into these screens. All use the cream `surface` page, `space-12` padding on desktop and a `space-4` gutter on phones.

## Home

A `navy` sidebar (`NavItem`, `sidebar` wide), a greeting in `display`, one feature `CourseCard` for "Continue lesson", a row of `Streak` and `StatCard`-style `cs-stat` tiles, then required training and chosen courses as two separate lists. On phones swap the sidebar for `TopBar` and `TabBar`.

## Course catalogue

`SearchField`, `FilterChips` for level and topic, a grid of `CatalogCard` (three across on desktop, one on phones) and `Pagination`. An assigned course carries a `Tag` "Required · due 31 Oct". Show `EmptyState` when filters match nothing, with "Clear filters" as the primary button.

## Lesson

`Breadcrumb`, `LessonOutline` in the sidebar, `VideoPlayer` or reading text at `lesson` size (68 characters wide), a `CodeBlock` for examples, `Callout` for key points, and a footer with "Previous lesson" and "Mark complete and continue". Put `Discussion` in its own tab.

## Hands-on lab

`CodeEditor` fills the width. Show `Alert` (info) for the time limit, a `Stepper` for lab parts, and a `Modal` before anything that resets work. On phones stack instructions above the editor and keep "Run tests" fixed at the bottom.

## Quiz

`ProgressBar` or segmented progress, a question in `title`, `QuizOption` rows, then Back, "Show a hint" and "Check my answer". Show answer feedback in an `Alert` (success or error) with a lead word and the reason.

## Learning path and achievements

`LearningPath` beside `ProgressRing`; `Achievement` badges from `assets/Badges`; `Certificate` with a "Download certificate" primary button and a verification line.

## Settings and accessibility

`Toggle` for high contrast, captions and reminders; text size A A A; `SelectField` for level; "Request extra time" as a text button. Always offer the high-contrast theme here.
