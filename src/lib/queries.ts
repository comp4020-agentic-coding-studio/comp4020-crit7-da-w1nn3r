import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  type Degree,
  type Plan,
  type Specialisation,
  degreeRequirementSets,
  degrees,
  plans,
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
