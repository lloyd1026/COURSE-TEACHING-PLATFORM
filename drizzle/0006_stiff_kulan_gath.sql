CREATE TABLE `exam_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`classId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exam_classes` ADD CONSTRAINT `exam_classes_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` DROP COLUMN `classId`;