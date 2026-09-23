import type { CourseInput } from "./queries";

export function parseCourseInput(form: FormData): CourseInput | null {
  const code = String(form.get("code") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const creditPoints = Number(form.get("creditPoints"));
  const sessionsRequired = Number(form.get("sessionsRequired"));
  const permissionRequired = form.get("permissionRequired") != null;
  const retired = form.get("retired") != null;
  const supersededRaw = String(form.get("supersededByCourseId") ?? "");
  const supersededByCourseId = supersededRaw ? Number(supersededRaw) : null;

  if (!code || !title || !Number.isInteger(creditPoints) || !Number.isInteger(sessionsRequired)) {
    return null;
  }
  if (supersededByCourseId !== null && !Number.isInteger(supersededByCourseId)) {
    return null;
  }
  return { code, title, creditPoints, sessionsRequired, permissionRequired, retired, supersededByCourseId };
}
