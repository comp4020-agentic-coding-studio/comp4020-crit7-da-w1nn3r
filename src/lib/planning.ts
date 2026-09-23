import {
  getCourse,
  getDegreeRequirements,
  getPrerequisiteGroups,
  getSpecialisationRequirements,
  type PlanCourseDetail,
  type RequirementItem,
} from "./queries";
import { SESSION_ORDER, type Course, type Plan, type Session } from "./schema";

// ANU runs primarily on Semester 1 and 2 — a typical full-time load there is
// 4 courses, versus 1 in the smaller sessions (Summer/Autumn/Winter/Spring
// don't all run every course). Purely a guide shown in the UI: nothing here
// is enforced, same as every other check in this file.
export const RECOMMENDED_COURSE_LOAD: Record<Session, number> = {
  summer: 1,
  s1: 4,
  autumn: 1,
  winter: 1,
  s2: 4,
  spring: 1,
};

export type MissingCompulsory =
  | { kind: "required"; courseId: number }
  | { kind: "elective_pool"; poolLabel: string; poolMinCount: number; plannedCount: number; courseIds: number[] };

/**
 * Compulsory courses and under-filled elective pools — from the degree, and
 * from the specialisation if one's chosen — that this plan hasn't met yet.
 * Never blocks anything; it's a checklist, not a gate.
 */
export function missingCompulsory(plan: Plan, plannedCourses: PlanCourseDetail[]): MissingCompulsory[] {
  const plannedCourseIds = new Set(plannedCourses.map((row) => row.courseId));
  const requirements: RequirementItem[] = [
    ...getDegreeRequirements(plan.degreeId, plan.enrollmentYear),
    ...(plan.specialisationId ? getSpecialisationRequirements(plan.specialisationId, plan.enrollmentYear) : []),
  ];

  const missing: MissingCompulsory[] = [];
  for (const requirement of requirements) {
    if (requirement.kind === "required") {
      if (!plannedCourseIds.has(requirement.courseId)) {
        missing.push(requirement);
      }
      continue;
    }
    const plannedCount = requirement.courseIds.filter((courseId) => plannedCourseIds.has(courseId)).length;
    if (plannedCount < requirement.poolMinCount) {
      missing.push({ ...requirement, plannedCount });
    }
  }
  return missing;
}

function sessionRank(year: number, session: Session): number {
  return year * SESSION_ORDER.length + SESSION_ORDER.indexOf(session);
}

/**
 * Prerequisite groups (CNF) for this planned course that nothing planned
 * strictly earlier satisfies. Order isn't enforced — this only informs.
 */
export function unmetPrerequisites(planCourse: PlanCourseDetail, plannedCourses: PlanCourseDetail[]): number[][] {
  const groups = getPrerequisiteGroups(planCourse.courseId);
  if (groups.length === 0) return [];
  // Staged (not yet dragged into a session) — no ordering context to check yet.
  if (planCourse.year == null || planCourse.session == null) return [];

  const thisRank = sessionRank(planCourse.year, planCourse.session);
  const earlierCourseIds = new Set(
    plannedCourses
      .filter((row): row is PlanCourseDetail & { year: number; session: Session } => row.year != null && row.session != null)
      .filter((row) => sessionRank(row.year, row.session) < thisRank)
      .map((row) => row.courseId),
  );

  return groups
    .filter((group) => !group.options.some((courseId) => earlierCourseIds.has(courseId)))
    .map((group) => group.options);
}

export type CourseWarning =
  | { kind: "permission_required" }
  | { kind: "multi_session"; sessionsRequired: number }
  | { kind: "superseded"; byCourse: Course }
  | { kind: "unmet_prerequisites"; groups: number[][] };

/** Every warning that applies to one course as placed in this plan. */
export function courseWarnings(planCourse: PlanCourseDetail, plannedCourses: PlanCourseDetail[]): CourseWarning[] {
  const { course } = planCourse;
  const warnings: CourseWarning[] = [];

  if (course.permissionRequired) {
    warnings.push({ kind: "permission_required" });
  }
  if (course.sessionsRequired > 1) {
    warnings.push({ kind: "multi_session", sessionsRequired: course.sessionsRequired });
  }
  if (course.retired && course.supersededByCourseId) {
    const byCourse = getCourse(course.supersededByCourseId);
    if (byCourse) warnings.push({ kind: "superseded", byCourse });
  }
  const unmetGroups = unmetPrerequisites(planCourse, plannedCourses);
  if (unmetGroups.length > 0) {
    warnings.push({ kind: "unmet_prerequisites", groups: unmetGroups });
  }
  return warnings;
}

/** Human-readable text for a warning; group option ids are resolved via courseById. */
export function describeWarning(warning: CourseWarning, courseById: Map<number, Course>): string {
  switch (warning.kind) {
    case "permission_required":
      return "Requires a permission code from the department.";
    case "multi_session":
      return `Runs over ${warning.sessionsRequired} consecutive sessions — only one session is shown here.`;
    case "superseded":
      return `This course code is retired — it's now ${warning.byCourse.code} (${warning.byCourse.title}).`;
    case "unmet_prerequisites": {
      const groupText = warning.groups
        .map((options) => options.map((courseId) => courseById.get(courseId)?.code ?? `#${courseId}`).join(" or "))
        .join("; and ");
      return `Prerequisite not planned earlier yet: needs ${groupText}.`;
    }
  }
}
