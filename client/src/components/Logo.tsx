
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  if (imageError) {
    return (
      <div className={`${sizeClasses[size]} bg-yellow-400 rounded-lg flex items-center justify-center ${className}`}>
        <span className={`text-black font-bold ${textSizeClasses[size]}`}>HX</span>
      </div>
    );
  }

  return (
    <img 
      src="/logo-x.png" 
      alt="HybridX Logo" 
      className={`${sizeClasses[size]} ${className}`}
      onError={(e) => {
        console.error('Logo failed to load, switching to fallback');
        setImageError(true);
      }}
      onLoad={() => console.log('Logo loaded successfully')}
    />
  );
}
