import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-2xl border-2 border-pink-300 dark:border-pink-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2 text-sm font-medium shadow-md transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-pink-300 dark:placeholder:text-pink-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-400 focus-visible:border-pink-400 hover:border-pink-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
