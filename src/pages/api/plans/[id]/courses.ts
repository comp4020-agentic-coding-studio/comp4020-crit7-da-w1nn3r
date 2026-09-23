import type { APIRoute } from "astro";
import { addCourseToPlan, getCourse, getPlan, listPlanCourses } from "../../../../lib/queries";
import { SESSION_ORDER, type Session } from "../../../../lib/schema";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const planId = Number(params.id);
  const plan = getPlan(planId);
  if (!plan) return new Response("Plan not found", { status: 404 });

  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  const yearRaw = String(form.get("year") ?? "").trim();
  const sessionRaw = String(form.get("session") ?? "").trim();

  const course = getCourse(courseId);
  if (!course || course.retired) {
    return redirect(`/plans/${planId}?error=invalid`, 303);
  }

  const alreadyPlanned = listPlanCourses(planId).some((row) => row.courseId === courseId);
  if (alreadyPlanned) {
    return redirect(`/plans/${planId}?error=duplicate`, 303);
  }

  // Both blank: stage it, unplaced. Otherwise both must be a valid slot —
  // matches the drag-and-drop "place" endpoint's own validation.
  let year: number | null = null;
  let session: Session | null = null;
  if (yearRaw !== "" || sessionRaw !== "") {
    const yearNum = Number(yearRaw);
    const sessionValid = (SESSION_ORDER as readonly string[]).includes(sessionRaw);
    if (!Number.isInteger(yearNum) || yearNum < 1 || !sessionValid) {
      return redirect(`/plans/${planId}?error=invalid`, 303);
    }
    year = yearNum;
    session = sessionRaw as Session;
  }

  addCourseToPlan({ planId, courseId, year, session });
  return redirect(`/plans/${planId}`, 303);
};
