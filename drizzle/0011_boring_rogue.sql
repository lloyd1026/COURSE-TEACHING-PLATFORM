CREATE TABLE `submissionDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`questionId` int NOT NULL,
	`studentAnswer` text,
	`isCorrect` boolean,
	`score` decimal(5,2),
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissionDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`sourceType` enum('assignment','exam','experiment') NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
	`totalScore` decimal(5,2),
	`globalFeedback` text,
	`submittedAt` timestamp,
	`gradedAt` timestamp,
	`gradedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `assignmentSubmissions`;--> statement-breakpoint
DROP TABLE `examAnswerDetails`;--> statement-breakpoint
DROP TABLE `examAnswers`;--> statement-breakpoint
ALTER TABLE `submissionDetails` ADD CONSTRAINT `submissionDetails_submissionId_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignmentQuestions` ADD CONSTRAINT `assignmentQuestions_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignmentQuestions` ADD CONSTRAINT `assignmentQuestions_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `examQuestions` ADD CONSTRAINT `examQuestions_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `examQuestions` ADD CONSTRAINT `examQuestions_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;