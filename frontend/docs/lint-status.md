# Frontend Lint Status

Recorded: 2026-10-01

## Summary

`npm run lint` currently reports **94 problems (86 errors, 8 warnings)** across the pre-existing frontend codebase. None are in the four module pages added during this session (AMU, Sampling Sites, Actions, Role Routing) nor in their drawers.

## What is clean

- `src/pages/AmuDashboard.jsx`
- `src/pages/SamplingSites.jsx`
- `src/pages/Actions.jsx`
- `src/pages/RoleRouting.jsx`
- `src/components/actions/ActionDrawer.jsx`
- `src/components/sites/SiteDrawer.jsx`

Any file added under `src/pages/` or `src/components/<new>/` from now on is expected to be ESLint-clean.

## What has debt

~48 files across:
- `src/pages/*.jsx` (pre-existing pages: Analytics, History, NationalDashboard, Reports, ...)
- `src/components/**/*.jsx` (alerts, dashboard, map, pathogen, predictions, ...)
- `src/hooks/*.js`
- `tailwind.config.js`

Common patterns:

| Rule | Notes |
|------|-------|
| `no-unused-vars` | Unused imports and destructured variables |
| `react-hooks/exhaustive-deps` | Missing memoisation on callbacks and effects |
| `react-hooks/set-state-in-effect` | `setState` called synchronously inside `useEffect` |
| `no-undef` | `require()` used in `tailwind.config.js` (CommonJS syntax in an ESM file) |

## Why it has not been fixed

ESLint was configured in the project but never wired into a blocking workflow. Running it for the first time (this session) surfaced the accumulated debt. Fixing all 94 items in a single PR would:

1. Touch ~48 files, obscuring the history.
2. Risk introducing regressions in working UI code.
3. Contradict the "one commit, one purpose" discipline observed elsewhere in this project.

## Plan

1. **This session (A3a):** document the state, ensure new module pages are clean.
2. **Dedicated session (A3b):** fix the 94 items file by file, grouped by rule. Each file or small cluster becomes one commit.
3. **After A3b (A3c):** promote ESLint from warning to blocking in pre-commit and CI.

## Interim rule for contributors

Before committing frontend work:

    npx eslint <files you changed>

Files you touched must be clean. Files you did not touch are out of scope. This keeps the debt from growing while the fix-up is scheduled.