CREATE TABLE `audit_log` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`actor_id` int unsigned NOT NULL,
	`actor_name` varchar(210) NOT NULL,
	`action` varchar(40) NOT NULL,
	`target_type` enum('account','store','zone') NOT NULL,
	`target_id` int unsigned NOT NULL,
	`target_name` varchar(255) NOT NULL,
	`details` json NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
