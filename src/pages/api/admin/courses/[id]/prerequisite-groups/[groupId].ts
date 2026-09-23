import type { APIRoute } from "astro";
import { removePrerequisiteGroup } from "../../../../../../lib/queries";

export const POST: APIRoute = async ({ params, redirect }) => {
  const courseId = Number(params.id);
  const groupId = Number(params.groupId);
  if (!Number.isInteger(courseId) || !Number.isInteger(groupId)) {
    return new Response("Invalid request", { status: 400 });
  }
  removePrerequisiteGroup(groupId);
  return redirect(`/admin/courses/${courseId}`, 303);
};
