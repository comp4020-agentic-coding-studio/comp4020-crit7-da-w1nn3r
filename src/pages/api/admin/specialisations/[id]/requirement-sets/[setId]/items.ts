import type { APIRoute } from "astro";
import { parseRequirementItemInput } from "../../../../../../../lib/adminForms";
import {
  addSpecialisationElectivePoolItem,
  addSpecialisationRequiredItem,
  getSpecialisationRequirementSet,
} from "../../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const specialisationId = Number(params.id);
  const setId = Number(params.setId);
  const set = Number.isInteger(setId) ? getSpecialisationRequirementSet(setId) : undefined;
  if (!set || set.specialisationId !== specialisationId) {
    return new Response("Requirement set not found", { status: 404 });
  }

  const form = await request.formData();
  const input = parseRequirementItemInput(form);
  if (!input) {
    return redirect(`/admin/specialisations/${specialisationId}/sets/${setId}?error=invalid`, 303);
  }
  if (input.kind === "required") {
    addSpecialisationRequiredItem(setId, input.courseId);
  } else {
    addSpecialisationElectivePoolItem(setId, input.poolLabel, input.poolMinCount, input.courseIds);
  }
  return redirect(`/admin/specialisations/${specialisationId}/sets/${setId}`, 303);
};
