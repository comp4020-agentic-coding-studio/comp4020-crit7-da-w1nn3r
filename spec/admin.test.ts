import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
const ORIGIN = { Origin: baseUrl };

// spec/global-setup.ts boots the server with no ADMIN_PASSWORD set, so
// src/lib/adminAuth.ts falls back to its default — see that file's
// `configuredPassword`.
const CORRECT_PASSWORD = "changeme";

async function attemptLogin(password: string): Promise<{ status: number; cookie: string | null; body: string }> {
  const res = await fetch(new URL("/admin/login", baseUrl), {
    method: "POST",
    headers: ORIGIN,
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  return {
    status: res.status,
    cookie: setCookie ? setCookie.split(";")[0] : null,
    body: res.status === 200 ? await res.text() : "",
  };
}

describe("admin auth gate", () => {
  it("redirects an unauthenticated visitor to the login page", async () => {
    const res = await fetch(new URL("/admin", baseUrl), { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");
  });

  it("redirects unauthenticated access to admin API routes too", async () => {
    const res = await fetch(new URL("/api/admin/courses", baseUrl), {
      method: "POST",
      headers: ORIGIN,
      body: new URLSearchParams({ code: "X", title: "X" }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");
  });

  it("rejects the wrong password and grants no session", async () => {
    const attempt = await attemptLogin("definitely-not-it");
    expect(attempt.status).toBe(200);
    expect(attempt.cookie).toBeNull();
    expect(new JSDOM(attempt.body).window.document.body.textContent).toContain("Incorrect password.");
  });

  it("accepts the configured password and grants access to the dashboard", async () => {
    const attempt = await attemptLogin(CORRECT_PASSWORD);
    expect(attempt.status).toBe(302);
    expect(attempt.cookie).toBeTruthy();

    const dashboard = await fetch(new URL("/admin", baseUrl), {
      headers: { Cookie: attempt.cookie! },
    });
    expect(dashboard.status).toBe(200);
    const doc = new JSDOM(await dashboard.text()).window.document;
    expect(doc.querySelector("h1")?.textContent).toBe("Admin");
  });
});
