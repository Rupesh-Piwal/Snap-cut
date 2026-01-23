/**
 * Requests a pre-signed URL from the backend for direct S3 upload.
 */
export const requestPresignedUrl = async (size: number) => {
    const response = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contentType: "video/webm",
            contentLength: size,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to get upload URL");
    }

    return response.json() as Promise<{
        videoId: string;
        uploadUrl: string;
        objectKey: string;
    }>;
};

/**
 * Uploads a Blob directly to S3 using a pre-signed PUT URL.
 * Uses XMLHttpRequest to track upload progress.
 */
export const uploadToS3 = (
    blob: Blob,
    uploadUrl: string,
    onProgress: (progress: number) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(Math.round(percentComplete));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network failure during upload"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", "video/webm");
        xhr.send(blob);
    });
};
