"use client";

import { ReactNode } from "react";
import {
  motion,
  type HTMLMotionProps,
  type SVGMotionProps,
} from "framer-motion";

type HTMLMotionElement =
  | "div"
  | "article"
  | "section"
  | "span"
  | "h1"
  | "h2"
  | "li"
  | "p";
type SVGMotionElement = "circle";
export type MotionElement = HTMLMotionElement | SVGMotionElement;

const motionElements = {
  div: motion.div,
  article: motion.article,
  section: motion.section,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  li: motion.li,
  p: motion.p,
  circle: motion.circle,
} as const;

type MotionProps = (
  | HTMLMotionProps<"div">
  | SVGMotionProps<SVGCircleElement>
) & {
  as?: MotionElement;
  children?: ReactNode;
};

function Motion({ as = "div", children, ...props }: Readonly<MotionProps>) {
  const Component = motionElements[as];
  return <Component {...(props as object)}>{children}</Component>;
}

export default Motion;
