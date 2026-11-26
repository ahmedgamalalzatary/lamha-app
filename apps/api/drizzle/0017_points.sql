CREATE TABLE `points_settings` (
	`id` int unsigned NOT NULL,
	`earn_every` decimal(10,2) NOT NULL DEFAULT 10,
	`point_value` decimal(10,4) NOT NULL DEFAULT 0.1,
	`minimum` int unsigned NOT NULL DEFAULT 100,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `points_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `points_transactions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`kind` enum('add','deduct') NOT NULL,
	`reason` enum('order','refund','admin') NOT NULL,
	`points` int unsigned NOT NULL,
	`note` varchar(200) NOT NULL DEFAULT '',
	`order_id` int unsigned,
	`by_user_id` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `points_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `points_balance` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `points_spent` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `points_paid` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `points_earned` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `points_transactions` ADD CONSTRAINT `points_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `points_transactions` ADD CONSTRAINT `points_transactions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `points_transactions` ADD CONSTRAINT `points_transactions_by_user_id_users_id_fk` FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `points_transactions_user_idx` ON `points_transactions` (`user_id`,`id`);--> statement-breakpoint
INSERT INTO `points_settings` (`id`) VALUES (1);
