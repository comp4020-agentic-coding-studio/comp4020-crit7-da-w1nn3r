CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`credit_points` integer DEFAULT 6 NOT NULL,
	`sessions_required` integer DEFAULT 1 NOT NULL,
	`permission_required` integer DEFAULT false NOT NULL,
	`offered_sessions` text,
	`retired` integer DEFAULT false NOT NULL,
	`superseded_by_course_id` integer,
	FOREIGN KEY (`superseded_by_course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `degree_requirement_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_set_id` integer NOT NULL,
	`kind` text NOT NULL,
	`course_id` integer,
	`pool_label` text,
	`pool_min_count` integer,
	FOREIGN KEY (`requirement_set_id`) REFERENCES `degree_requirement_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `degree_requirement_pool_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_item_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	FOREIGN KEY (`requirement_item_id`) REFERENCES `degree_requirement_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `degree_requirement_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`degree_id` integer NOT NULL,
	`year` integer NOT NULL,
	FOREIGN KEY (`degree_id`) REFERENCES `degrees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `degree_requirement_sets_degree_id_year_unique` ON `degree_requirement_sets` (`degree_id`,`year`);--> statement-breakpoint
CREATE TABLE `degrees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`year` integer NOT NULL,
	`session` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_courses_plan_id_course_id_unique` ON `plan_courses` (`plan_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`degree_id` integer NOT NULL,
	`enrollment_year` integer NOT NULL,
	`specialisation_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`degree_id`) REFERENCES `degrees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`specialisation_id`) REFERENCES `specialisations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prerequisite_group_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`prerequisite_course_id` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `prerequisite_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prerequisite_course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prerequisite_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `specialisation_requirement_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_set_id` integer NOT NULL,
	`kind` text NOT NULL,
	`course_id` integer,
	`pool_label` text,
	`pool_min_count` integer,
	FOREIGN KEY (`requirement_set_id`) REFERENCES `specialisation_requirement_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `specialisation_requirement_pool_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_item_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	FOREIGN KEY (`requirement_item_id`) REFERENCES `specialisation_requirement_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `specialisation_requirement_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`specialisation_id` integer NOT NULL,
	`year` integer NOT NULL,
	FOREIGN KEY (`specialisation_id`) REFERENCES `specialisations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `specialisation_requirement_sets_specialisation_id_year_unique` ON `specialisation_requirement_sets` (`specialisation_id`,`year`);--> statement-breakpoint
CREATE TABLE `specialisations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`degree_id` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`degree_id`) REFERENCES `degrees`(`id`) ON UPDATE no action ON DELETE no action
);
