// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.
// /admin/login is the only /admin* route that's reachable unauthenticated —
// everything else under /admin redirects to it, so it's the one the public
// invariants can cover.
export const ROUTES = ["/", "/readme/", "/plans/new", "/plans/1", "/admin/login"];
