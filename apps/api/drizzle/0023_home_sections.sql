CREATE TABLE `home_section_stores` (
	`section_id` int unsigned NOT NULL,
	`store_id` int unsigned NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `home_section_stores_section_id_store_id_pk` PRIMARY KEY(`section_id`,`store_id`)
);
--> statement-breakpoint
CREATE TABLE `home_sections` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(120) NOT NULL,
	`image` varchar(255),
	`background` varchar(7) NOT NULL,
	`ink` varchar(7) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `home_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `home_section_stores` ADD CONSTRAINT `home_section_stores_section_id_home_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `home_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `home_section_stores` ADD CONSTRAINT `home_section_stores_store_id_stores_id_fk` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `home_section_stores_store_idx` ON `home_section_stores` (`store_id`);