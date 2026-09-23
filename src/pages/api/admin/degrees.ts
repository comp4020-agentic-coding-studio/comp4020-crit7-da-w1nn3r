import type { APIRoute } from "astro";
import { parseDegreeInput } from "../../../lib/adminForms";
import { createDegree } from "../../../lib/queries";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const values = parseDegreeInput(form);
  if (!values) {
    return redirect("/admin/degrees/new?error=invalid", 303);
  }
  const degree = createDegree(values);
  return redirect(`/admin/degrees/${degree.id}`, 303);
};
