CREATE TABLE `invite_credit_uses` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`credit_id` int unsigned NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	CONSTRAINT `invite_credit_uses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invite_credits` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`kind` enum('reward','welcome') NOT NULL,
	`invite_id` int unsigned NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`left` decimal(10,2) NOT NULL,
	`per_order` decimal(10,2),
	`expires_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invite_settings` (
	`id` int unsigned NOT NULL,
	`reward` decimal(10,2) NOT NULL DEFAULT 300,
	`reward_per_order` decimal(10,2) NOT NULL DEFAULT 30,
	`reward_days` int unsigned NOT NULL DEFAULT 30,
	`friend_reward` decimal(10,2) NOT NULL DEFAULT 25,
	`friend_days` int unsigned NOT NULL DEFAULT 30,
	`first_order_days` int unsigned NOT NULL DEFAULT 30,
	`monthly_cap` decimal(10,2) NOT NULL DEFAULT 1000,
	`expires` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invite_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`inviter_id` int unsigned NOT NULL,
	`friend_id` int unsigned NOT NULL,
	`status` enum('waiting','rewarded','missed') NOT NULL DEFAULT 'waiting',
	`reward` decimal(10,2) NOT NULL DEFAULT 0,
	`rewarded_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_friend_id_unique` UNIQUE(`friend_id`)
);
--> statement-breakpoint
ALTER TABLE `wallet_transactions` MODIFY COLUMN `reason` enum('admin','order','refund','invite_reward','invite_welcome','invite_expired') NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `invite_paid` decimal(10,2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invite_credit_uses` ADD CONSTRAINT `invite_credit_uses_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_credit_uses` ADD CONSTRAINT `invite_credit_uses_credit_id_invite_credits_id_fk` FOREIGN KEY (`credit_id`) REFERENCES `invite_credits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_credits` ADD CONSTRAINT `invite_credits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_inviter_id_users_id_fk` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_friend_id_users_id_fk` FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `invite_credit_uses_order_idx` ON `invite_credit_uses` (`order_id`);--> statement-breakpoint
CREATE INDEX `invite_credits_user_idx` ON `invite_credits` (`user_id`,`left`);--> statement-breakpoint
CREATE INDEX `invites_inviter_idx` ON `invites` (`inviter_id`,`id`);--> statement-breakpoint
INSERT INTO `invite_settings` (`id`) VALUES (1);