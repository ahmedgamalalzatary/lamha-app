CREATE TABLE `product_ingredients` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`product_id` int unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_option_groups` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`product_id` int unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`required` boolean NOT NULL DEFAULT false,
	`max_choices` smallint unsigned NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_option_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`group_id` int unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`price_delta` decimal(10,2) NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_stores` (
	`user_id` int unsigned NOT NULL,
	`store_id` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_stores_user_id_store_id_pk` PRIMARY KEY(`user_id`,`store_id`)
);
--> statement-breakpoint
ALTER TABLE `store_categories` ADD `parent_id` int unsigned;--> statement-breakpoint
ALTER TABLE `product_ingredients` ADD CONSTRAINT `product_ingredients_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_option_groups` ADD CONSTRAINT `product_option_groups_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_options` ADD CONSTRAINT `product_options_group_id_product_option_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `product_option_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_stores` ADD CONSTRAINT `favorite_stores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_stores` ADD CONSTRAINT `favorite_stores_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_ingredients_product_idx` ON `product_ingredients` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `product_option_groups_product_idx` ON `product_option_groups` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `product_options_group_idx` ON `product_options` (`group_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `favorite_stores_store_idx` ON `favorite_stores` (`store_id`);--> statement-breakpoint
ALTER TABLE `store_categories` ADD CONSTRAINT `store_categories_parent_id_store_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `store_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_categories_parent_idx` ON `store_categories` (`parent_id`);