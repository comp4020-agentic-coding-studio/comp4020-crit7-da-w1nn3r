import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

// These hit the running server (see spec/invariants.test.ts) with real HTTP
// requests — no importing app internals — so they check the same thing a
// student clicking through the browser would see.
const baseUrl = inject("baseUrl");

// fetch() has no cookie jar and Astro's CSRF protection (astro.config.ts)
// rejects state-changing requests without a matching Origin header, so every
// non-GET request here sets it explicitly.
const ORIGIN = { Origin: baseUrl };

function textOf(html: string): string {
  return new JSDOM(html).window.document.body.textContent ?? "";
}

async function post(path: string, body: URLSearchParams): Promise<Response> {
  return fetch(new URL(path, baseUrl), { method: "POST", headers: ORIGIN, body });
}

/** The value of the <option> whose text starts with "CODE — ", wherever it appears on the page. */
function optionValue(doc: Document, code: string): string {
  const option = [...doc.querySelectorAll("option")].find((o) => (o.textContent ?? "").startsWith(`${code} — `));
  if (!option) throw new Error(`no <option> found for ${code}`);
  return option.getAttribute("value") ?? "";
}

describe("planning: seeded demo plan shows every warning", () => {
  let text: string;

  beforeAll(async () => {
    const res = await fetch(new URL("/plans/1", baseUrl));
    expect(res.status).toBe(200);
    text = textOf(await res.text());
  });

  it("flags the permission-coded course", () => {
    expect(text).toContain("Requires a permission code from the department.");
  });

  it("flags the multi-session course", () => {
    expect(text).toContain("Runs over 2 consecutive sessions");
  });

  it("notes the superseded course's replacement", () => {
    expect(text).toContain("This course code is retired");
    expect(text).toContain("now CODE1000");
  });

  it("lists missing compulsory courses and under-filled elective pools as a checklist, not a block", () => {
    // The demo plan never adds CODE1010, a degree-required course, or WEBX210,
    // its chosen specialisation's required course — both should show up as
    // outstanding, and nothing about their presence should block the page.
    expect(text).toContain("CODE1010");
    expect(text).toContain("Software electives");
    expect(text).toContain("WEBX210");
  });
});

describe("planning: persistence and prerequisite warnings", () => {
  let planId: number;
  let code1000Id: string;
  let code1010Id: string;

  beforeAll(async () => {
    const newPlanForm = await fetch(new URL("/plans/new", baseUrl));
    const newPlanDoc = new JSDOM(await newPlanForm.text()).window.document;
    const degreeId = [...newPlanDoc.querySelectorAll('select[name="degree"] option')]
      .map((o) => o.getAttribute("value"))
      .find((value) => value);
    expect(degreeId, "seed data must include at least one degree").toBeTruthy();

    const withYearRes = await fetch(new URL(`/plans/new?degree=${degreeId}`, baseUrl));
    const withYearDoc = new JSDOM(await withYearRes.text()).window.document;
    const year = withYearDoc.querySelector('select[name="enrollmentYear"] option')?.getAttribute("value");
    expect(year, "the seeded degree must have a locked-in requirement year").toBeTruthy();

    const createRes = await post(
      "/api/plans",
      new URLSearchParams({ label: "Spec test plan", degreeId: degreeId!, enrollmentYear: year! }),
    );
    expect(createRes.status).toBe(200);
    const match = createRes.url.match(/\/plans\/(\d+)$/);
    expect(match, `expected a redirect to /plans/<id>, got ${createRes.url}`).toBeTruthy();
    planId = Number(match![1]);

    const planPage = await fetch(new URL(`/plans/${planId}`, baseUrl));
    const planDoc = new JSDOM(await planPage.text()).window.document;
    code1000Id = optionValue(planDoc, "CODE1000");
    code1010Id = optionValue(planDoc, "CODE1010");
  });

  it("persists an added course across a reload", async () => {
    const addRes = await post(
      `/api/plans/${planId}/courses`,
      new URLSearchParams({ courseId: code1010Id, year: "1", session: "s1" }),
    );
    expect(addRes.status).toBe(200);

    // "reload": a fresh request, not the same response object.
    const reloaded = await fetch(new URL(`/plans/${planId}`, baseUrl));
    expect(textOf(await reloaded.text())).toContain("CODE1010");
  });

  it("warns about an unmet prerequisite, and the warning clears once it's planned earlier", async () => {
    const before = await fetch(new URL(`/plans/${planId}`, baseUrl));
    expect(textOf(await before.text())).toContain("Prerequisite not planned earlier yet: needs CODE1000.");

    await post(
      `/api/plans/${planId}/courses`,
      new URLSearchParams({ courseId: code1000Id, year: "1", session: "summer" }),
    );

    const after = await fetch(new URL(`/plans/${planId}`, baseUrl));
    expect(textOf(await after.text())).not.toContain("Prerequisite not planned earlier yet");
  });
});

describe("planning: stage then drag-place a course", () => {
  let planId: number;

  beforeAll(async () => {
    const newPlanForm = await fetch(new URL("/plans/new", baseUrl));
    const newPlanDoc = new JSDOM(await newPlanForm.text()).window.document;
    const degreeId = [...newPlanDoc.querySelectorAll('select[name="degree"] option')]
      .map((o) => o.getAttribute("value"))
      .find((value) => value);

    const withYearRes = await fetch(new URL(`/plans/new?degree=${degreeId}`, baseUrl));
    const withYearDoc = new JSDOM(await withYearRes.text()).window.document;
    const year = withYearDoc.querySelector('select[name="enrollmentYear"] option')?.getAttribute("value");

    const createRes = await post(
      "/api/plans",
      new URLSearchParams({ label: "Stage spec test plan", degreeId: degreeId!, enrollmentYear: year! }),
    );
    const match = createRes.url.match(/\/plans\/(\d+)$/);
    expect(match, `expected a redirect to /plans/<id>, got ${createRes.url}`).toBeTruthy();
    planId = Number(match![1]);
  });

  it("stages a course without placing it, then places it via the place endpoint", async () => {
    const planPage = await fetch(new URL(`/plans/${planId}`, baseUrl));
    const planDoc = new JSDOM(await planPage.text()).window.document;
    const courseId = optionValue(planDoc, "CODE1010");

    // Staging posts only courseId — no year/session — which should insert it
    // unplaced rather than 400ing.
    const stageRes = await post(`/api/plans/${planId}/courses`, new URLSearchParams({ courseId }));
    expect(stageRes.status).toBe(200);

    const stagedPage = await fetch(new URL(`/plans/${planId}`, baseUrl));
    const stagedDoc = new JSDOM(await stagedPage.text()).window.document;
    const stagedCard = [...stagedDoc.querySelectorAll(".staged-course")].find((li) =>
      (li.textContent ?? "").includes("CODE1010"),
    );
    expect(stagedCard, "staged course should render as a .staged-course card").toBeTruthy();
    expect(
      [...stagedDoc.querySelectorAll("td.plan-cell")].some((td) => (td.textContent ?? "").includes("CODE1010")),
    ).toBe(false);

    const rowId = stagedCard!.getAttribute("data-row-id");
    expect(rowId).toBeTruthy();

    const placeRes = await post(
      `/api/plans/${planId}/courses/${rowId}/place`,
      new URLSearchParams({ year: "1", session: "s1" }),
    );
    expect(placeRes.status).toBe(200);

    const placedPage = await fetch(new URL(`/plans/${planId}`, baseUrl));
    const placedDoc = new JSDOM(await placedPage.text()).window.document;
    expect(
      [...placedDoc.querySelectorAll("td.plan-cell")].some((td) => (td.textContent ?? "").includes("CODE1010")),
    ).toBe(true);
    expect(
      [...placedDoc.querySelectorAll(".staged-course")].some((li) => (li.textContent ?? "").includes("CODE1010")),
    ).toBe(false);
  });
});
