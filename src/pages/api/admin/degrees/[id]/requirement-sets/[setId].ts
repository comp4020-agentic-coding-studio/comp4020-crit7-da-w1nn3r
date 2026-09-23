import type { APIRoute } from "astro";
import { getDegreeRequirementSet, removeDegreeRequirementSet } from "../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, redirect }) => {
  const degreeId = Number(params.id);
  const setId = Number(params.setId);
  const set = Number.isInteger(setId) ? getDegreeRequirementSet(setId) : undefined;
  if (!set || set.degreeId !== degreeId) {
    return new Response("Requirement set not found", { status: 404 });
  }
  removeDegreeRequirementSet(setId);
  return redirect(`/admin/degrees/${degreeId}`, 303);
};
