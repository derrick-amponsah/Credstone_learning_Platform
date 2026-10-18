Credstone Learning is a technology learning platform for working adults of every age and level, used both for required training and for courses people choose to take. It teaches practical skills such as networking, Linux, cloud, security, data and programming, with video, reading, quizzes and hands-on labs. It is calm, trustworthy and easy to read. Build every screen so that a first-time user and a senior manager can both use it without help.

## Content fundamentals

- Write plainly, in the second person: "Continue lesson", "Your achievements", "You have 2 courses to finish by their due dates." Never use "the user" or "learners" in interface copy.
- Name things by what people recognise: "Home", "My Courses", "Calendar", "Certificates", "Help". Avoid terms such as "dashboard", "module" or "asset" in navigation.
- State exactly what a button does: "Continue lesson", "Mark complete and continue", "Check my answer", "Download certificate".
- Tell people what is required and when: tag mandatory training `Required · due 31 Oct`. Offer help without judgement: "Need help or more time?", "There is no wrong question."
- Use sentence case everywhere. Only the `eyebrow` style is uppercase. No emoji, no exclamation marks except for a short "Correct!" style message in a gamified context.
- Quote real figures only: "Lesson 4 of 8", "about 15 minutes left", "5 days". Placeholder names appear as `[Name]`.

## Visual foundations

- **Colour.** Build on cream `surface` (60%), structure in `navy` (30%) and accents in `gold` (10%). Cards are `surface-raised` with a 1px `border`. Body text is `ink`; secondary text is `ink-muted`. Never use pure black or pure white text, except white on `navy`.
- **Gold is a fill.** Use `gold` for the primary action, badge discs and the certificate frame, with `on-gold` text on it. Never set text in `gold` on a light ground; use `gold-ink`. On `navy`, gold text is `gold-soft`.
- **Status always has a word.** Use `required-bg` with `required-ink` for deadlines, and `success-bg` with `success-ink` for correct answers and completion. Pair each with a word or an icon, never colour alone.
- **Type.** Headings and quiz questions are `display`, `title`, `heading` or `subheading` in Source Serif 4. Everything else is Source Sans 3: `lesson` for reading text at 68 characters wide, `body` for the interface, `small` as the smallest readable size, `label` for buttons and `eyebrow` for uppercase tags. Never go below 16px for text a learner must read.
- **Spacing and shape.** Use the `space-*` steps only. Cards use `radius-lg`; feature cards and lesson panels use `radius-xl`; buttons and options use `radius-md`; tags use `radius-sm`; badge discs and avatars use `radius-pill`.
- **Depth.** Borders, not shadows. `shadow-paper` sits under the certificate, and `shadow-overlay` is used only for floating parts (Menu, Modal, Toast).
- **Touch targets.** Every button, link row and input is at least `touch-min` (48px) high. The primary gold button is `touch-primary` (56px). Quiz options are at least `touch-option` (68px) high.
- **Layout.** Desktop screens pair a `navy` sidebar (`sidebar` wide) with a content column that has `space-12` padding. Phones use a `navy` top bar, a bottom tab bar, a `space-4` gutter, and a fixed bottom action bar on lessons and quizzes.
- **Focus.** Every interactive element shows a solid 3px `focus` ring with a 3px offset; on `navy` and `gold` use `focus-on-navy`.
- **Motion.** None required. If used, keep it under 200ms and respect reduced-motion settings.

## Accessibility

- Text meets 4.5:1 on its stated grounds in the light theme. The high-contrast theme raises text to 7:1 and makes borders 3:1. Always offer it as a user setting next to a text-size control (A, A, A).
- Offer audio ("Listen to this lesson"), captions and transcripts for any media. Offer "Request extra time" on timed or dated work.
- Quiz options are real radio inputs inside a labelled group. Never rely on the `border` colour alone to show selection: the selected option also gets a `navy` border, `highlight` fill and bold text.

## Iconography

Use the 84 line icons in `assets/Icons` (24px grid, 1.8px stroke, round caps and joins). They are single-ink navy files; to colour them, inline the SVG with `stroke="currentColor"`. Sizes are `icon-sm` 20px, `icon-md` 24px and `icon-lg` 32px. Always put a text label beside navigation icons. Badges, streaks and awards use the `gold` disc with a `navy` icon, as in `assets/Badges`; locked badges use `assets/Badges/locked.svg` and say what unlocks them. Status icons (`check-circle`, `alert`, `x-circle`, `info`) always travel with a lead word.

## Logo and illustration

Use `assets/Logos/credstone-mark.svg` on light grounds and `credstone-mark-on-dark.svg` on `navy`; the wordmark files pair the mark with the name in Source Serif 4 Bold. Keep clear space equal to the sand block's height. Use `assets/Illustrations` once per empty or onboarding screen, centred above its text.

## Technical learning

- **Code** is Source Code Pro at 16px/26px (`code`) on `code-bg`, in `CodeBlock`, `Terminal` and `CodeEditor`. Syntax colours are `code-keyword`, `code-string`, `code-number`, `code-function` and `code-muted`; each is at least 7:1 on `code-bg`. Always show line numbers on blocks longer than 3 lines, and a Copy button.
- **Results are words first.** Print PASS and FAIL in the terminal and a lead word in every alert; colour only reinforces them.
- **Labs** show instructions beside the editor on desktop and stacked on phones, with one primary button ("Run tests"), plus "Show a hint" and "Reset lab" as text buttons. Say how long the lab takes and that progress is saved.
- **Video** never autoplays, starts with captions on, and always links to a transcript. Offer 0.75×, 1×, 1.25× and 1.5× speeds.
- **Levels** are Beginner, Intermediate, Advanced or Expert, shown with `SkillLevel` and the word. Paths (`LearningPath`) show what unlocks locked steps.
- **Streaks and leaderboards** are optional and calm. Do not show them on required training, never shame a missed day, and let people turn them off in Settings.

## Components

Forty-four components in `components/`. Actions and content: Button, Tag, ProgressBar, CourseCard, Callout, Achievement, Certificate. Forms: TextField, SelectField, ChoiceControls, QuizOption, Toggle, SearchField, FilterChips. Navigation: NavItem, Tabs, Breadcrumb, Pagination, TopBar, TabBar, Stepper, Menu. Feedback: Alert, Toast, Modal, Tooltip, Skeleton, EmptyState. Data: Table, Avatar, Leaderboard, Accordion. Technical learning: CodeBlock, Terminal, CodeEditor, VideoPlayer, LessonOutline, LearningPath, CatalogCard, SkillLevel, Streak, ProgressRing, Discussion, Icon. Load `components/bundle.css` after the tokens and link the three Google Fonts (Source Serif 4, Source Sans 3, Source Code Pro). Class names start with `cs-`. Page-level arrangements are in the Patterns section.
