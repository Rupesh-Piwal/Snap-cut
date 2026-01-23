CREATE TABLE "video_links" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"site" text,
	"preview_failed" boolean DEFAULT false,
	"order" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"title" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_links" ADD CONSTRAINT "video_links_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;