CREATE TABLE `delivery_settings` (
	`id` int unsigned NOT NULL,
	`base_fee` decimal(10,2) NOT NULL DEFAULT 20,
	`base_km` decimal(6,2) NOT NULL DEFAULT 2,
	`per_km` decimal(10,2) NOT NULL DEFAULT 10,
	`payout_option` enum('fee_only','app_share','nothing') NOT NULL DEFAULT 'app_share',
	`app_percent` decimal(5,2) NOT NULL DEFAULT 10,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`status` enum('pending_review','preparing','ready','out_for_delivery','delivered','rejected','cancelled') NOT NULL,
	`by_user_id` int unsigned,
	`at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`product_id` int unsigned,
	`name` varchar(120) NOT NULL,
	`options` json NOT NULL,
	`removed_ingredients` json NOT NULL,
	`image` varchar(255),
	`unit_price` decimal(10,2) NOT NULL,
	`quantity` int unsigned NOT NULL,
	CONSTRAINT `order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` int unsigned NOT NULL,
	`store_id` int unsigned NOT NULL,
	`request_id` char(36) NOT NULL,
	`status` enum('pending_review','preparing','ready','out_for_delivery','delivered','rejected','cancelled') NOT NULL DEFAULT 'pending_review',
	`mode` enum('delivery','pickup') NOT NULL,
	`address_id` int unsigned,
	`address_text` varchar(600),
	`phone` varchar(20),
	`lat` decimal(9,6),
	`lng` decimal(9,6),
	`distance_km` decimal(7,3),
	`scheduled_for` datetime,
	`note` varchar(200) NOT NULL DEFAULT '',
	`items_total` decimal(10,2) NOT NULL,
	`delivery_fee` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`payout_option` enum('fee_only','app_share','nothing') NOT NULL,
	`app_percent` decimal(5,2) NOT NULL,
	`app_share` decimal(10,2) NOT NULL,
	`store_gets` decimal(10,2) NOT NULL,
	`store_from_driver` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_request_idx` UNIQUE(`customer_id`,`request_id`)
);
--> statement-breakpoint
ALTER TABLE `stores` ADD `payout_option` enum('fee_only','app_share','nothing');--> statement-breakpoint
ALTER TABLE `stores` ADD `app_percent` decimal(5,2);--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_by_user_id_users_id_fk` FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_users_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_address_id_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_store_idx` ON `orders` (`store_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
INSERT INTO `delivery_settings` (`id`) VALUES (1);