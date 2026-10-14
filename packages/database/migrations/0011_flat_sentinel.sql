CREATE TABLE "time_proposal_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"proposer_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_proposals" ADD COLUMN "round_id" uuid;--> statement-breakpoint
WITH open_game_rounds AS (
	INSERT INTO "time_proposal_rounds" ("id", "game_id", "proposer_id", "status", "created_at", "updated_at")
	SELECT gen_random_uuid(), proposals."game_id", games."owner_id", 'OPEN', min(proposals."created_at"), max(proposals."updated_at")
	FROM "time_proposals" AS proposals
	INNER JOIN "games" AS games ON games."id" = proposals."game_id"
	WHERE proposals."status" = 'OPEN'
	GROUP BY proposals."game_id", games."owner_id"
	RETURNING "id", "game_id"
)
UPDATE "time_proposals" AS proposals
SET "round_id" = open_game_rounds."id
FROM open_game_rounds
WHERE proposals."game_id" = open_game_rounds."game_id" AND proposals."status" = 'OPEN';--> statement-breakpoint
INSERT INTO "time_proposal_rounds" ("id", "game_id", "proposer_id", "status", "created_at", "updated_at")
SELECT proposals."id", proposals."game_id", proposals."proposer_id",
	CASE
		WHEN proposals."status" = 'SELECTED' AND EXISTS (
			SELECT 1 FROM "game_sessions" AS sessions
			WHERE sessions."proposal_id" = proposals."id" AND sessions."status" = 'CANCELLED'
		) THEN 'CANCELLED'
		WHEN proposals."status" = 'SELECTED' THEN 'SELECTED'
		ELSE 'CLOSED'
	END,
	proposals."created_at", proposals."updated_at"
FROM "time_proposals" AS proposals
WHERE proposals."status" <> 'OPEN';--> statement-breakpoint
UPDATE "time_proposals" SET "round_id" = "id" WHERE "status" <> 'OPEN';--> statement-breakpoint
ALTER TABLE "time_proposals" ALTER COLUMN "round_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "time_proposal_rounds" ADD CONSTRAINT "time_proposal_rounds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_proposal_rounds" ADD CONSTRAINT "time_proposal_rounds_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_proposal_rounds_game_index" ON "time_proposal_rounds" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_proposal_rounds_open_game_unique" ON "time_proposal_rounds" USING btree ("game_id") WHERE "status" = 'OPEN';--> statement-breakpoint
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_round_id_time_proposal_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."time_proposal_rounds"("id") ON DELETE cascade ON UPDATE no action;
