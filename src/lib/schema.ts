import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

export const SESSION_ORDER = ["summer", "s1", "autumn", "winter", "s2", "spring"] as const;
export type Session = (typeof SESSION_ORDER)[number];

export const SESSION_LABELS: Record<Session, string> = {
  summer: "Summer Session",
  s1: "Semester 1",
  autumn: "Autumn Session",
  winter: "Winter Session",
  s2: "Semester 2",
  spring: "Spring Session",
};

export const SPECIALISATION_KINDS = ["major", "minor", "specialisation"] as const;
export type SpecialisationKind = (typeof SPECIALISATION_KINDS)[number];

export const REQUIREMENT_KINDS = ["required", "elective_pool"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

// The course catalog. A retired course is never deleted — old plans still
// point at it — it just drops out of the "add a course" picker and, when a
// plan does reference it, shows supersededByCourseId's replacement instead.
export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull(),
  title: text().notNull(),
  creditPoints: int("credit_points").notNull().default(6),
  // How many consecutive teaching sessions this course runs over — 1 for
  // almost everything, 2+ triggers the multi-session warning.
  sessionsRequired: int("sessions_required").notNull().default(1),
  permissionRequired: int("permission_required", { mode: "boolean" }).notNull().default(false),
  // Empty/null means "offered every session"; otherwise a subset of SESSION_ORDER.
  offeredSessions: text("offered_sessions", { mode: "json" }).$type<Session[]>(),
  retired: int({ mode: "boolean" }).notNull().default(false),
  supersededByCourseId: int("superseded_by_course_id").references(
    (): AnySQLiteColumn => courses.id,
  ),
});

// Prerequisites in conjunctive-normal form: a course has N groups, and
// satisfying it means every group has at least one of its option courses
// planned earlier. Two singleton groups express "A and B"; one group with
// two options expresses "A or B". No general expression tree — this covers
// the shapes real prerequisite rules actually take.
export const prerequisiteGroups = sqliteTable("prerequisite_groups", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  note: text(),
});

export const prerequisiteGroupOptions = sqliteTable("prerequisite_group_options", {
  id: int().primaryKey({ autoIncrement: true }),
  groupId: int("group_id")
    .notNull()
    .references(() => prerequisiteGroups.id),
  prerequisiteCourseId: int("prerequisite_course_id")
    .notNull()
    .references(() => courses.id),
});

export const degrees = sqliteTable("degrees", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull(),
  title: text().notNull(),
});

// The compulsory/elective contract is locked in at enrolment, so it's keyed
// by year rather than edited in place — next year's changes get their own row.
export const degreeRequirementSets = sqliteTable(
  "degree_requirement_sets",
  {
    id: int().primaryKey({ autoIncrement: true }),
    degreeId: int("degree_id")
      .notNull()
      .references(() => degrees.id),
    year: int().notNull(),
  },
  (t) => [unique().on(t.degreeId, t.year)],
);

export const degreeRequirementItems = sqliteTable("degree_requirement_items", {
  id: int().primaryKey({ autoIncrement: true }),
  requirementSetId: int("requirement_set_id")
    .notNull()
    .references(() => degreeRequirementSets.id),
  kind: text().notNull().$type<RequirementKind>(),
  // set for kind = "required"
  courseId: int("course_id").references(() => courses.id),
  // set for kind = "elective_pool"
  poolLabel: text("pool_label"),
  poolMinCount: int("pool_min_count"),
});

export const degreeRequirementPoolCourses = sqliteTable("degree_requirement_pool_courses", {
  id: int().primaryKey({ autoIncrement: true }),
  requirementItemId: int("requirement_item_id")
    .notNull()
    .references(() => degreeRequirementItems.id),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
});

// A specialisation belongs to one degree — real ANU specialisations are
// sometimes shared across degrees, but scoping to one keeps the model small
// and is easy to widen later (drop the FK to a join table) if it matters.
export const specialisations = sqliteTable("specialisations", {
  id: int().primaryKey({ autoIncrement: true }),
  degreeId: int("degree_id")
    .notNull()
    .references(() => degrees.id),
  code: text().notNull(),
  title: text().notNull(),
  kind: text().notNull().$type<SpecialisationKind>(),
});

// Mirrors the degree requirement trio exactly. Not unified behind a
// polymorphic owner: SQLite/Drizzle has no clean polymorphic FK, and the
// type-tag indirection that would need costs more than the duplication
// saves for two owner kinds.
export const specialisationRequirementSets = sqliteTable(
  "specialisation_requirement_sets",
  {
    id: int().primaryKey({ autoIncrement: true }),
    specialisationId: int("specialisation_id")
      .notNull()
      .references(() => specialisations.id),
    year: int().notNull(),
  },
  (t) => [unique().on(t.specialisationId, t.year)],
);

export const specialisationRequirementItems = sqliteTable("specialisation_requirement_items", {
  id: int().primaryKey({ autoIncrement: true }),
  requirementSetId: int("requirement_set_id")
    .notNull()
    .references(() => specialisationRequirementSets.id),
  kind: text().notNull().$type<RequirementKind>(),
  courseId: int("course_id").references(() => courses.id),
  poolLabel: text("pool_label"),
  poolMinCount: int("pool_min_count"),
});

export const specialisationRequirementPoolCourses = sqliteTable(
  "specialisation_requirement_pool_courses",
  {
    id: int().primaryKey({ autoIncrement: true }),
    requirementItemId: int("requirement_item_id")
      .notNull()
      .references(() => specialisationRequirementItems.id),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
  },
);

// A plan is public and unauthenticated — anyone with its URL can edit it,
// the same trust model as the guestbook it replaces. The specialisation's
// requirement set is looked up at the same enrollmentYear as the degree's:
// declared together, one lock-in year.
export const plans = sqliteTable("plans", {
  id: int().primaryKey({ autoIncrement: true }),
  label: text().notNull(),
  degreeId: int("degree_id")
    .notNull()
    .references(() => degrees.id),
  enrollmentYear: int("enrollment_year").notNull(),
  specialisationId: int("specialisation_id").references(() => specialisations.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// One row per course a student has placed in their plan. A multi-session
// course still gets exactly one row plus a warning — see courseWarnings in
// planning.ts for why this doesn't try to auto-occupy a second session.
export const planCourses = sqliteTable(
  "plan_courses",
  {
    id: int().primaryKey({ autoIncrement: true }),
    planId: int("plan_id")
      .notNull()
      .references(() => plans.id),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    year: int().notNull(),
    session: text().notNull().$type<Session>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique().on(t.planId, t.courseId)],
);

export type Course = typeof courses.$inferSelect;
export type PrerequisiteGroup = typeof prerequisiteGroups.$inferSelect;
export type PrerequisiteGroupOption = typeof prerequisiteGroupOptions.$inferSelect;
export type Degree = typeof degrees.$inferSelect;
export type DegreeRequirementSet = typeof degreeRequirementSets.$inferSelect;
export type DegreeRequirementItem = typeof degreeRequirementItems.$inferSelect;
export type Specialisation = typeof specialisations.$inferSelect;
export type SpecialisationRequirementSet = typeof specialisationRequirementSets.$inferSelect;
export type SpecialisationRequirementItem = typeof specialisationRequirementItems.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type PlanCourse = typeof planCourses.$inferSelect;
