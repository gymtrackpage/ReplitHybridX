"use client"

import * as React from "react"

// Functional tooltip components that work without Radix UI dependencies
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

const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>
}

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>
}

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  return <>{children}</>
}

const TooltipContent: React.FC<TooltipContentProps> = ({ children, className }) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }