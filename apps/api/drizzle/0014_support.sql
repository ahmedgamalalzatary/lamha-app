CREATE TABLE `ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`customer_id` int unsigned NOT NULL,
	`store_id` int unsigned NOT NULL,
	`stars` tinyint unsigned NOT NULL,
	`tags` json NOT NULL,
	`text` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ratings_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `support_phones` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`label` varchar(40) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`sort_order` smallint unsigned NOT NULL,
	CONSTRAINT `support_phones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` int unsigned NOT NULL,
	`type` enum('complaint','suggestion') NOT NULL,
	`order_id` int unsigned,
	`text` varchar(1000) NOT NULL,
	`status` enum('open','done') NOT NULL DEFAULT 'open',
	`done_at` datetime,
	`done_by_id` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `target_type` enum('account','store','zone','settings','order','ticket') NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `rating_sum` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `rating_count` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `rating_skipped_at` datetime;--> statement-breakpoint
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_customer_id_users_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_users_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_done_by_id_users_id_fk` FOREIGN KEY (`done_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ratings_store_idx` ON `ratings` (`store_id`);--> statement-breakpoint
CREATE INDEX `ratings_created_idx` ON `ratings` (`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`,`created_at`);