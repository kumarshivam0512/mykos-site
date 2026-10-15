"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";
import styles from "./interactive-hover-button.module.css";

interface InteractiveHoverButtonProps extends Omit<ComponentProps<typeof Link>, "children"> {
  text: string;
  compact?: boolean;
}

const InteractiveHoverButton = forwardRef<HTMLAnchorElement, InteractiveHoverButtonProps>(
  ({ text, compact = false, className, ...props }, ref) => (
    <Link
      ref={ref}
      {...props}
      className={`${styles.button}${compact ? ` ${styles.compact}` : ""}${className ? ` ${className}` : ""}`}
    >
      <span className={styles.srOnly}>{text}</span>
      <span className={styles.label} aria-hidden="true">{text}</span>
      <span className={styles.reveal} aria-hidden="true">
        {text}
        <ArrowRight size={17} />
      </span>
    </Link>
  ),
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
