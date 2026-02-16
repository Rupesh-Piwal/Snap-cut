import { notFound } from "next/navigation";
import { db } from "@/app/db";
import { videos, videoLinks } from "@/app/db/schema";
import { eq, asc } from "drizzle-orm";
import { ExternalLink, Calendar, Link as LinkIcon } from "lucide-react";
import { getPresignedVideoUrl } from "@/lib/s3-server";
import { VideoPlayer } from "@/components/video-player";

type PageProps = {
    params: Promise<{ videoId: string }>;
};

// Force dynamic rendering since we fetch data based on params
export const dynamic = "force-dynamic";

export default async function VideoSharePage({ params }: PageProps) {
    const { videoId } = await params;

    // 1. Fetch Video Metadata
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });

    if (!video) {
        notFound();
    }

    // 2. Fetch Links
    const links = await db.query.videoLinks.findMany({
        where: eq(videoLinks.videoId, videoId),
        orderBy: [asc(videoLinks.order)],
    });

    // Generate Presigned GET URL (Server-side)
    const videoUrl = await getPresignedVideoUrl(video.objectKey);

    if (!videoUrl) {
        // Handle error or fallback (maybe show error state)
        // For now, let's just log and maybe return null or notFound if critical
        console.error("Failed to generate video URL");
        // notFound(); // Optional: decide if we 404
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto p-6 md:p-12">

                <div className="col-span-1 md:col-span-8">
                    {/* HEADER */}
                    <div className="flex flex-row items-center gap-4 space-y-4 mb-4">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Shared Recording
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {new Date(video.createdAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                            {/* Could add views/duration here if stored */}
                        </div>
                    </div>

                    {/* PLAYER */}
                    <div className="mb-8">
                        <VideoPlayer
                            src={videoUrl ?? undefined}
                            autoPlay={true}
                        />
                    </div>

                </div>

                {/* SIDEBAR: Description & Links */}
                <div className="col-span-1 md:col-span-4 space-y-8">
                    {/* Description */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-3 border-b border-white/10 pb-3">
                            About this recording
                        </h3>
                        <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                            {video.description || "No description provided."}
                        </p>
                    </div>

                    {/* Links Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4 pb-3">
                            Related Links
                        </h3>

                        {links.length === 0 ? (
                            <p className="text-sm text-white/60 italic">No links attached.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {links.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-start gap-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 transition-all hover:bg-[#1a1a1a]/80 hover:border-white/20"
                                    >
                                        {/* Icon/Image Box */}
                                        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
                                            {link.image && !link.previewFailed ? (
                                                <img
                                                    src={link.image}
                                                    alt={link.title || "Link preview"}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <LinkIcon className="w-6 h-6 text-white/60" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="font-semibold text-white line-clamp-1 leading-tight text-sm">
                                                    {link.title || link.url}
                                                </h4>
                                                <ExternalLink className="w-4 h-4 text-white/40 shrink-0 mt-0.5 group-hover:text-white/60 transition-colors" />
                                            </div>

                                            <p className="text-xs text-white/60 line-clamp-2">
                                                {link.description || link.site || new URL(link.url).hostname}
                                            </p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
