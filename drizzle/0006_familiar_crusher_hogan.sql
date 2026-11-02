ALTER TABLE "two_factor" ADD COLUMN "verified" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_failed_verification_count_check" CHECK ("failed_verification_count" >= 0);