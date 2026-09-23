# Crit 7 reflection

The breakthrough was deciding, before writing any schema, that the brief's
"warn, don't block" instruction was itself the architecture, not a UI detail
to bolt on afterwards. Once I saw that every one of the brief's five checks —
compulsory courses, prerequisites, permission codes, multi-session courses,
superseded codes — was the same shape (compute a fact about a course against
the plan, render it, never refuse the write), the whole warning engine fell
out as a handful of pure functions over plain rows, called from the same
place the page renders from. Before that click I was heading toward
scattering "can this be added?" checks through the POST handlers themselves,
which would have quietly turned warnings into soft blocks the first time I
forgot to make one advisory.

It changed how I think about a "rule" in a system I'm building. My instinct
going in was that a prerequisite or a compulsory course is naturally an
enforcement mechanism — that's what the words suggest. This week argued the
opposite: a rule can be entirely real, entirely checked, and still not have
the authority to say no. A real degree works that way too — a college can
always let a student skip ahead — and a planning tool that pretended
otherwise would be lying about how much power it actually has. I want to
carry that distinction into future systems: model what's true, decide
separately who gets to act on it, and don't let the first decision quietly
make the second one for you.
