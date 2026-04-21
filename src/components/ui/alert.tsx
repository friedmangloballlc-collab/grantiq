// src/components/ui/alert.tsx
//
// Inline alert component — 7 variants × 4 appearances × 3 sizes.
// Adapted from the shadcn/ui-style alert pattern to work with the
// existing Button in this codebase (which does not have the inverse /
// mode=icon / mode=link variants of the reference component).
//
// Usage:
//   <Alert variant="success" appearance="light">
//     <AlertIcon><CheckCircle2 /></AlertIcon>
//     <AlertContent>
//       <AlertTitle>Draft ready for review</AlertTitle>
//       <AlertDescription>We found 2 claims that need support.</AlertDescription>
//     </AlertContent>
//   </Alert>

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

const alertVariants = cva(
  "flex items-stretch w-full gap-2 group-[.toaster]:w-(--width)",
  {
    variants: {
      variant: {
        secondary: "",
        primary: "",
        destructive: "",
        success: "",
        info: "",
        mono: "",
        warning: "",
      },
      icon: {
        primary: "",
        destructive: "",
        success: "",
        info: "",
        warning: "",
      },
      appearance: {
        solid: "",
        outline: "",
        light: "",
        stroke: "text-foreground",
      },
      size: {
        lg: "rounded-lg p-4 gap-3 text-base [&>[data-slot=alert-icon]>svg]:size-6 *:data-slot=alert-icon:mt-0 *:data-slot=alert-close:mt-0.5 *:data-slot=alert-close:-me-0.5",
        md: "rounded-lg p-3.5 gap-2.5 text-sm [&>[data-slot=alert-icon]>svg]:size-5 *:data-slot=alert-icon:mt-0 *:data-slot=alert-close:-me-0.5",
        sm: "rounded-md px-3 py-2.5 gap-2 text-xs [&>[data-slot=alert-icon]>svg]:size-4 *:data-alert-icon:mt-0.5 *:data-slot=alert-close:-me-0.5 [&>[data-slot=alert-close]>svg]:size-3.5!",
      },
    },
    compoundVariants: [
      // Solid
      { variant: "secondary", appearance: "solid", className: "bg-muted text-foreground" },
      { variant: "primary", appearance: "solid", className: "bg-primary text-primary-foreground" },
      { variant: "destructive", appearance: "solid", className: "bg-destructive text-destructive-foreground" },
      { variant: "success", appearance: "solid", className: "bg-green-600 text-white" },
      { variant: "info", appearance: "solid", className: "bg-brand-teal text-white" },
      { variant: "warning", appearance: "solid", className: "bg-amber-500 text-white" },
      { variant: "mono", appearance: "solid", className: "bg-mono text-mono-foreground" },

      // Outline
      { variant: "secondary", appearance: "outline", className: "border border-border bg-background text-foreground" },
      { variant: "primary", appearance: "outline", className: "border border-border bg-background text-primary" },
      { variant: "destructive", appearance: "outline", className: "border border-border bg-background text-destructive" },
      { variant: "success", appearance: "outline", className: "border border-border bg-background text-green-600" },
      { variant: "info", appearance: "outline", className: "border border-border bg-background text-brand-teal-text" },
      { variant: "warning", appearance: "outline", className: "border border-border bg-background text-amber-600" },
      { variant: "mono", appearance: "outline", className: "border border-border bg-background text-mono" },

      // Stroke — icon-colored indicator, plain background
      { variant: "secondary", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-foreground" },
      { variant: "primary", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-primary" },
      { variant: "destructive", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-destructive" },
      { variant: "success", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-green-600" },
      { variant: "info", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-brand-teal" },
      { variant: "warning", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-amber-500" },
      { variant: "mono", appearance: "stroke", className: "border border-border bg-background [&>div:first-of-type>svg]:text-mono" },

      // Light — tinted bg with colored icon
      { variant: "secondary", appearance: "light", className: "bg-muted border border-border text-foreground" },
      { variant: "primary", appearance: "light", className: "bg-primary/5 border border-primary/10 text-foreground [&>div:first-of-type>svg]:text-primary" },
      { variant: "destructive", appearance: "light", className: "bg-destructive/5 border border-destructive/10 text-foreground [&>div:first-of-type>svg]:text-destructive" },
      { variant: "success", appearance: "light", className: "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-950/50 text-foreground [&>div:first-of-type>svg]:text-green-600" },
      { variant: "info", appearance: "light", className: "bg-brand-teal/10 border border-brand-teal/20 text-foreground [&>div:first-of-type>svg]:text-brand-teal-text" },
      { variant: "warning", appearance: "light", className: "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-foreground [&>div:first-of-type>svg]:text-amber-600" },

      // Mono with explicit icon tint
      { variant: "mono", icon: "primary", className: "[&>div:first-of-type>svg]:text-primary" },
      { variant: "mono", icon: "warning", className: "[&>div:first-of-type>svg]:text-amber-500" },
      { variant: "mono", icon: "success", className: "[&>div:first-of-type>svg]:text-green-600" },
      { variant: "mono", icon: "destructive", className: "[&>div:first-of-type>svg]:text-destructive" },
      { variant: "mono", icon: "info", className: "[&>div:first-of-type>svg]:text-brand-teal" },
    ],
    defaultVariants: {
      variant: "secondary",
      appearance: "solid",
      size: "md",
    },
  }
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  close?: boolean;
  onClose?: () => void;
}

type AlertIconProps = React.HTMLAttributes<HTMLDivElement>;

function Alert({
  className,
  variant,
  size,
  icon,
  appearance,
  close = false,
  onClose,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size, icon, appearance }), className)}
      {...props}
    >
      {children}
      {close && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          data-slot="alert-close"
          data-alert-close="true"
          className="group shrink-0 size-6 rounded-md inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <div
      data-slot="alert-title"
      className={cn("grow tracking-tight", className)}
      {...props}
    />
  );
}

function AlertIcon({ children, className, ...props }: AlertIconProps) {
  return (
    <div
      data-slot="alert-icon"
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AlertToolbar({ children, className, ...props }: AlertIconProps) {
  return (
    <div data-slot="alert-toolbar" className={cn(className)} {...props}>
      {children}
    </div>
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed [&_p]:mb-2", className)}
      {...props}
    />
  );
}

function AlertContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      data-slot="alert-content"
      className={cn(
        "space-y-2 [&_[data-slot=alert-title]]:font-semibold",
        className
      )}
      {...props}
    />
  );
}

export {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
};
