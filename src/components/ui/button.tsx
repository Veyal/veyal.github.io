import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl border-2 border-foreground text-sm font-extrabold text-foreground transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 shadow-[4px_4px_0_var(--ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--ink)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--candy-pink)]",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "bg-card hover:bg-[var(--candy-yellow)]",
        secondary: "bg-[var(--candy-sky)]",
        ghost:
          "border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none hover:bg-secondary active:translate-x-0 active:translate-y-0",
        link: "border-transparent shadow-none text-foreground underline decoration-[var(--candy-pink)] decoration-2 underline-offset-4 hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:translate-x-0 active:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
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
