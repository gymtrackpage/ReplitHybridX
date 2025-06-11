
import React from "react";

// Tooltip components temporarily disabled to fix React hooks error
// import * as TooltipPrimitive from "@radix-ui/react-tooltip"
// import { cn } from "@/lib/utils"

// Placeholder exports to prevent import errors
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => children;
export const Tooltip = ({ children }: { children: React.ReactNode }) => children;
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => children;
export const TooltipContent = ({ children }: { children: React.ReactNode }) => children;
