import type { APIRoute } from "astro";
import { removeDegreeRequirementItem } from "../../../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, redirect }) => {
  const degreeId = Number(params.id);
  const setId = Number(params.setId);
  const itemId = Number(params.itemId);
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid request", { status: 400 });
  }
  removeDegreeRequirementItem(itemId);
  return redirect(`/admin/degrees/${degreeId}/sets/${setId}`, 303);
};
