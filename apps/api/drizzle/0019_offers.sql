CREATE TABLE `banners` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`image` varchar(255) NOT NULL,
	`place` enum('carousel','rail') NOT NULL,
	`store_id` int unsigned NOT NULL,
	`opens` enum('store','products') NOT NULL DEFAULT 'store',
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_uses` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`coupon_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`order_id` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_uses_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_uses_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`code_key` varchar(40) NOT NULL,
	`title` varchar(80) NOT NULL,
	`store_id` int unsigned,
	`kind` enum('amount','percent') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`max_discount` decimal(10,2),
	`min_order` decimal(10,2) NOT NULL DEFAULT 0,
	`starts_at` datetime,
	`ends_at` datetime,
	`per_customer` int unsigned NOT NULL DEFAULT 1,
	`total_limit` int unsigned,
	`paid_by` enum('store','app') NOT NULL DEFAULT 'app',
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_idx` UNIQUE(`code_key`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `target_type` enum('account','store','zone','settings','order','ticket','campaign','coupon','banner','product') NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `old_price` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `discount_paid_by` enum('store','app') DEFAULT 'store' NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `free_delivery_from` decimal(10,2);--> statement-breakpoint
ALTER TABLE `stores` ADD `free_delivery_paid_by` enum('store','app') DEFAULT 'store' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_discount` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_paid_by` enum('store','app');--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_id` int unsigned;--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_code` varchar(40);--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_discount` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_paid_by` enum('store','app');--> statement-breakpoint
ALTER TABLE `orders` ADD `app_product_saving` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `banners` ADD CONSTRAINT `banners_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_uses` ADD CONSTRAINT `coupon_uses_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_uses` ADD CONSTRAINT `coupon_uses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_uses` ADD CONSTRAINT `coupon_uses_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `banners_place_idx` ON `banners` (`place`,`sort_order`);--> statement-breakpoint
CREATE INDEX `coupon_uses_coupon_idx` ON `coupon_uses` (`coupon_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `coupons_store_idx` ON `coupons` (`store_id`);