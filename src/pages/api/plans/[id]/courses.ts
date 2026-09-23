import type { APIRoute } from "astro";
import { addCourseToPlan, getCourse, getPlan, listPlanCourses } from "../../../../lib/queries";
import { SESSION_ORDER, type Session } from "../../../../lib/schema";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const planId = Number(params.id);
  const plan = getPlan(planId);
  if (!plan) return new Response("Plan not found", { status: 404 });

  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  const year = Number(form.get("year"));
  const session = String(form.get("session") ?? "");

  const course = getCourse(courseId);
  const sessionValid = (SESSION_ORDER as readonly string[]).includes(session);
  if (!course || course.retired || !Number.isInteger(year) || year < 1 || !sessionValid) {
    return redirect(`/plans/${planId}?error=invalid`, 303);
  }

  const alreadyPlanned = listPlanCourses(planId).some((row) => row.courseId === courseId);
  if (alreadyPlanned) {
    return redirect(`/plans/${planId}?error=duplicate`, 303);
  }

  addCourseToPlan({ planId, courseId, year, session: session as Session });
  return redirect(`/plans/${planId}`, 303);
};
