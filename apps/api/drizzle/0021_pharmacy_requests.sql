ALTER TABLE `orders` ADD `request_kind` enum('prescription','product');--> statement-breakpoint
ALTER TABLE `orders` ADD `request_image` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `request_text` varchar(500);--> statement-breakpoint
ALTER TABLE `orders` ADD `priced_at` datetime;