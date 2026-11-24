ALTER TABLE `otp_codes` MODIFY COLUMN `purpose` enum('signup','reset','phone','email') NOT NULL;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD `replaced_by_id` int unsigned;