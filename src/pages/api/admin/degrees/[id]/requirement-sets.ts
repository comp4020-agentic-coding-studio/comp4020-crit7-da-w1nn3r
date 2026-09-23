import type { APIRoute } from "astro";
import { createDegreeRequirementSet, getDegree, listDegreeRequirementSets } from "../../../../../lib/queries";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const degreeId = Number(params.id);
  const degree = Number.isInteger(degreeId) ? getDegree(degreeId) : undefined;
  if (!degree) {
    return new Response("Degree not found", { status: 404 });
  }

  const form = await request.formData();
  const year = Number(form.get("year"));
  if (!Number.isInteger(year)) {
    return redirect(`/admin/degrees/${degreeId}?error=invalid`, 303);
  }
  if (listDegreeRequirementSets(degreeId).some((set) => set.year === year)) {
    return redirect(`/admin/degrees/${degreeId}?error=duplicate-year`, 303);
  }
  createDegreeRequirementSet(degreeId, year);
  return redirect(`/admin/degrees/${degreeId}`, 303);
};
