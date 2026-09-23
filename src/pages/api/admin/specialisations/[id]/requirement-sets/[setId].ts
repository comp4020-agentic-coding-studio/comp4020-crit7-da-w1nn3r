import type { APIRoute } from "astro";
import { getSpecialisationRequirementSet, removeSpecialisationRequirementSet } from "../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, redirect }) => {
  const specialisationId = Number(params.id);
  const setId = Number(params.setId);
  const set = Number.isInteger(setId) ? getSpecialisationRequirementSet(setId) : undefined;
  if (!set || set.specialisationId !== specialisationId) {
    return new Response("Requirement set not found", { status: 404 });
  }
  removeSpecialisationRequirementSet(setId);
  return redirect(`/admin/specialisations/${specialisationId}`, 303);
};
