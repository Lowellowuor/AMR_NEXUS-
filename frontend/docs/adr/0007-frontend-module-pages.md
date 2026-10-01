# ADR-0007: Frontend Module Pages

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Backend PRs #2, #4, #5 and #6 introduced four new modules - AMU, Actions,
Role Routing, Sampling Sites - each with its own endpoints, models, and
permissions. None of them have a frontend page. From a county user's
perspective, the platform looks unchanged since before this work: the
dashboard, analytics, predictions, history, alerts, and reports pages are
the only navigable surfaces.

The four stakeholder gaps closed by the backend are, today, invisible.

This ADR records the pattern for adding a page for a backend module.

## Decision

Every backend module under `src/modules/<name>/` gets at most one page
under `src/pages/<Feature>.jsx`, plus (optionally) a set of feature
components under `src/components/<feature>/`.

### Conventions

1. **Page file:** `src/pages/<Feature>.jsx`, default export, calls
   `usePageTitle("<Human Readable>")` first.

2. **API methods:** extend the singleton `api` object in
   `src/api/client.js` with one method per backend endpoint. Methods
   follow the existing shape:

       getAmuDrugs: () => authFetch(`${API_BASE}/modules/amu/drugs`).then(handleResponse),

   No new fetch wrappers, no direct `fetch()` calls from pages.

3. **Server state:** pages use TanStack Query (`useQuery` /
   `useMutation`), matching the pattern established in
   `src/pages/Alerts.jsx`. Raw `useEffect` + `useState` is retained for
   pages that predate this convention but is not used for new work.

4. **Route registration:** one `<Route path="<slug>" element={wrap(<Feature />)} />`
   line in `src/App.jsx`. No route is added before the page exists.

5. **Nav entry:** one object in the `commonLinks` array in
   `src/components/Layout/Sidebar.jsx`:

       { name: "<Human Readable>", href: "/<slug>", icon: <Icon> },

   Icon comes from `@heroicons/react/24/outline`.

6. **Visual language:** reuse existing primitives. Card containers use
   `bg-[var(--bg-secondary)]/80 p-5 rounded-2xl`. Empty states use
   `<EmptyState />` from `src/components/ui/EmptyState.jsx`. Loading
   states use `<Skeleton />` from `src/components/ui/Skeleton.jsx`.
   Charts use Recharts unless a specific chart type is unavailable.

7. **RBAC:** read views are visible to all authenticated users. Write
   controls are conditionally rendered using the caller's role from the
   existing auth context. The backend enforces permissions; the frontend
   reflects them.

### Scope of a module-page PR

One module, one page, one route, one nav entry. Feature components live
under `src/components/<feature>/` if the page grows beyond ~250 lines.
Test tooling is not added in this ADR - that is a separate concern and
will be addressed once.

## Consequences

- Adding a page for a module is now a checklist, not a design exercise.
- The four backend modules become user-visible, one PR at a time.
- The `api` object grows monotonically; if it exceeds ~150 methods a
  refactor to per-module files may be warranted. Not now.
- No new dependency is introduced.

## Rejected alternatives

- **One big "Modules" page listing all four.** Rejected: each module has
  distinct navigation value and different primary actions. Bundling them
  obscures each.

- **Auto-generate pages from the module registry.** Rejected for now:
  the registry exposes routes, not UI intent. A generic page would be
  worse than no page.

- **Wait for a design system overhaul first.** Rejected: the design
  system is adequate. The gap is coverage, not polish.