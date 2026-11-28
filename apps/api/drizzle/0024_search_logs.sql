CREATE TABLE `search_logs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`term` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `search_logs_created_idx` ON `search_logs` (`created_at`);