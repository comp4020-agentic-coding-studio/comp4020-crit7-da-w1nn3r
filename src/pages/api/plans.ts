import type { APIRoute } from "astro";
import { createPlan, getDegree, listRequirementYears, listSpecialisationsForDegree } from "../../lib/queries";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const label = String(form.get("label") ?? "").trim();
  const degreeId = Number(form.get("degreeId"));
  const enrollmentYear = Number(form.get("enrollmentYear"));
  const specialisationIdRaw = String(form.get("specialisationId") ?? "");
  const specialisationId = specialisationIdRaw ? Number(specialisationIdRaw) : null;

  const degree = getDegree(degreeId);
  if (!label || !degree || !Number.isInteger(enrollmentYear)) {
    return new Response("Invalid plan details", { status: 400 });
  }
  if (!listRequirementYears(degreeId).includes(enrollmentYear)) {
    return new Response("That degree has no requirements locked in for that enrolment year", {
      status: 400,
    });
  }
  if (specialisationId !== null) {
    const belongsToDegree = listSpecialisationsForDegree(degreeId).some(
      (specialisation) => specialisation.id === specialisationId,
    );
    if (!belongsToDegree) {
      return new Response("That specialisation doesn't belong to the chosen degree", { status: 400 });
    }
  }

  const plan = createPlan({ label, degreeId, enrollmentYear, specialisationId });
  return redirect(`/plans/${plan.id}`, 303);
};
