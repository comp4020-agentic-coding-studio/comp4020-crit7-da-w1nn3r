import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  type Course,
  type Degree,
  type Plan,
  type PlanCourse,
  type Session,
  type Specialisation,
  courses,
  degreeRequirementItems,
  degreeRequirementPoolCourses,
  degreeRequirementSets,
  degrees,
  planCourses,
  plans,
  prerequisiteGroupOptions,
  prerequisiteGroups,
  specialisationRequirementItems,
  specialisationRequirementPoolCourses,
  specialisationRequirementSets,
  specialisations,
} from "./schema";

export function listDegrees(): Degree[] {
  return db.select().from(degrees).orderBy(asc(degrees.title)).all();
}

export function getDegree(id: number): Degree | undefined {
  return db.select().from(degrees).where(eq(degrees.id, id)).get();
}

/** Years this degree has a locked requirement set for, newest first. */
export function listRequirementYears(degreeId: number): number[] {
  return db
    .select({ year: degreeRequirementSets.year })
    .from(degreeRequirementSets)
    .where(eq(degreeRequirementSets.degreeId, degreeId))
    .orderBy(desc(degreeRequirementSets.year))
    .all()
    .map((row) => row.year);
}

export function listSpecialisationsForDegree(degreeId: number): Specialisation[] {
  return db
    .select()
    .from(specialisations)
    .where(eq(specialisations.degreeId, degreeId))
    .orderBy(asc(specialisations.title))
    .all();
}

export function getSpecialisation(id: number): Specialisation | undefined {
  return db.select().from(specialisations).where(eq(specialisations.id, id)).get();
}

export type PlanSummary = Plan & { degreeTitle: string; specialisationTitle: string | null };

export function listPlans(): PlanSummary[] {
  return db
    .select({
      id: plans.id,
      label: plans.label,
      degreeId: plans.degreeId,
      enrollmentYear: plans.enrollmentYear,
      specialisationId: plans.specialisationId,
      createdAt: plans.createdAt,
      degreeTitle: degrees.title,
      specialisationTitle: specialisations.title,
    })
    .from(plans)
    .innerJoin(degrees, eq(plans.degreeId, degrees.id))
    .leftJoin(specialisations, eq(plans.specialisationId, specialisations.id))
    .orderBy(desc(plans.createdAt))
    .all();
}

export function getPlan(id: number): Plan | undefined {
  return db.select().from(plans).where(eq(plans.id, id)).get();
}

export function createPlan(values: {
  label: string;
  degreeId: number;
  enrollmentYear: number;
  specialisationId: number | null;
}): Plan {
  return db.insert(plans).values(values).returning().get();
}

export type PlanDetail = Plan & { degree: Degree; specialisation: Specialisation | null };

export function getPlanDetail(id: number): PlanDetail | undefined {
  const plan = getPlan(id);
  if (!plan) return undefined;
  const degree = getDegree(plan.degreeId);
  if (!degree) return undefined;
  const specialisation = plan.specialisationId ? (getSpecialisation(plan.specialisationId) ?? null) : null;
  return { ...plan, degree, specialisation };
}

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(asc(courses.code)).all();
}

export function getCourse(id: number): Course | undefined {
  return db.select().from(courses).where(eq(courses.id, id)).get();
}

export type PlanCourseDetail = PlanCourse & { course: Course };

/** Every course placed in a plan, across every year and session. */
export function listPlanCourses(planId: number): PlanCourseDetail[] {
  return db
    .select({
      id: planCourses.id,
      planId: planCourses.planId,
      courseId: planCourses.courseId,
      year: planCourses.year,
      session: planCourses.session,
      createdAt: planCourses.createdAt,
      course: courses,
    })
    .from(planCourses)
    .innerJoin(courses, eq(planCourses.courseId, courses.id))
    .where(eq(planCourses.planId, planId))
    .all();
}

export function getPlanCourseRow(id: number): PlanCourse | undefined {
  return db.select().from(planCourses).where(eq(planCourses.id, id)).get();
}

export function addCourseToPlan(values: {
  planId: number;
  courseId: number;
  year: number;
  session: Session;
}): PlanCourse {
  return db.insert(planCourses).values(values).returning().get();
}

export function removeCourseFromPlan(id: number): void {
  db.delete(planCourses).where(eq(planCourses.id, id)).run();
}

export type RequirementItem =
  | { kind: "required"; courseId: number }
  | { kind: "elective_pool"; poolLabel: string; poolMinCount: number; courseIds: number[] };

/** The requirement set locked in for a degree at a given enrolment year, if any. */
export function getDegreeRequirements(degreeId: number, year: number): RequirementItem[] {
  const set = db
    .select()
    .from(degreeRequirementSets)
    .where(and(eq(degreeRequirementSets.degreeId, degreeId), eq(degreeRequirementSets.year, year)))
    .get();
  if (!set) return [];

  const items = db
    .select()
    .from(degreeRequirementItems)
    .where(eq(degreeRequirementItems.requirementSetId, set.id))
    .all();

  return items.map((item): RequirementItem => {
    if (item.kind === "required") {
      return { kind: "required", courseId: item.courseId! };
    }
    const courseIds = db
      .select({ courseId: degreeRequirementPoolCourses.courseId })
      .from(degreeRequirementPoolCourses)
      .where(eq(degreeRequirementPoolCourses.requirementItemId, item.id))
      .all()
      .map((row) => row.courseId);
    return { kind: "elective_pool", poolLabel: item.poolLabel!, poolMinCount: item.poolMinCount!, courseIds };
  });
}

/** Same shape as getDegreeRequirements, for a specialisation locked in at that year. */
export function getSpecialisationRequirements(specialisationId: number, year: number): RequirementItem[] {
  const set = db
    .select()
    .from(specialisationRequirementSets)
    .where(
      and(
        eq(specialisationRequirementSets.specialisationId, specialisationId),
        eq(specialisationRequirementSets.year, year),
      ),
    )
    .get();
  if (!set) return [];

  const items = db
    .select()
    .from(specialisationRequirementItems)
    .where(eq(specialisationRequirementItems.requirementSetId, set.id))
    .all();

  return items.map((item): RequirementItem => {
    if (item.kind === "required") {
      return { kind: "required", courseId: item.courseId! };
    }
    const courseIds = db
      .select({ courseId: specialisationRequirementPoolCourses.courseId })
      .from(specialisationRequirementPoolCourses)
      .where(eq(specialisationRequirementPoolCourses.requirementItemId, item.id))
      .all()
      .map((row) => row.courseId);
    return { kind: "elective_pool", poolLabel: item.poolLabel!, poolMinCount: item.poolMinCount!, courseIds };
  });
}

export type PrerequisiteGroupDetail = { id: number; options: number[] };

/** CNF prerequisite groups for a course: every group needs one satisfied option. */
export function getPrerequisiteGroups(courseId: number): PrerequisiteGroupDetail[] {
  const groups = db.select().from(prerequisiteGroups).where(eq(prerequisiteGroups.courseId, courseId)).all();
  return groups.map((group) => ({
    id: group.id,
    options: db
      .select({ courseId: prerequisiteGroupOptions.prerequisiteCourseId })
      .from(prerequisiteGroupOptions)
      .where(eq(prerequisiteGroupOptions.groupId, group.id))
      .all()
      .map((row) => row.courseId),
  }));
}
