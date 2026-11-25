CREATE TABLE `cart_lines` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`cart_id` int unsigned NOT NULL,
	`product_id` int unsigned NOT NULL,
	`selection_key` char(64) NOT NULL,
	`option_ids` json NOT NULL,
	`removed_ingredient_ids` json NOT NULL,
	`quantity` int unsigned NOT NULL,
	CONSTRAINT `cart_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_lines_selection_idx` UNIQUE(`cart_id`,`selection_key`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`store_id` int unsigned NOT NULL,
	`note` varchar(200) NOT NULL DEFAULT '',
	`mode` enum('delivery','pickup') NOT NULL DEFAULT 'delivery',
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `cart_lines` ADD CONSTRAINT `cart_lines_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_lines` ADD CONSTRAINT `cart_lines_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cart_lines_product_idx` ON `cart_lines` (`product_id`);--> statement-breakpoint
CREATE INDEX `carts_store_idx` ON `carts` (`store_id`);