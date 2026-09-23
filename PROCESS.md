# Process overview

## What I built

A degree planner: pick a degree, an enrolment year and (optionally) a
specialisation, lay courses into a grid of Summer / Semester 1 / Autumn /
Winter / Semester 2 / Spring sessions, and see — as warnings, never blocks —
what's still missing, what prerequisites aren't planned yet, what needs a
permission code, what runs over more than one session, and what course codes
have been retired. A small shared-password admin area maintains the course
and degree catalog behind it. `README.md` covers what "good" means for the
app; this is how the six days of work actually went.

## How I got here

The brief itself decided the biggest design fork early: everything it lists —
compulsory courses, prerequisites, permission codes, multi-session courses —
gets a warning, not an enforcement rule ("do not strict enforce order as a
student may be able to negotiate with the college to skip prerequisites"). So
before writing any schema I worked out which parts of the brief were data
(what a course *is*) and which were checks run against that data at render
time, since conflating the two would have meant re-deriving "is this
blocking?" logic in half a dozen places.

The starter's guestbook came out first —
[`fd2b964`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/fd2b964)
replaces its single `messages` table with the full catalog: courses,
degrees/specialisations, their per-enrolment-year requirement sets (required
items and elective pools), and CNF prerequisite groups (N groups, ANDed;
each group's options ORed) rather than a flat AND-list, because a real
prerequisite rule like "A, and (B or C)" doesn't fit a flat list. A small
seed dataset went in alongside the schema, sized to hit every warning case at
least once rather than to look like a real ANU catalog.

From there the build went in the order a user would hit it, each step kept
buildable and committed on its own:
[`e286ad1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/e286ad1)
is the home page and create-plan flow,
[`0d505cf`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/0d505cf)
is the planner grid itself — the spec-critical slice, since a course added to
a session has to survive a reload, which I checked by hand in the browser
(add a course, refresh, it's still there) well before any spec test existed
for it. [`681f5cd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/681f5cd)
wires in the warning engine (`src/lib/planning.ts`) as pure functions over a
plan's rows, called from the same place the page renders from, so the page
can never show a warning state the code didn't actually compute.

Admin came last, on purpose — it's real work but it's CRUD, the same
form-POST-redirect shape the public pages already used, so it was the safest
thing to compress if the week ran short:
[`3703c3a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/3703c3a)
adds the password gate and course CRUD,
[`a02d330`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/a02d330)
extends it to degrees, specialisations and their year-keyed requirement sets.
That commit's build initially failed — two of the new requirement-set pages
had their relative import depth miscounted (`../../../../lib/queries` instead
of `../../../../../lib/queries`, one directory shy of where the file actually
sits), which cascaded into over a dozen implicit-`any` typecheck errors
downstream. `pnpm check`'s own output pointed straight at it; fixing the
import path and adding the explicit parameter types it had been inferring
around cleared every error in one pass.

Spec tests
([`332a0de`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-da-w1nn3r/commit/332a0de))
came after the behaviour they check, not before, for the parts built this
week — an explicit trade against the starter's own red-to-green model, made
because the warning logic and the schema were both still moving daily and a
test written against Monday's shape would have been rewritten by Thursday
anyway. `spec/planning.test.ts` splits in two: one block reads the seeded
demo plan at `/plans/1` — fixed, never mutated — for the permission-code,
multi-session and superseded-course warnings and the missing-compulsory
checklist; a second creates a fresh plan (discovering the seed's degree id
and enrolment year from the rendered form rather than hardcoding them, so it
survives the seed data changing) to drive the actual persistence-and-warning
core flow end to end. `spec/admin.test.ts` covers the auth gate: redirects
when logged out, rejects the wrong password, accepts the right one and keeps
the session cookie working on a follow-up request. Every one of these hits
real HTTP against the built server, the same as a student clicking through a
browser would, rather than importing app internals.

Manual smoke-testing (`curl` against a throwaway SQLite DB on a free port,
with an explicit `Origin` header on every POST — Astro's own CSRF check
rejects anything without one) ran after every milestone above, catching
issues like a duplicate-year admin submission not being rejected before it
ever reached a spec test.
