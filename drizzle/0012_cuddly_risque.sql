ALTER TABLE `experimentSubmissions` MODIFY COLUMN `status` enum('draft','submitted','evaluated','returned','graded') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `experimentSubmissions` ADD `lastActionAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `experimentSubmissions` ADD `aiStats` json;--> statement-breakpoint
ALTER TABLE `experiments` ADD `config` json;