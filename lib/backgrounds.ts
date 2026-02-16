export type BackgroundType = "none" | "image" | "gradient";

export interface BackgroundOption {
    id: string;
    label: string;
    type: BackgroundType;
    value: string; // URL for image, CSS gradient string for gradient
    preview: string; // Thumbnail preview (color or small image)
}

export const BACKGROUND_GRADIENTS: BackgroundOption[] = [
    {
        id: "gradient-sunset",
        label: "Sunset",
        type: "gradient",
        value: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
        preview: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
    },
    {
        id: "gradient-ocean",
        label: "Ocean",
        type: "gradient",
        value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        preview: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    },
    {
        id: "gradient-purple",
        label: "Purple Haze",
        type: "gradient",
        value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
        id: "gradient-green",
        label: "Emerald",
        type: "gradient",
        value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)",
        preview: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)"
    },
    {
        id: "gradient-dark",
        label: "Midnight",
        type: "gradient",
        value: "linear-gradient(135deg, #232526 0%, #414345 100%)",
        preview: "linear-gradient(135deg, #232526 0%, #414345 100%)"
    },
    {
        id: "gradient-warm",
        label: "Warmth",
        type: "gradient",
        value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
        preview: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)"
    },
    {
        id: "gradient-cool",
        label: "Cool Breeze",
        type: "gradient",
        value: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
        preview: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)"
    },
    {
        id: "gradient-neon",
        label: "Neon Life",
        type: "gradient",
        value: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)",
        preview: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)"
    },
    {
        id: "gradient-love",
        label: "Passion",
        type: "gradient",
        value: "linear-gradient(to top, #f43b47 0%, #453a94 100%)",
        preview: "linear-gradient(to top, #f43b47 0%, #453a94 100%)"
    },
    {
        id: "gradient-space",
        label: "Deep Space",
        type: "gradient",
        value: "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
        preview: "linear-gradient(to top, #30cfd0 0%, #330867 100%)"
    }
];

export const BACKGROUND_IMAGES: BackgroundOption[] = [
    {
        id: "image-1",
        label: "Background 1",
        type: "image",
        value: "/backgrounds/1.png",
        preview: "/backgrounds/1.png"
    },
    {
        id: "image-2",
        label: "Background 2",
        type: "image",
        value: "/backgrounds/2.png",
        preview: "/backgrounds/2.png"
    },
    {
        id: "image-3",
        label: "Background 3",
        type: "image",
        value: "/backgrounds/3.png",
        preview: "/backgrounds/3.png"
    },
    {
        id: "image-4",
        label: "Background 4",
        type: "image",
        value: "/backgrounds/4.png",
        preview: "/backgrounds/4.png"
    },
    {
        id: "image-5",
        label: "Background 5",
        type: "image",
        value: "/backgrounds/5.png",
        preview: "/backgrounds/5.png"
    },
    {
        id: "image-6",
        label: "Background 6",
        type: "image",
        value: "/backgrounds/6.png",
        preview: "/backgrounds/6.png"
    },
    {
        id: "image-7",
        label: "Background 7",
        type: "image",
        value: "/backgrounds/7.jpg",
        preview: "/backgrounds/7.jpg"
    },
    {
        id: "image-8",
        label: "Background 8",
        type: "image",
        value: "/backgrounds/8.jpg",
        preview: "/backgrounds/8.jpg"
    },
    {
        id: "image-9",
        label: "Background 9",
        type: "image",
        value: "/backgrounds/9.png",
        preview: "/backgrounds/9.png"
    }
];

export const NO_BACKGROUND: BackgroundOption = {
    id: "none",
    label: "None",
    type: "none",
    value: "#000000",
    preview: "#000000"
};
