import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
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

// A small illustrative catalog, not a real ANU program — just enough to
// exercise every warning the planner has to raise: a compulsory course
// (CODE1000), an AND/OR prerequisite (CODE2010), a permission-coded course
// (CODE2020), a multi-session course (CODE3030), and a retired course
// superseded by another (CODE1999 -> CODE1000). Runs once, at boot, only
// when the courses table is empty — an admin who edits or deletes seed rows
// stays edited; this never resets their catalog back.
export function seedIfEmpty(db: BetterSQLite3Database): void {
  const existing = db.select({ id: courses.id }).from(courses).limit(1).all();
  if (existing.length > 0) return;

  const insertCourse = (values: {
    code: string;
    title: string;
    creditPoints?: number;
    sessionsRequired?: number;
    permissionRequired?: boolean;
    retired?: boolean;
    supersededByCourseId?: number;
  }) => db.insert(courses).values(values).returning({ id: courses.id }).get().id;

  const code1000 = insertCourse({ code: "CODE1000", title: "Introduction to Programming" });
  const code1999 = insertCourse({
    code: "CODE1999",
    title: "Programming Fundamentals",
    retired: true,
    supersededByCourseId: code1000,
  });
  const math1005 = insertCourse({ code: "MATH1005", title: "Discrete Mathematics for Computing" });
  const code1010 = insertCourse({ code: "CODE1010", title: "Data Structures and Algorithms" });
  const code2010 = insertCourse({ code: "CODE2010", title: "Databases and Persistence" });
  const code2020 = insertCourse({
    code: "CODE2020",
    title: "Systems Programming",
    permissionRequired: true,
  });
  const code3030 = insertCourse({
    code: "CODE3030",
    title: "Capstone Project",
    sessionsRequired: 2,
  });
  const webx210 = insertCourse({ code: "WEBX210", title: "Web Application Development" });
  const mobi220 = insertCourse({ code: "MOBI220", title: "Mobile App Development" });
  const game230 = insertCourse({ code: "GAME230", title: "Game Programming" });

  // Prerequisite groups are CNF: every group needs at least one satisfied option.
  const addPrereq = (courseId: number, ...groups: number[][]) => {
    for (const options of groups) {
      const group = db
        .insert(prerequisiteGroups)
        .values({ courseId })
        .returning({ id: prerequisiteGroups.id })
        .get();
      db.insert(prerequisiteGroupOptions)
        .values(options.map((prerequisiteCourseId) => ({ groupId: group.id, prerequisiteCourseId })))
        .run();
    }
  };

  addPrereq(code1010, [code1000]);
  // CODE2010 needs CODE1010, AND (CODE1000 or MATH1005) — the AND/OR case.
  addPrereq(code2010, [code1010], [code1000, math1005]);
  addPrereq(code2020, [code1010]);
  addPrereq(code3030, [code2010]);
  addPrereq(mobi220, [code1010]);
  addPrereq(game230, [code1010]);

  const degree = db
    .insert(degrees)
    .values({ code: "BSOFT", title: "Bachelor of Software Systems" })
    .returning({ id: degrees.id })
    .get();

  const requirementSet = db
    .insert(degreeRequirementSets)
    .values({ degreeId: degree.id, year: 2026 })
    .returning({ id: degreeRequirementSets.id })
    .get();

  for (const courseId of [code1000, code1010, code2010, code3030]) {
    db.insert(degreeRequirementItems)
      .values({ requirementSetId: requirementSet.id, kind: "required", courseId })
      .run();
  }

  const electivePool = db
    .insert(degreeRequirementItems)
    .values({
      requirementSetId: requirementSet.id,
      kind: "elective_pool",
      poolLabel: "Software electives",
      poolMinCount: 2,
    })
    .returning({ id: degreeRequirementItems.id })
    .get();
  db.insert(degreeRequirementPoolCourses)
    .values(
      [webx210, mobi220, game230, code2020].map((courseId) => ({
        requirementItemId: electivePool.id,
        courseId,
      })),
    )
    .run();

  const webSpecialisation = db
    .insert(specialisations)
    .values({ degreeId: degree.id, code: "WEBSYS", title: "Web Systems", kind: "specialisation" })
    .returning({ id: specialisations.id })
    .get();
  const webRequirementSet = db
    .insert(specialisationRequirementSets)
    .values({ specialisationId: webSpecialisation.id, year: 2026 })
    .returning({ id: specialisationRequirementSets.id })
    .get();
  db.insert(specialisationRequirementItems)
    .values({ requirementSetId: webRequirementSet.id, kind: "required", courseId: webx210 })
    .run();
  const webPool = db
    .insert(specialisationRequirementItems)
    .values({
      requirementSetId: webRequirementSet.id,
      kind: "elective_pool",
      poolLabel: "Web depth",
      poolMinCount: 1,
    })
    .returning({ id: specialisationRequirementItems.id })
    .get();
  db.insert(specialisationRequirementPoolCourses)
    .values([mobi220, game230].map((courseId) => ({ requirementItemId: webPool.id, courseId })))
    .run();

  const dataMajor = db
    .insert(specialisations)
    .values({ degreeId: degree.id, code: "DATASYS", title: "Data Systems", kind: "major" })
    .returning({ id: specialisations.id })
    .get();
  const dataRequirementSet = db
    .insert(specialisationRequirementSets)
    .values({ specialisationId: dataMajor.id, year: 2026 })
    .returning({ id: specialisationRequirementSets.id })
    .get();
  db.insert(specialisationRequirementItems)
    .values(
      [code2010, math1005].map((courseId) => ({
        requirementSetId: dataRequirementSet.id,
        kind: "required" as const,
        courseId,
      })),
    )
    .run();

  // A demo plan (lands as id 1 in a fresh database) that leaves compulsory
  // courses missing and touches every warning, so both the invariants suite
  // (spec/routes.ts) and a first-time visitor have something real to look at.
  const demoPlan = db
    .insert(plans)
    .values({
      label: "Demo plan — Alex",
      degreeId: degree.id,
      enrollmentYear: 2026,
      specialisationId: webSpecialisation.id,
    })
    .returning({ id: plans.id })
    .get();

  db.insert(planCourses)
    .values([
      { planId: demoPlan.id, courseId: code1000, year: 1, session: "s1" },
      // Retired, superseded by CODE1000 — as if planned before it was retired.
      { planId: demoPlan.id, courseId: code1999, year: 1, session: "s1" },
      // Permission-coded, and its prerequisite (CODE1010) isn't in the plan yet.
      { planId: demoPlan.id, courseId: code2020, year: 2, session: "s1" },
      // Multi-session, and its prerequisite (CODE2010) isn't in the plan yet.
      { planId: demoPlan.id, courseId: code3030, year: 3, session: "s1" },
    ])
    .run();
}
