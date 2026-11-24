ALTER TABLE `users` ADD `session_version` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD `session_version` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `credentials_changed_at`;