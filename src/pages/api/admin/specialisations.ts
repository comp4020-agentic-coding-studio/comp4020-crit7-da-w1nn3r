import type { APIRoute } from "astro";
import { parseSpecialisationInput } from "../../../lib/adminForms";
import { createSpecialisation, getDegree } from "../../../lib/queries";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const degreeId = Number(form.get("degreeId"));
  const values = parseSpecialisationInput(form);
  const degree = Number.isInteger(degreeId) ? getDegree(degreeId) : undefined;
  if (!values || !degree) {
    return redirect("/admin/specialisations/new?error=invalid", 303);
  }
  const specialisation = createSpecialisation({ ...values, degreeId });
  return redirect(`/admin/specialisations/${specialisation.id}`, 303);
};
