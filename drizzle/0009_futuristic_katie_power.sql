CREATE TABLE `assignmentQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`score` int DEFAULT 1,
	`questionOrder` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignmentQuestions_id` PRIMARY KEY(`id`)
);
