ALTER TABLE `carts` ADD CONSTRAINT `carts_user_store_idx` UNIQUE(`user_id`,`store_id`);--> statement-breakpoint
ALTER TABLE `carts` DROP INDEX `carts_user_idx`;
