# Degree planner

A tool for planning out a degree, session by session. Pick a degree and an
enrolment year, optionally a specialisation, and lay courses into a grid of
Summer / Semester 1 / Autumn / Winter / Semester 2 / Spring sessions across
however many years the degree takes. As courses go in, the planner tells you
what's still missing against the degree and specialisation's requirements,
and flags anything worth a second look — an unmet prerequisite, a course that
needs a permission code, one that runs over more than one session, or one
whose code has since been retired. A small admin area behind a shared
password is where the course and degree catalog itself gets maintained.

## What good looks like here

The brief's own instruction shaped most of the hard calls: **nothing here is
enforced**. A missing compulsory course, an unmet prerequisite, a permission
code, a multi-session course — every one of these is a warning rendered next
to the plan, never a block on adding a course. That's a deliberate reading of
"a student may be able to negotiate with the college to skip prerequisites":
the system's job is to inform, not to gatekeep.

Some choices that came out of that:

- **Compulsory courses are a checklist, not a queue.** The planner shows what
  a degree (and specialisation, if chosen) still requires, but you can add
  courses in any order, and the checklist just shrinks as the plan fills in.
- **Prerequisites are CNF, not a flat AND-list.** A course can need "A, and
  (B or C)" — a shape real prerequisite rules actually take — checked against
  everything planned in an earlier session, not enforced as an ordering.
- **A multi-session course gets one row and a warning**, not two auto-added
  sessions. Real ANU sessions aren't evenly spaced (Autumn and Winter sit
  between the two main semesters), so guessing which later slot a "Part 2"
  belongs in would invent a rule the brief never gave.
- **Requirements are locked in at enrolment.** A degree's required courses and
  electives are versioned per year in the catalog, and a plan reads the
  version for the year it enrolled — the brief's "this is locked in when they
  enrol", modelled directly rather than assumed.
- **A retired course stays resolvable.** Its row stays in the catalog with a
  link to whatever superseded it, so an old plan that used the old code still
  renders and explains itself, even though the code has dropped out of the
  "add a course" picker for new plans.
- **The admin area is a shared password, on purpose.** The brief asked for "a
  generic password for now", so that's what it is: one hashed value in a
  cookie, no accounts, no expiry. It's the simplest thing that actually gates
  the catalog-editing routes, and building more than that wasn't asked for.

What isn't enforced by a check: whether the seed catalog is a *convincing*
illustration of every warning case, and whether the admin forms are pleasant
to use with a real course list rather than a dozen rows. Those are judgement
calls for the crit, not something `spec/` can verify on its own.
