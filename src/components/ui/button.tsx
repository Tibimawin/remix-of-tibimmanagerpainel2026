
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden active:scale-[0.97] cursor-pointer touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "modern-button text-primary-foreground shadow-minimal",
        destructive: cn(
          "bg-gradient-to-r from-red-500 to-red-600 text-white",
          "hover:from-red-600 hover:to-red-700 shadow-minimal",
          "border border-red-300"
        ),
        outline: cn(
          "border border-input bg-background",
          "hover:bg-accent hover:text-accent-foreground",
          "shadow-minimal hover:shadow-soft transition-all duration-200"
        ),
        secondary: cn(
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 shadow-minimal",
          "border border-border"
        ),
        ghost: cn(
          "hover:bg-accent hover:text-accent-foreground",
          "transition-all duration-200"
        ),
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base font-bold",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
