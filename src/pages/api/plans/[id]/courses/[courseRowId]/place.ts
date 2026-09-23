import type { APIRoute } from "astro";
import { getOwnedPlanCourseRow, placeCourseInPlan } from "../../../../../../lib/queries";
import { SESSION_ORDER, type Session } from "../../../../../../lib/schema";

// Moves a staged (or already-placed) course into a year/session slot, or
// back to staged when both are blank. Used by the no-JS manual "Place" form
// on a staged card, by the drag-and-drop script's fetch() dropping onto a
// cell, and by the same script dropping a card back onto the staging tray —
// one code path for "move a course".
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const planId = Number(params.id);
  const rowId = Number(params.courseRowId);
  const row = getOwnedPlanCourseRow(planId, rowId);
  if (!row) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const yearRaw = String(form.get("year") ?? "").trim();
  const sessionRaw = String(form.get("session") ?? "").trim();

  if (yearRaw === "" && sessionRaw === "") {
    placeCourseInPlan(rowId, { year: null, session: null });
    return redirect(`/plans/${planId}`, 303);
  }

  const yearNum = Number(yearRaw);
  const sessionValid = (SESSION_ORDER as readonly string[]).includes(sessionRaw);

  if (!Number.isInteger(yearNum) || yearNum < 1 || !sessionValid) {
    return redirect(`/plans/${planId}?error=invalid`, 303);
  }

  placeCourseInPlan(rowId, { year: yearNum, session: sessionRaw as Session });
  return redirect(`/plans/${planId}`, 303);
};
