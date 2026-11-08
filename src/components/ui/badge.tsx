import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm hover:shadow-md hover:from-primary/90 hover:to-primary/70",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground shadow-sm hover:shadow-md hover:from-secondary/90 hover:to-secondary/70",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-red-500 text-destructive-foreground shadow-sm hover:shadow-md hover:from-destructive/90 hover:to-red-600",
        outline: 
          "text-foreground border-border/60 hover:bg-accent/50 hover:text-accent-foreground hover:border-accent",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm hover:shadow-md hover:from-green-600 hover:to-emerald-600",
        warning:
          "border-transparent bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm hover:shadow-md hover:from-amber-600 hover:to-yellow-600",
        info:
          "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm hover:shadow-md hover:from-blue-600 hover:to-cyan-600",
        danger:
          "border-transparent bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm hover:shadow-md hover:from-red-600 hover:to-orange-600 animate-pulse",
        purple:
          "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm hover:shadow-md hover:from-purple-600 hover:to-pink-600",
        ghost:
          "border-transparent hover:bg-accent/50 hover:text-accent-foreground",
        premium:
          "border-transparent bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white shadow-lg hover:shadow-xl animate-gradient bg-[length:200%_auto]",
        new:
          "border-transparent bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm hover:shadow-md animate-pulse",
        beta:
          "border-transparent bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white shadow-sm hover:shadow-md backdrop-blur-sm",
        glass:
          "border-border/40 bg-background/30 backdrop-blur-md hover:bg-background/40 hover:border-border/60",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] gap-0.5",
        default: "px-2.5 py-0.5 text-xs gap-1",
        lg: "px-3 py-1 text-sm gap-1.5",
        xl: "px-4 py-1.5 text-base gap-2",
      },
      rounded: {
        default: "rounded-full",
        sm: "rounded-md",
        lg: "rounded-lg",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ 
  className, 
  variant, 
  size, 
  rounded, 
  dot = false, 
  pulse = false,
  children,
  ...props 
}: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size, rounded }), 
        pulse && "animate-pulse",
        className
      )} 
      {...props}
    >
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          pulse && "animate-pulse",
          variant === "success" && "bg-green-300",
          variant === "warning" && "bg-yellow-300",
          variant === "danger" && "bg-red-300",
          variant === "info" && "bg-blue-300",
          variant === "default" && "bg-primary-foreground",
          !variant && "bg-primary-foreground"
        )} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
