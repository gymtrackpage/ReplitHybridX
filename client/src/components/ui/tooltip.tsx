import * as React from "react"

// Simple tooltip components without Radix UI dependencies
interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface TooltipContentProps {
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

const TooltipProvider = ({ children }: TooltipProviderProps) => {
  return <div>{children}</div>
}

const Tooltip = ({ children }: TooltipProps) => {
  return <div>{children}</div>
}

const TooltipTrigger = ({ children }: TooltipTriggerProps) => {
  return <div>{children}</div>
}

const TooltipContent = ({ children, className }: TooltipContentProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }