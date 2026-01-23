import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.S3_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(request: Request) {
    try {
        // Basic validation of S3 config
        if (
            !process.env.S3_BUCKET ||
            !process.env.S3_ACCESS_KEY_ID ||
            !process.env.S3_SECRET_ACCESS_KEY
        ) {
            console.warn("Missing S3 configuration");
            return NextResponse.json(
                { error: "Server storage configuration missing" },
                { status: 500 }
            );
        }

        const { contentType, contentLength } = await request.json();

        // STRICT VALIDATION
        if (contentType !== "video/webm") {
            return NextResponse.json(
                { error: "Invalid content type. Only video/webm is allowed." },
                { status: 400 }
            );
        }

        const maxSize = 500 * 1024 * 1024; // 500MB
        if (contentLength > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 500MB." },
                { status: 400 }
            );
        }

        const videoId = uuidv4();
        const objectKey = `videos/${videoId}.webm`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: objectKey,
            ContentType: "video/webm",
            ContentLength: contentLength,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 minutes

        return NextResponse.json({
            videoId,
            uploadUrl,
            objectKey,
        });
    } catch (error) {
        console.error("Presign error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
