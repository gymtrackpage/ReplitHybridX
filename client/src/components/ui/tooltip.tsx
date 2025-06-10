import * as React from "react"

// Tooltip component disabled to prevent React hook conflicts
// If tooltips are needed, implement a simpler solution without @radix-ui/react-tooltip

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipContent = ({ children }: { children?: React.ReactNode }) => null
