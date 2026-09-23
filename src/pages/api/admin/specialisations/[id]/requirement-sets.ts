import type { APIRoute } from "astro";
import {
  createSpecialisationRequirementSet,
  getSpecialisation,
  listSpecialisationRequirementSets,
} from "../../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const specialisationId = Number(params.id);
  const specialisation = Number.isInteger(specialisationId) ? getSpecialisation(specialisationId) : undefined;
  if (!specialisation) {
    return new Response("Specialisation not found", { status: 404 });
  }

  const form = await request.formData();
  const year = Number(form.get("year"));
  if (!Number.isInteger(year)) {
    return redirect(`/admin/specialisations/${specialisationId}?error=invalid`, 303);
  }
  if (listSpecialisationRequirementSets(specialisationId).some((set) => set.year === year)) {
    return redirect(`/admin/specialisations/${specialisationId}?error=duplicate-year`, 303);
  }
  createSpecialisationRequirementSet(specialisationId, year);
  return redirect(`/admin/specialisations/${specialisationId}`, 303);
};
