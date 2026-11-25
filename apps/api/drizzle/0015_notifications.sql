CREATE TABLE `campaigns` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(80) NOT NULL,
	`body` varchar(300) NOT NULL,
	`zone_id` int unsigned,
	`recipients` int unsigned NOT NULL,
	`sent_by_id` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`kind` enum('order_accepted','order_rejected','order_ready','order_on_way','order_delivered','order_picked_up','new_order','offer','skip_warning','skip_block','campaign') NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(400) NOT NULL,
	`path` varchar(120),
	`read_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`token` varchar(255) NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `target_type` enum('account','store','zone','settings','order','ticket','campaign') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notifications_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_sent_by_id_users_id_fk` FOREIGN KEY (`sent_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_tokens` ADD CONSTRAINT `push_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `push_tokens_user_idx` ON `push_tokens` (`user_id`);