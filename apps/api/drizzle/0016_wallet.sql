CREATE TABLE `wallet_transactions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`kind` enum('add','deduct') NOT NULL,
	`reason` enum('admin','order','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`note` varchar(200) NOT NULL DEFAULT '',
	`order_id` int unsigned,
	`by_user_id` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `wallet_balance` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `wallet_paid` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_by_user_id_users_id_fk` FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wallet_transactions_user_idx` ON `wallet_transactions` (`user_id`,`id`);