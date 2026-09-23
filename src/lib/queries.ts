import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  type Course,
  type Degree,
  type DegreeRequirementSet,
  type Plan,
  type PlanCourse,
  type Session,
  type Specialisation,
  type SpecialisationKind,
  type SpecialisationRequirementSet,
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

export type SpecialisationSummary = Specialisation & { degreeTitle: string };

export function listSpecialisations(): SpecialisationSummary[] {
  return db
    .select({
      id: specialisations.id,
      degreeId: specialisations.degreeId,
      code: specialisations.code,
      title: specialisations.title,
      kind: specialisations.kind,
      degreeTitle: degrees.title,
    })
    .from(specialisations)
    .innerJoin(degrees, eq(specialisations.degreeId, degrees.id))
    .orderBy(asc(specialisations.title))
    .all();
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

/** The row if it exists and belongs to this plan, otherwise undefined. */
export function getOwnedPlanCourseRow(planId: number, id: number): PlanCourse | undefined {
  return db
    .select()
    .from(planCourses)
    .where(and(eq(planCourses.id, id), eq(planCourses.planId, planId)))
    .get();
}

export function addCourseToPlan(values: {
  planId: number;
  courseId: number;
  year: number | null;
  session: Session | null;
}): PlanCourse {
  return db.insert(planCourses).values(values).returning().get();
}

/**
 * Moves a row to a year/session slot, or back to staged when both are null —
 * one shared code path for "place" and "unplace".
 */
export function placeCourseInPlan(
  id: number,
  values: { year: number | null; session: Session | null },
): void {
  db.update(planCourses).set(values).where(eq(planCourses.id, id)).run();
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

// --- Admin: catalog CRUD -----------------------------------------------

export type CourseInput = {
  code: string;
  title: string;
  creditPoints: number;
  sessionsRequired: number;
  permissionRequired: boolean;
  retired: boolean;
  supersededByCourseId: number | null;
};

export function createCourse(values: CourseInput): Course {
  return db.insert(courses).values(values).returning().get();
}

export function updateCourse(id: number, values: CourseInput): Course | undefined {
  return db.update(courses).set(values).where(eq(courses.id, id)).returning().get();
}

/** Adds one CNF group ("this OR that") to a course's prerequisites. */
export function addPrerequisiteGroup(courseId: number, optionCourseIds: number[]): void {
  const group = db.insert(prerequisiteGroups).values({ courseId }).returning().get();
  for (const prerequisiteCourseId of optionCourseIds) {
    db.insert(prerequisiteGroupOptions).values({ groupId: group.id, prerequisiteCourseId }).run();
  }
}

export function removePrerequisiteGroup(groupId: number): void {
  db.delete(prerequisiteGroupOptions).where(eq(prerequisiteGroupOptions.groupId, groupId)).run();
  db.delete(prerequisiteGroups).where(eq(prerequisiteGroups.id, groupId)).run();
}

// --- Admin: degrees, specialisations, and their year-keyed requirements --

export function createDegree(values: { code: string; title: string }): Degree {
  return db.insert(degrees).values(values).returning().get();
}

export function updateDegree(id: number, values: { code: string; title: string }): Degree | undefined {
  return db.update(degrees).set(values).where(eq(degrees.id, id)).returning().get();
}

export function createSpecialisation(values: {
  degreeId: number;
  code: string;
  title: string;
  kind: SpecialisationKind;
}): Specialisation {
  return db.insert(specialisations).values(values).returning().get();
}

export function updateSpecialisation(
  id: number,
  values: { code: string; title: string; kind: SpecialisationKind },
): Specialisation | undefined {
  return db.update(specialisations).set(values).where(eq(specialisations.id, id)).returning().get();
}

export type RequirementItemDetail =
  | { id: number; kind: "required"; courseId: number }
  | { id: number; kind: "elective_pool"; poolLabel: string; poolMinCount: number; courseIds: number[] };

export function listDegreeRequirementSets(degreeId: number): DegreeRequirementSet[] {
  return db
    .select()
    .from(degreeRequirementSets)
    .where(eq(degreeRequirementSets.degreeId, degreeId))
    .orderBy(desc(degreeRequirementSets.year))
    .all();
}

export function getDegreeRequirementSet(setId: number): DegreeRequirementSet | undefined {
  return db.select().from(degreeRequirementSets).where(eq(degreeRequirementSets.id, setId)).get();
}

export function createDegreeRequirementSet(degreeId: number, year: number): DegreeRequirementSet {
  return db.insert(degreeRequirementSets).values({ degreeId, year }).returning().get();
}

export function removeDegreeRequirementSet(setId: number): void {
  const items = db
    .select({ id: degreeRequirementItems.id })
    .from(degreeRequirementItems)
    .where(eq(degreeRequirementItems.requirementSetId, setId))
    .all();
  for (const item of items) removeDegreeRequirementItem(item.id);
  db.delete(degreeRequirementSets).where(eq(degreeRequirementSets.id, setId)).run();
}

export function getDegreeRequirementSetItems(setId: number): RequirementItemDetail[] {
  const items = db
    .select()
    .from(degreeRequirementItems)
    .where(eq(degreeRequirementItems.requirementSetId, setId))
    .all();
  return items.map((item): RequirementItemDetail => {
    if (item.kind === "required") {
      return { id: item.id, kind: "required", courseId: item.courseId! };
    }
    const courseIds = db
      .select({ courseId: degreeRequirementPoolCourses.courseId })
      .from(degreeRequirementPoolCourses)
      .where(eq(degreeRequirementPoolCourses.requirementItemId, item.id))
      .all()
      .map((row) => row.courseId);
    return { id: item.id, kind: "elective_pool", poolLabel: item.poolLabel!, poolMinCount: item.poolMinCount!, courseIds };
  });
}

export function addDegreeRequiredItem(setId: number, courseId: number): void {
  db.insert(degreeRequirementItems).values({ requirementSetId: setId, kind: "required", courseId }).run();
}

export function addDegreeElectivePoolItem(
  setId: number,
  poolLabel: string,
  poolMinCount: number,
  courseIds: number[],
): void {
  const item = db
    .insert(degreeRequirementItems)
    .values({ requirementSetId: setId, kind: "elective_pool", poolLabel, poolMinCount })
    .returning()
    .get();
  for (const courseId of courseIds) {
    db.insert(degreeRequirementPoolCourses).values({ requirementItemId: item.id, courseId }).run();
  }
}

export function removeDegreeRequirementItem(itemId: number): void {
  db.delete(degreeRequirementPoolCourses).where(eq(degreeRequirementPoolCourses.requirementItemId, itemId)).run();
  db.delete(degreeRequirementItems).where(eq(degreeRequirementItems.id, itemId)).run();
}

export function listSpecialisationRequirementSets(specialisationId: number): SpecialisationRequirementSet[] {
  return db
    .select()
    .from(specialisationRequirementSets)
    .where(eq(specialisationRequirementSets.specialisationId, specialisationId))
    .orderBy(desc(specialisationRequirementSets.year))
    .all();
}

export function getSpecialisationRequirementSet(setId: number): SpecialisationRequirementSet | undefined {
  return db.select().from(specialisationRequirementSets).where(eq(specialisationRequirementSets.id, setId)).get();
}

export function createSpecialisationRequirementSet(
  specialisationId: number,
  year: number,
): SpecialisationRequirementSet {
  return db.insert(specialisationRequirementSets).values({ specialisationId, year }).returning().get();
}

export function removeSpecialisationRequirementSet(setId: number): void {
  const items = db
    .select({ id: specialisationRequirementItems.id })
    .from(specialisationRequirementItems)
    .where(eq(specialisationRequirementItems.requirementSetId, setId))
    .all();
  for (const item of items) removeSpecialisationRequirementItem(item.id);
  db.delete(specialisationRequirementSets).where(eq(specialisationRequirementSets.id, setId)).run();
}

export function getSpecialisationRequirementSetItems(setId: number): RequirementItemDetail[] {
  const items = db
    .select()
    .from(specialisationRequirementItems)
    .where(eq(specialisationRequirementItems.requirementSetId, setId))
    .all();
  return items.map((item): RequirementItemDetail => {
    if (item.kind === "required") {
      return { id: item.id, kind: "required", courseId: item.courseId! };
    }
    const courseIds = db
      .select({ courseId: specialisationRequirementPoolCourses.courseId })
      .from(specialisationRequirementPoolCourses)
      .where(eq(specialisationRequirementPoolCourses.requirementItemId, item.id))
      .all()
      .map((row) => row.courseId);
    return { id: item.id, kind: "elective_pool", poolLabel: item.poolLabel!, poolMinCount: item.poolMinCount!, courseIds };
  });
}

export function addSpecialisationRequiredItem(setId: number, courseId: number): void {
  db.insert(specialisationRequirementItems).values({ requirementSetId: setId, kind: "required", courseId }).run();
}

export function addSpecialisationElectivePoolItem(
  setId: number,
  poolLabel: string,
  poolMinCount: number,
  courseIds: number[],
): void {
  const item = db
    .insert(specialisationRequirementItems)
    .values({ requirementSetId: setId, kind: "elective_pool", poolLabel, poolMinCount })
    .returning()
    .get();
  for (const courseId of courseIds) {
    db.insert(specialisationRequirementPoolCourses).values({ requirementItemId: item.id, courseId }).run();
  }
}

export function removeSpecialisationRequirementItem(itemId: number): void {
  db.delete(specialisationRequirementPoolCourses)
    .where(eq(specialisationRequirementPoolCourses.requirementItemId, itemId))
    .run();
  db.delete(specialisationRequirementItems).where(eq(specialisationRequirementItems.id, itemId)).run();
}
