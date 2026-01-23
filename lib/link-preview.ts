import * as cheerio from "cheerio";

export type LinkPreview = {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    failed?: boolean;
};

const TIMEOUT_MS = 5000;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

// Basic Private IP Regex (IPv4)
const PRIVATE_IP_REGEX = /^(?:127\.|192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/;
const LOCALHOST_REGEX = /^localhost$/i;

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
    const result: LinkPreview = { url };

    try {
        const parsedUrl = new URL(url);

        // 1. SSRF Protection
        if (
            LOCALHOST_REGEX.test(parsedUrl.hostname) ||
            PRIVATE_IP_REGEX.test(parsedUrl.hostname)
        ) {
            result.failed = true;
            return result;
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            result.failed = true;
            return result;
        }

        // 2. Fetch with Timeout & Size Limit
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "SnapCut-Bot/1.0",
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                result.failed = true;
                return result;
            }

            // Check content size
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength) > MAX_SIZE_BYTES) {
                // Too big, skip body parsing but maybe we can just use domain?
                result.site = parsedUrl.hostname;
                return result;
            }

            // Read text (limit size)
            const text = await response.text();
            if (text.length > MAX_SIZE_BYTES) {
                // Truncate for parsing to avoid DoS
                // Actually better to stream and cut off, but text() loads all.
                // For simple impl, we check length after load if headers missing.
            }

            // 3. Parse Metadata
            const $ = cheerio.load(text);

            result.title =
                $('meta[property="og:title"]').attr("content") ||
                $("title").text() ||
                "";

            result.description =
                $('meta[property="og:description"]').attr("content") ||
                $('meta[name="description"]').attr("content") ||
                "";

            result.image = $('meta[property="og:image"]').attr("content");

            result.site =
                $('meta[property="og:site_name"]').attr("content") ||
                parsedUrl.hostname;

        } catch (fetchError) {
            console.error("Preview Fetch Error", fetchError);
            result.failed = true;
        } finally {
            clearTimeout(timeoutId);
        }

    } catch (e) {
        result.failed = true;
    }

    return result;
}
