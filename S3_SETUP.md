# S3 Configuration Guide

To enable the direct-to-S3 upload pipeline, you must configure your AWS S3 bucket with the following settings.

## 1. CORS Configuration
Required to allow the browser (running on localhost or your domain) to upload directly to S3.

**Go to:** S3 Bucket > Permissions > Cross-origin resource sharing (CORS)

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ]
    }
]
```

## 2. Public Access (For Playback)
The current implementation assumes the video objects are publicly readable (Loom-style public links).

**Option A: Public Bucket Policy (Simplest)**
**Go to:** S3 Bucket > Permissions > Bucket Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/videos/*"
        }
    ]
}
```

## 3. Lifecycle Rules (Orphan Cleanup)
Since we generate presigned URLs *before* the upload completes, some uploads might be abandoned (user closes tab). To save costs, delete incomplete multipart uploads and old temp files.

**Go to:** S3 Bucket > Management > Lifecycle rules

**Rule 1: Delete Incomplete Uploads**
- **Rule name:** `Cleanup Incomplete Multipart`
- **Scope:** Apply to all objects
- **Action:** Delete expired object delete markers or incomplete multipart uploads
- **Incomplete multipart uploads:** Delete after **1 day**

**Rule 2: (Optional) Temp File Cleanup**
If you want to auto-delete videos after X days:
- **Rule name:** `Expire Old Videos`
- **Filter:** Prefix `videos/`
- **Action:** Expire current version of objects
- **Days:** 30 (or your preference)
