PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plan_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`year` integer,
	`session` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_plan_courses`("id", "plan_id", "course_id", "year", "session", "created_at") SELECT "id", "plan_id", "course_id", "year", "session", "created_at" FROM `plan_courses`;--> statement-breakpoint
DROP TABLE `plan_courses`;--> statement-breakpoint
ALTER TABLE `__new_plan_courses` RENAME TO `plan_courses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `plan_courses_plan_id_course_id_unique` ON `plan_courses` (`plan_id`,`course_id`);