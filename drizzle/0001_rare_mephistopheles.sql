CREATE TABLE `shop_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`googleSub` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(191),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_customers_googleSub_unique` UNIQUE(`googleSub`)
);
--> statement-breakpoint
CREATE TABLE `shop_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(191) NOT NULL,
	`model` varchar(160) NOT NULL,
	`make` varchar(64) NOT NULL,
	`range` varchar(48) NOT NULL,
	`wheelSize` varchar(96),
	`detail` text,
	`imageUrl` varchar(2048),
	`sourcePage` varchar(32),
	`isFeatured` boolean NOT NULL DEFAULT false,
	`ownerAdded` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_cycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_cycles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `shop_sessions` (
	`tokenHash` varchar(64) NOT NULL,
	`principalId` varchar(128) NOT NULL,
	`role` enum('customer','owner') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_sessions_tokenHash` PRIMARY KEY(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `shop_settings` (
	`key` varchar(128) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_settings_key` PRIMARY KEY(`key`)
);
