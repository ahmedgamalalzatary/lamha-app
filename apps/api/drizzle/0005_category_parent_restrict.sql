ALTER TABLE `store_categories` DROP FOREIGN KEY `store_categories_parent_id_store_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `store_categories` ADD CONSTRAINT `store_categories_parent_id_store_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `store_categories`(`id`) ON DELETE no action ON UPDATE no action;