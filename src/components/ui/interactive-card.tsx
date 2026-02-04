import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

export interface InteractiveCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  interactive?: boolean
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, asChild = false, interactive = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        className={cn(className, interactive && "card-interactive")}
        {...props}
      />
    )
  }
)
InteractiveCard.displayName = "InteractiveCard"

export { InteractiveCard }
