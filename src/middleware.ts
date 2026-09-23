import { defineMiddleware } from "astro:middleware";
import { ADMIN_COOKIE_NAME, isAuthenticated } from "./lib/adminAuth";

// Gates every /admin* route behind the shared-password cookie, except the
// login page itself. Deliberately minimal — no sessions table, no expiry.
export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminRoute || pathname === "/admin/login") {
    return next();
  }

  const cookie = context.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isAuthenticated(cookie)) {
    return context.redirect("/admin/login", 302);
  }
  return next();
});
