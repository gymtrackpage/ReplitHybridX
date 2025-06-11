
import React from "react";

// Simplified tooltip components to avoid React hooks errors
export const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipContent: React.FC<{ 
  children: React.ReactNode; 
  side?: string; 
  align?: string; 
  hidden?: boolean;
  [key: string]: any;
}> = ({ children }) => {
  return <>{children}</>;
};
