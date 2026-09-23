import type { CourseInput } from "./queries";
import type { SpecialisationKind } from "./schema";
import { SPECIALISATION_KINDS } from "./schema";

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

export type DegreeInput = { code: string; title: string };

export function parseDegreeInput(form: FormData): DegreeInput | null {
  const code = String(form.get("code") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  if (!code || !title) return null;
  return { code, title };
}

export type SpecialisationInput = { code: string; title: string; kind: SpecialisationKind };

export function parseSpecialisationInput(form: FormData): SpecialisationInput | null {
  const code = String(form.get("code") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  if (!code || !title || !SPECIALISATION_KINDS.includes(kind as SpecialisationKind)) return null;
  return { code, title, kind: kind as SpecialisationKind };
}

export type RequirementItemInput =
  | { kind: "required"; courseId: number }
  | { kind: "elective_pool"; poolLabel: string; poolMinCount: number; courseIds: number[] };

export function parseRequirementItemInput(form: FormData): RequirementItemInput | null {
  const kind = String(form.get("kind") ?? "");
  if (kind === "required") {
    const courseId = Number(form.get("courseId"));
    if (!Number.isInteger(courseId)) return null;
    return { kind: "required", courseId };
  }
  if (kind === "elective_pool") {
    const poolLabel = String(form.get("poolLabel") ?? "").trim();
    const poolMinCount = Number(form.get("poolMinCount"));
    const courseIds = form
      .getAll("courseIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    if (!poolLabel || !Number.isInteger(poolMinCount) || poolMinCount < 1 || courseIds.length === 0) return null;
    return { kind: "elective_pool", poolLabel, poolMinCount, courseIds };
  }
  return null;
}
