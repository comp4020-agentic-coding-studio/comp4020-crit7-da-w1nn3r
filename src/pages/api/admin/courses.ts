import type { APIRoute } from "astro";
import { parseCourseInput } from "../../../lib/adminForms";
import { createCourse } from "../../../lib/queries";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const values = parseCourseInput(form);
  if (!values) {
    return redirect("/admin/courses/new?error=invalid", 303);
  }
  const course = createCourse(values);
  return redirect(`/admin/courses/${course.id}`, 303);
};
