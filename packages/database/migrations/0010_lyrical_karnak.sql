ALTER TABLE "games" ADD COLUMN "format" varchar(8) DEFAULT 'ONLINE' NOT NULL;--> statement-breakpoint
CREATE INDEX "games_format_index" ON "games" USING btree ("format");