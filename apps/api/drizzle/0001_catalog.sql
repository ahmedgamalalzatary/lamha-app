CREATE TABLE `cuisines` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`image` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `cuisines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_tiles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`image` varchar(255),
	`badge` varchar(30),
	`tile_row` enum('fixed','scroll') NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`target_vertical` enum('restaurant','market','pharmacy','courier'),
	`target_store_id` int unsigned,
	CONSTRAINT `home_tiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`store_id` int unsigned NOT NULL,
	`category_id` int unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`unit` varchar(40),
	`image` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_categories` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`store_id` int unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`image` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `store_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_cuisines` (
	`store_id` int unsigned NOT NULL,
	`cuisine_id` int unsigned NOT NULL,
	CONSTRAINT `store_cuisines_store_id_cuisine_id_pk` PRIMARY KEY(`store_id`,`cuisine_id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`vertical` enum('restaurant','market','pharmacy','courier') NOT NULL,
	`name` varchar(120) NOT NULL,
	`logo` varchar(255),
	`cover` varchar(255),
	`delivery_minutes` smallint unsigned NOT NULL,
	`delivery_fee` decimal(10,2) NOT NULL,
	`minimum_order` decimal(10,2) NOT NULL DEFAULT 0,
	`delivered_by` enum('platform','store') NOT NULL DEFAULT 'platform',
	`layout` enum('list','grid') NOT NULL,
	`pickup_allowed` boolean NOT NULL DEFAULT false,
	`opens_at` time NOT NULL,
	`closes_at` time NOT NULL,
	`closed_now` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `store_id` int unsigned;--> statement-breakpoint
ALTER TABLE `home_tiles` ADD CONSTRAINT `home_tiles_target_store_id_stores_id_fk` FOREIGN KEY (`target_store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_store_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `store_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_categories` ADD CONSTRAINT `store_categories_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_cuisines` ADD CONSTRAINT `store_cuisines_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_cuisines` ADD CONSTRAINT `store_cuisines_cuisine_id_cuisines_id_fk` FOREIGN KEY (`cuisine_id`) REFERENCES `cuisines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `products_store_idx` ON `products` (`store_id`,`category_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`);--> statement-breakpoint
CREATE INDEX `store_categories_store_idx` ON `store_categories` (`store_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `store_cuisines_cuisine_idx` ON `store_cuisines` (`cuisine_id`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;