import type { APIRoute } from "astro";
import { parseDegreeInput } from "../../../../lib/adminForms";
import { getDegree, updateDegree } from "../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  const degree = Number.isInteger(id) ? getDegree(id) : undefined;
  if (!degree) {
    return new Response("Degree not found", { status: 404 });
  }

  const form = await request.formData();
  const values = parseDegreeInput(form);
  if (!values) {
    return redirect(`/admin/degrees/${id}?error=invalid`, 303);
  }
  updateDegree(id, values);
  return redirect(`/admin/degrees/${id}`, 303);
};
