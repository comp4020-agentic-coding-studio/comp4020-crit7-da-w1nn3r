import type { APIRoute } from "astro";
import { getOwnedPlanCourseRow, placeCourseInPlan } from "../../../../../../lib/queries";
import { SESSION_ORDER, type Session } from "../../../../../../lib/schema";

// Moves a staged (or already-placed) course into a year/session slot. Used
// both by the no-JS manual "Place" form on a staged card and by the
// drag-and-drop script's fetch() — one code path for "move a course".
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const planId = Number(params.id);
  const rowId = Number(params.courseRowId);
  const row = getOwnedPlanCourseRow(planId, rowId);
  if (!row) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const yearNum = Number(form.get("year"));
  const session = String(form.get("session") ?? "");
  const sessionValid = (SESSION_ORDER as readonly string[]).includes(session);

  if (!Number.isInteger(yearNum) || yearNum < 1 || !sessionValid) {
    return redirect(`/plans/${planId}?error=invalid`, 303);
  }

  placeCourseInPlan(rowId, { year: yearNum, session: session as Session });
  return redirect(`/plans/${planId}`, 303);
};
