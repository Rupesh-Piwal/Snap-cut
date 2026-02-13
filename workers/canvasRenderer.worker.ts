const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;

// Layout Constants (Mirrored from layout-engine.ts)
const GAP = 24;
const PADDING = 24;
const CORNER_RADIUS = 16;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvas: OffscreenCanvas | null = null;
let intervalId: NodeJS.Timeout | null = null;
let screenBitmap: ImageBitmap | null = null;
let webcamBitmap: ImageBitmap | null = null;

self.onmessage = async (event) => {
    const { type, payload } = event.data;

    if (type === "INIT") {
        canvas = payload.canvas;
        if (canvas) {
            ctx = canvas.getContext("2d", { alpha: false }) as OffscreenCanvasRenderingContext2D;
        }
    }

    if (type === "FRAME_UPDATE") {
        if (screenBitmap && screenBitmap !== payload.screenBitmap) {
            screenBitmap.close();
        }
        if (webcamBitmap && webcamBitmap !== payload.webcamBitmap) {
            webcamBitmap.close();
        }
        screenBitmap = payload.screenBitmap;
        webcamBitmap = payload.webcamBitmap;
    }

    if (type === "START") {
        startLoop();
    }

    if (type === "STOP") {
        stopLoop();
    }
};

function startLoop() {
    if (intervalId) return;
    intervalId = setInterval(() => {
        renderFrame();
    }, FRAME_TIME);
}

function stopLoop() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;

    if (screenBitmap) {
        screenBitmap.close();
        screenBitmap = null;
    }
    if (webcamBitmap) {
        webcamBitmap.close();
        webcamBitmap = null;
    }
}

function renderFrame() {
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Layout: "screen-camera-right"
    // Logic:
    // - Screen takes left side
    // - Camera takes right side (30% width)
    // - Both have padding and gap

    const totalWidth = w - (PADDING * 2);
    const availableHeight = h - (PADDING * 2);

    const cameraWidth = totalWidth * 0.3; // 30%
    const screenWidth = totalWidth - cameraWidth - GAP;

    // Screen Rect
    const screenRect = {
        x: PADDING,
        y: PADDING,
        w: screenWidth,
        h: availableHeight
    };

    // Camera Rect
    const cameraRect = {
        x: PADDING + screenWidth + GAP,
        y: PADDING,
        w: cameraWidth,
        h: availableHeight
    };

    // Draw Screen
    if (screenBitmap) {
        drawVideoInRect(ctx, screenBitmap, screenRect, "contain");
    }

    // Draw Camera
    if (webcamBitmap) {
        drawVideoInRect(ctx, webcamBitmap, cameraRect, "cover");
    }
}

// Helper to match layout-engine's drawVideoInRect
function drawVideoInRect(
    ctx: OffscreenCanvasRenderingContext2D,
    bitmap: ImageBitmap,
    rect: { x: number, y: number, w: number, h: number },
    mode: "contain" | "cover"
) {
    if (!bitmap) return;

    ctx.save();

    // Clip Rounded Rect
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, CORNER_RADIUS);
    ctx.clip();

    const vw = bitmap.width;
    const vh = bitmap.height;
    const va = vw / vh;
    const da = rect.w / rect.h;

    let sx = 0, sy = 0, sw = vw, sh = vh;
    let dx = rect.x, dy = rect.y, dw = rect.w, dh = rect.h;

    if (mode === "cover") {
        if (va > da) {
            sw = vh * da;
            sx = (vw - sw) / 2;
        } else {
            sh = vw / da;
            sy = (vh - sh) / 2;
        }
        ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
        // Contain
        ctx.fillStyle = "#000";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        if (va > da) {
            // Wider
            const drawH = rect.w / va;
            const DrawY = rect.y + (rect.h - drawH) / 2;
            ctx.drawImage(bitmap, 0, 0, vw, vh, rect.x, DrawY, rect.w, drawH);
        } else {
            // Taller
            const drawW = rect.h * va;
            const DrawX = rect.x + (rect.w - drawW) / 2;
            ctx.drawImage(bitmap, 0, 0, vw, vh, DrawX, rect.y, drawW, rect.h);
        }
    }

    ctx.restore();
}
