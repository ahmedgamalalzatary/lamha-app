CREATE TABLE `users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`role` enum('customer','partner','driver','admin') NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(255),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL DEFAULT '',
	`password_hash` varchar(255) NOT NULL,
	`gender` enum('male','female'),
	`region` varchar(100),
	`locale` enum('ar','en') NOT NULL DEFAULT 'ar',
	`invite_code` varchar(12),
	`invited_by_id` int unsigned,
	`disabled_at` datetime,
	`deleted_at` datetime,
	`credentials_changed_at` datetime(3),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_invite_code_unique` UNIQUE(`invite_code`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`phone` varchar(11) NOT NULL,
	`email` varchar(255) NOT NULL,
	`purpose` enum('signup','reset') NOT NULL,
	`code_hash` char(64) NOT NULL,
	`attempts` tinyint unsigned NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`consumed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `otp_codes_phone_purpose_idx` ON `otp_codes` (`phone`,`purpose`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`user_id`);