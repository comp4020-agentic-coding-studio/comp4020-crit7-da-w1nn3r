import type { APIRoute } from "astro";
import { parseCourseInput } from "../../../../lib/adminForms";
import { getCourse, updateCourse } from "../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  const course = Number.isInteger(id) ? getCourse(id) : undefined;
  if (!course) {
    return new Response("Course not found", { status: 404 });
  }

  const form = await request.formData();
  const values = parseCourseInput(form);
  if (!values) {
    return redirect(`/admin/courses/${id}?error=invalid`, 303);
  }
  updateCourse(id, values);
  return redirect(`/admin/courses/${id}`, 303);
};
