ALTER TABLE `otp_codes` MODIFY COLUMN `purpose` enum('signup','reset','phone') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` varchar(255);