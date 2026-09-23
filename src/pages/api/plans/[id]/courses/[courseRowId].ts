import type { APIRoute } from "astro";
import { getOwnedPlanCourseRow, removeCourseFromPlan } from "../../../../../lib/queries";

// A plain <form> can only POST, so the browser's "remove" button uses this.
export const POST: APIRoute = async ({ params, redirect }) => {
  const planId = Number(params.id);
  const rowId = Number(params.courseRowId);
  const row = getOwnedPlanCourseRow(planId, rowId);
  if (!row) return new Response("Not found", { status: 404 });

  removeCourseFromPlan(rowId);
  return redirect(`/plans/${planId}`, 303);
};

// The REST-shaped verb, for programmatic callers (e.g. spec tests).
export const DELETE: APIRoute = async ({ params }) => {
  const planId = Number(params.id);
  const rowId = Number(params.courseRowId);
  const row = getOwnedPlanCourseRow(planId, rowId);
  if (!row) return new Response("Not found", { status: 404 });

  removeCourseFromPlan(rowId);
  return new Response(null, { status: 204 });
};
