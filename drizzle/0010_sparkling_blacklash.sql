CREATE TABLE `assignment_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`classId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignment_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignment_classes` ADD CONSTRAINT `assignment_classes_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` DROP COLUMN `classId`;