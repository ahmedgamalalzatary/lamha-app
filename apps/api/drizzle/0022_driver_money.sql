CREATE TABLE `driver_fines` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`driver_id` int unsigned NOT NULL,
	`order_id` int unsigned,
	`amount` decimal(10,2) NOT NULL,
	`reason` varchar(200) NOT NULL,
	`by_id` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_fines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_payouts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`driver_id` int unsigned NOT NULL,
	`points` int unsigned NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`by_id` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `kind` enum('order_accepted','order_rejected','order_ready','order_on_way','order_delivered','order_picked_up','new_order','offer','skip_warning','skip_block','driver_fine','campaign') NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `taken_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `driver_fee` decimal(10,2);--> statement-breakpoint
ALTER TABLE `orders` ADD `minutes_per_km` decimal(7,2);--> statement-breakpoint
ALTER TABLE `orders` ADD `driver_points` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `driver_settings` ADD `speed_levels` json;--> statement-breakpoint
ALTER TABLE `driver_settings` ADD `point_value` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `base_fee` decimal(10,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `base_km` decimal(10,2);--> statement-breakpoint
ALTER TABLE `drivers` ADD `per_km` decimal(10,2);--> statement-breakpoint
ALTER TABLE `driver_fines` ADD CONSTRAINT `driver_fines_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_fines` ADD CONSTRAINT `driver_fines_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_fines` ADD CONSTRAINT `driver_fines_by_id_users_id_fk` FOREIGN KEY (`by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_payouts` ADD CONSTRAINT `driver_payouts_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_payouts` ADD CONSTRAINT `driver_payouts_by_id_users_id_fk` FOREIGN KEY (`by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `driver_fines_driver_idx` ON `driver_fines` (`driver_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `driver_payouts_driver_idx` ON `driver_payouts` (`driver_id`,`created_at`);