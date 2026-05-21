CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`agency_id` text,
	`email` text NOT NULL,
	`phone` text,
	`preferences_notes` text,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`agent_id` text,
	`manager_email` text,
	`genre` text,
	`prior_show_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comps` (
	`id` text PRIMARY KEY NOT NULL,
	`show_id` text NOT NULL,
	`category` text NOT NULL,
	`count` integer NOT NULL,
	`face_value` real NOT NULL,
	`counts_toward_gross` integer DEFAULT false NOT NULL,
	`notes` text,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`show_id` text NOT NULL,
	`deal_type` text NOT NULL,
	`guarantee_amount` real,
	`percentage` real,
	`percentage_basis` text,
	`expense_cap` real,
	`hospitality_cap` real,
	`bonuses_json` text,
	`deal_notes_freetext` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deals_show_id_unique` ON `deals` (`show_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`show_id` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`approved` integer DEFAULT true NOT NULL,
	`absorbed_by_venue` integer DEFAULT false NOT NULL,
	`entered_by_user_id` text,
	`entered_at` integer NOT NULL,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`show_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`drafted_at` integer,
	`submitted_at` integer,
	`review_started_at` integer,
	`signed_at` integer,
	`disputed_at` integer,
	`revised_at` integer,
	`finalized_at` integer,
	`paid_at` integer,
	`completed_at` integer,
	`completed_by_user_id` text,
	`gross_box_office` real,
	`net_box_office` real,
	`total_expenses` real,
	`total_to_artist` real,
	`calculation_json` text,
	`recoups_json` text,
	`signoff_text` text,
	`notes` text,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settlements_show_id_unique` ON `settlements` (`show_id`);--> statement-breakpoint
CREATE TABLE `shows` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`doors_time` text,
	`set_time` text,
	`opener_artist_id` text,
	`room_config` text DEFAULT 'standing' NOT NULL,
	`internal_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opener_artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ticket_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`show_id` text NOT NULL,
	`qty` integer NOT NULL,
	`gross` real NOT NULL,
	`fees` real NOT NULL,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`venue_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL
);
