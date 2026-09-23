import type { APIRoute } from "astro";
import { removeSpecialisationRequirementItem } from "../../../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, redirect }) => {
  const specialisationId = Number(params.id);
  const setId = Number(params.setId);
  const itemId = Number(params.itemId);
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid request", { status: 400 });
  }
  removeSpecialisationRequirementItem(itemId);
  return redirect(`/admin/specialisations/${specialisationId}/sets/${setId}`, 303);
};
