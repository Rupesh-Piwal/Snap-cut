import { notFound } from "next/navigation";
import { db } from "@/app/db";
import { videos, videoLinks } from "@/app/db/schema";
import { eq, asc } from "drizzle-orm";
import { ExternalLink, Calendar, Link as LinkIcon } from "lucide-react";

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

    // Construct S3 URL (Public)
    // Assuming S3 bucket is public or we use presigned GET URLs (but implementation plan said public player)
    // If bucket is private, we'd need a presigned GET URL here.
    // For now, let's assume we construct a direct URL or use a proxy. 
    // Given "Public (no auth)" requirement, usually public read access on specific path or presigned.
    // Let's generate a Presigned GET URL for 1 hour validity to be safe/secure by default, 
    // OR rely on public bucket policy.
    // Plan said: "Embedded video player streaming from S3".
    // Let's assume public URL via S3_PUBLIC_URL env var + key.
    const videoUrl = `${process.env.S3_PUBLIC_URL}/${video.objectKey}`;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20">
            <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">

                {/* HEADER */}
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white/90">
                        {video.title || "Untitled Recording"}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-white/50">
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
                <div className="relative aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        poster={links.find(l => l.image)?.image || undefined} // Fallback poster
                    />
                </div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: Description */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-white/80 mb-3 border-b border-white/10 pb-2">
                                About this recording
                            </h3>
                            <div className="prose prose-invert max-w-none text-white/70 whitespace-pre-wrap leading-relaxed">
                                {video.description || "No description provided."}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Links */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-white/80 mb-3 border-b border-white/10 pb-2">
                            Related Links
                        </h3>

                        {links.length === 0 ? (
                            <p className="text-sm text-white/40 italic">No links attached.</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {links.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
                                    >
                                        {link.image && !link.previewFailed ? (
                                            <div className="h-32 w-full overflow-hidden relative bg-black/50">
                                                <img
                                                    src={link.image}
                                                    alt={link.title || "Link preview"}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        ) : null}

                                        <div className="p-4 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-semibold text-white/90 line-clamp-2 leading-tight">
                                                    {link.title || link.url}
                                                </h4>
                                                <ExternalLink className="w-4 h-4 text-white/30 shrink-0 mt-1" />
                                            </div>

                                            {link.description && (
                                                <p className="text-xs text-white/50 line-clamp-2">
                                                    {link.description}
                                                </p>
                                            )}

                                            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-wider font-medium">
                                                <LinkIcon className="w-3 h-3" />
                                                {link.site || new URL(link.url).hostname}
                                            </div>
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
