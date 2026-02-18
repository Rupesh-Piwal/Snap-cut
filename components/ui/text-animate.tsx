"use client";

import { ElementType, memo } from "react";
import { AnimatePresence, motion, MotionProps, Variants } from "motion/react";
import { cn } from "@/lib/utils";

type AnimationType = "text" | "word" | "character" | "line";

type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

interface TextAnimateProps extends MotionProps {
  children: string;
  className?: string;
  segmentClassName?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  as?: ElementType;
  by?: AnimationType;
  startOnView?: boolean;
  once?: boolean;
  animation?: AnimationVariant;
  accessible?: boolean;
}

const defaultContainer: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

const defaultItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

const animationPresets: Record<
  AnimationVariant,
  { container: Variants; item: Variants }
> = {
  fadeIn: {
    container: defaultContainer,
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
  blurIn: {
    container: defaultContainer,
    item: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      show: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(10px)" },
    },
  },
  blurInUp: {
    container: defaultContainer,
    item: {
      hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: { opacity: 0, y: 20, filter: "blur(10px)" },
    },
  },
  blurInDown: {
    container: defaultContainer,
    item: {
      hidden: { opacity: 0, y: -20, filter: "blur(10px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)" },
    },
  },
  slideUp: {
    container: defaultContainer,
    item: {
      hidden: { y: 20, opacity: 0 },
      show: { y: 0, opacity: 1 },
      exit: { y: -20, opacity: 0 },
    },
  },
  slideDown: {
    container: defaultContainer,
    item: {
      hidden: { y: -20, opacity: 0 },
      show: { y: 0, opacity: 1 },
      exit: { y: 20, opacity: 0 },
    },
  },
  slideLeft: {
    container: defaultContainer,
    item: {
      hidden: { x: 20, opacity: 0 },
      show: { x: 0, opacity: 1 },
      exit: { x: -20, opacity: 0 },
    },
  },
  slideRight: {
    container: defaultContainer,
    item: {
      hidden: { x: -20, opacity: 0 },
      show: { x: 0, opacity: 1 },
      exit: { x: 20, opacity: 0 },
    },
  },
  scaleUp: {
    container: defaultContainer,
    item: {
      hidden: { scale: 0.5, opacity: 0 },
      show: { scale: 1, opacity: 1 },
      exit: { scale: 0.5, opacity: 0 },
    },
  },
  scaleDown: {
    container: defaultContainer,
    item: {
      hidden: { scale: 1.5, opacity: 0 },
      show: { scale: 1, opacity: 1 },
      exit: { scale: 1.5, opacity: 0 },
    },
  },
};

const TextAnimateBase = ({
  children,
  delay = 0,
  duration = 1.5,
  variants,
  className,
  segmentClassName,
  as: Component = "p",
  startOnView = true,
  once = false,
  by = "word",
  animation = "fadeIn",
  accessible = true,
  ...props
}: TextAnimateProps) => {
  const MotionComponent = motion.create(Component);

  // Ensure safe string
  const text = typeof children === "string" ? children : "";

  let segments: string[] = [];

  switch (by) {
    case "word":
      segments = text.split(/(\s+)/);
      break;
    case "character":
      segments = text.split("");
      break;
    case "line":
      segments = text.split("\n");
      break;
    default:
      segments = [text];
  }

  const segmentCount = segments.length || 1;
  const stagger = duration / segmentCount;

  const preset = animationPresets[animation];

  const containerVariants: Variants = {
    hidden: preset.container.hidden,
    show: {
      ...preset.container.show,
      transition: {
        delayChildren: delay,
        staggerChildren: stagger,
      },
    },
    exit: {
      ...preset.container.exit,
      transition: {
        staggerChildren: stagger,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = variants ?? preset.item;

  return (
    <AnimatePresence mode="popLayout">
      <MotionComponent
        variants={containerVariants}
        initial="hidden"
        whileInView={startOnView ? "show" : undefined}
        animate={!startOnView ? "show" : undefined}
        exit="exit"
        viewport={{ once }}
        className={cn(
          "whitespace-pre-wrap text-5xl md:text-6xl text-white mb-6 tracking-wide max-w-3xl quote",
          className,
        )}
        aria-label={accessible ? text : undefined}
        {...props}
      >
        {accessible && <span className="sr-only">{text}</span>}

        {segments.map((segment, i) => {
          if (segment === "\n") {
            return <br key={`br-${i}`} />;
          }

          return (
            <motion.span
              key={`${segment}-${i}`}
              variants={itemVariants}
              className={cn(
                by === "line" ? "block" : "inline-block whitespace-pre",
                segmentClassName,
              )}
              aria-hidden={accessible ? true : undefined}
            >
              {segment}
            </motion.span>
          );
        })}
      </MotionComponent>
    </AnimatePresence>
  );
};

export const TextAnimate = memo(TextAnimateBase);
