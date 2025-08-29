import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-400 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-lg hover:from-pink-500 hover:to-pink-600 hover:shadow-xl",
        destructive:
          "bg-gradient-to-br from-red-400 to-red-500 text-white shadow-lg hover:from-red-500 hover:to-red-600 hover:shadow-xl",
        outline:
          "border-2 border-pink-300 bg-white/80 backdrop-blur-sm shadow-md hover:bg-pink-50 hover:border-pink-400 hover:shadow-lg",
        secondary:
          "bg-gradient-to-br from-purple-300 to-purple-400 text-white shadow-md hover:from-purple-400 hover:to-purple-500 hover:shadow-lg",
        ghost: "hover:bg-pink-100 hover:text-pink-700",
        link: "text-pink-600 underline-offset-4 hover:underline decoration-wavy",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-lg",
        icon: "h-10 w-10",
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
