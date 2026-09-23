import type { APIRoute } from "astro";
import { parseRequirementItemInput } from "../../../../../../../lib/adminForms";
import { addDegreeElectivePoolItem, addDegreeRequiredItem, getDegreeRequirementSet } from "../../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const degreeId = Number(params.id);
  const setId = Number(params.setId);
  const set = Number.isInteger(setId) ? getDegreeRequirementSet(setId) : undefined;
  if (!set || set.degreeId !== degreeId) {
    return new Response("Requirement set not found", { status: 404 });
  }

  const form = await request.formData();
  const input = parseRequirementItemInput(form);
  if (!input) {
    return redirect(`/admin/degrees/${degreeId}/sets/${setId}?error=invalid`, 303);
  }
  if (input.kind === "required") {
    addDegreeRequiredItem(setId, input.courseId);
  } else {
    addDegreeElectivePoolItem(setId, input.poolLabel, input.poolMinCount, input.courseIds);
  }
  return redirect(`/admin/degrees/${degreeId}/sets/${setId}`, 303);
};
