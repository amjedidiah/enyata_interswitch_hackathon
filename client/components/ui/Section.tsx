"use client";

import { useInView, Variants } from "framer-motion";
import { useRef, PropsWithChildren } from "react";
import Motion from "@/components/shared/Motion";

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.11 } },
};

function Section({
  children,
  className = "",
}: Readonly<
  PropsWithChildren<{
    className?: string;
  }>
>) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-72px" });
  return (
    <Motion
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </Motion>
  );
}

export default Section;
