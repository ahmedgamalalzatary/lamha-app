ALTER TABLE `audit_log` MODIFY COLUMN `target_type` enum('account','store','zone','settings') NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` DROP COLUMN `delivery_fee`;