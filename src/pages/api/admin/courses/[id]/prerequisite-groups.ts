import type { APIRoute } from "astro";
import { addPrerequisiteGroup, getCourse } from "../../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const courseId = Number(params.id);
  const course = Number.isInteger(courseId) ? getCourse(courseId) : undefined;
  if (!course) {
    return new Response("Course not found", { status: 404 });
  }

  const form = await request.formData();
  const optionCourseIds = form
    .getAll("options")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  if (optionCourseIds.length === 0) {
    return redirect(`/admin/courses/${courseId}?error=empty-group`, 303);
  }
  addPrerequisiteGroup(courseId, optionCourseIds);
  return redirect(`/admin/courses/${courseId}`, 303);
};
