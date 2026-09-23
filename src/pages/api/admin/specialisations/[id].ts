import type { APIRoute } from "astro";
import { parseSpecialisationInput } from "../../../../lib/adminForms";
import { getSpecialisation, updateSpecialisation } from "../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  const specialisation = Number.isInteger(id) ? getSpecialisation(id) : undefined;
  if (!specialisation) {
    return new Response("Specialisation not found", { status: 404 });
  }

  const form = await request.formData();
  const values = parseSpecialisationInput(form);
  if (!values) {
    return redirect(`/admin/specialisations/${id}?error=invalid`, 303);
  }
  updateSpecialisation(id, values);
  return redirect(`/admin/specialisations/${id}`, 303);
};
