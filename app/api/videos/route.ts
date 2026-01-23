import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { videos, videoLinks } from "@/app/db/schema";
import { fetchLinkPreview } from "@/lib/link-preview";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, description, links } = body;

        // 1. Validation
        if (!videoId) {
            return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
        }

        if (description && description.length > 500) {
            return NextResponse.json(
                { error: "Description too long (max 500 chars)" },
                { status: 400 }
            );
        }

        if (links && !Array.isArray(links)) {
            return NextResponse.json({ error: "Invalid links format" }, { status: 400 });
        }

        const cleanLinks = (links || []).slice(0, 3).filter((l: string) => l && l.trim().length > 0);

        // 2. Verify S3 Object Exists (Sanity Check)
        const objectKey = `videos/${videoId}.webm`;
        try {
            await s3Client.send(
                new HeadObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: objectKey,
                })
            );
        } catch {
            return NextResponse.json(
                { error: "Video file not found in storage" },
                { status: 404 }
            );
        }

        // 3. Save Video
        await db.insert(videos).values({
            id: videoId,
            objectKey,
            description: description || null,
            title: "Untitled Recording", // Default title
        });

        // 4. Process & Save Links
        if (cleanLinks.length > 0) {
            const previewPromises = cleanLinks.map((url: string) => fetchLinkPreview(url));
            const previews = await Promise.all(previewPromises);

            const linkInserts = previews.map((preview, index) => ({
                id: crypto.randomUUID(),
                videoId,
                url: preview.url,
                title: preview.title || null,
                description: preview.description || null,
                image: preview.image || null,
                site: preview.site || null,
                previewFailed: preview.failed || false,
                order: String(index),
            }));

            await db.insert(videoLinks).values(linkInserts);
        }

        return NextResponse.json({ success: true, shareUrl: `/v/${videoId}` });
    } catch (error) {
        console.error("Save metadata error:", error);
        return NextResponse.json(
            { error: "Failed to save metadata" },
            { status: 500 }
        );
    }
}
