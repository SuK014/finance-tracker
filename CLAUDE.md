@AGENTS.md

# Front-end design workflow

## The confirm-before-code loop

This applies whenever I'm asked for a new page, screen, or non-trivial component (e.g. "give me the home page," "build a settings screen," "add a transaction card"). It does **not** apply to small tweaks to existing UI (copy edits, color/spacing nudges, bug fixes) — those can just be done.

For qualifying requests, follow this sequence and do not skip steps:

1. **Propose a design direction, not code.** Work through the plan-then-build process from the `frontend-design` skill: identify the subject/audience/job of this screen, then produce a compact design brief — a color palette (4-6 named hex values), type choices, a layout concept (ASCII wireframe is fine), and 2-3 sentences on what makes this specific screen distinctive rather than generic. Do not write component code yet.
2. **Ask for preferences.** Surface the real decisions as questions (style/vibe, layout structure, density, any must-have elements or content). Use `AskUserQuestion` when there's a genuine fork to pick between; otherwise ask directly in text.
3. **Iterate until confirmed.** Adjust the brief based on feedback. Do not proceed until I've given explicit confirmation ("yes, build that," "go ahead," etc.) — a reaction to the mockup is not the same as confirmation.
4. **Then code it**, following the craft principles below.
5. **Then test it**, per the testing discipline below.

If I explicitly ask you to skip the design step ("just code it," "no mockup needed"), do so for that request only — this doesn't change the default for future requests.

## Design craft principles

The `frontend-design` skill (installed as a plugin) already governs avoiding templated/generic layouts, typography, and copy — read it as the baseline. These additional principles are about interaction craft and polish, in the spirit of Emil Kowalski's work (Vercel, sonner, vaul):

- **Motion is purposeful, never decorative-by-default.** Entrances use ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)` is a good default), 150-250ms for micro-interactions, longer only for orchestrated moments. Animate `transform` and `opacity`, not layout-triggering properties. Respect `prefers-reduced-motion` always. One deliberate motion moment per view beats fade-up-everything.
- **Every interactive element has a complete state set**: default, hover, focus-visible, active, disabled, and loading where relevant. Focus rings must be visible (never `outline: none` without a real replacement) and match the design language rather than the browser default.
- **Spacing follows a consistent scale** (4px base unit is a safe default unless the design calls for something else). Alignment is deliberate — no incidental 1-2px mismatches.
- **Typography is tuned, not left at browser defaults**: intentional line-height and letter-spacing per type size, optically balanced, following the design brief's type scale.
- **Build a small set of primitives and reuse them** (buttons, inputs, cards) rather than one-off styles per page — consistency across the app is part of the craft.
- **Accessibility is a floor, not a nice-to-have**: semantic HTML first, ARIA only to fill real gaps, AA contrast minimum, full keyboard operability.
- **Restraint**: cut anything that doesn't serve the specific screen's job. If two effects compete for attention, remove one.

## Testing discipline

Every new page or non-trivial component ships with a Playwright test, added in the same commit/turn as the component — not as a follow-up.

- Tests live under `tests/e2e/`, one spec file per page/flow, named after the route or component (e.g. `tests/e2e/home.spec.ts`).
- At minimum, cover: the page renders without console errors, the primary user action/flow works (form submit, navigation, toggle, etc.), and a basic accessibility check (visible focus state reachable via keyboard, no obvious contrast/labeling gaps).
- Before considering a UI task done, actually run `npx playwright test` and report the result — don't just assume the component works because it compiles.
- Additionally, when the Playwright MCP browser tools are available, use them to navigate to the built page and take a snapshot/screenshot as a self-review step before marking the task complete (per the `frontend-design` skill's self-critique guidance) — this is a visual sanity check in addition to, not instead of, the checked-in test suite.
