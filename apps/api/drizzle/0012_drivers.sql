CREATE TABLE `driver_settings` (
	`id` int unsigned NOT NULL,
	`schedule` json NOT NULL,
	`start_early_minutes` smallint unsigned NOT NULL DEFAULT 30,
	`start_late_minutes` smallint unsigned NOT NULL DEFAULT 15,
	`extend_minutes` smallint unsigned NOT NULL DEFAULT 60,
	`extend_max` smallint unsigned NOT NULL DEFAULT 3,
	`offer_seconds` smallint unsigned NOT NULL DEFAULT 60,
	`skip_warn` smallint unsigned NOT NULL DEFAULT 2,
	`skip_block` smallint unsigned NOT NULL DEFAULT 3,
	`block_minutes` smallint unsigned NOT NULL DEFAULT 15,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`user_id` int unsigned NOT NULL,
	`schedule` json,
	`skips_in_row` smallint unsigned NOT NULL DEFAULT 0,
	`blocked_until` datetime,
	CONSTRAINT `drivers_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `order_skips` (
	`order_id` int unsigned NOT NULL,
	`driver_id` int unsigned NOT NULL,
	`at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_skips_order_id_driver_id_pk` PRIMARY KEY(`order_id`,`driver_id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`driver_id` int unsigned NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`extensions` smallint unsigned NOT NULL DEFAULT 0,
	`started_at` datetime NOT NULL,
	`started_by_id` int unsigned,
	`ended_at` datetime,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `target_type` enum('account','store','zone','settings','order') NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `driver_id` int unsigned;--> statement-breakpoint
ALTER TABLE `orders` ADD `at_store_at` datetime;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_skips` ADD CONSTRAINT `order_skips_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_skips` ADD CONSTRAINT `order_skips_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_started_by_id_users_id_fk` FOREIGN KEY (`started_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `shifts_driver_idx` ON `shifts` (`driver_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_driver_idx` ON `orders` (`driver_id`,`status`);--> statement-breakpoint
INSERT INTO `driver_settings` (`id`, `schedule`) VALUES (1, JSON_ARRAY(NULL, NULL, NULL, NULL, NULL, NULL, NULL));--> statement-breakpoint
INSERT INTO `drivers` (`user_id`) SELECT `id` FROM `users` WHERE `role` = 'driver';
