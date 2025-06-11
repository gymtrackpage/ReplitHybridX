"use client"

import * as React from "react"

// Simple tooltip implementation without Radix UI dependencies
interface TooltipProps {
  children: React.ReactNode
  content?: string
}

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
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
  return <>{children}</>
}

const Tooltip = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const TooltipTrigger = ({ children }: TooltipTriggerProps) => {
  return <>{children}</>
}

const TooltipContent = ({ children, className }: TooltipContentProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
}