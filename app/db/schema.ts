import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  objectKey: text("object_key").notNull(),
  title: text("title"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoLinks = pgTable("video_links", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  image: text("image"),
  site: text("site"),
  previewFailed: boolean("preview_failed").default(false),
  order: text("order").notNull(), // using text or integer? integer is better but drizzle text is safer if not installed? pg-core has integer.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schema = {
  videos,
  videoLinks,
};
