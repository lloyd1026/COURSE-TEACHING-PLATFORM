DROP TABLE `questionTypes`;--> statement-breakpoint
ALTER TABLE `questions` ADD `type` enum('single_choice','multiple_choice','fill_blank','true_false','essay','programming') NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` DROP COLUMN `questionTypeId`;