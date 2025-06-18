
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full' | 'white';
}

export function Logo({ className = '', size = 'md', variant = 'icon' }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: variant === 'full' ? 'h-6' : 'h-6 w-6',
    md: variant === 'full' ? 'h-8' : 'h-8 w-8',
    lg: variant === 'full' ? 'h-12' : 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  const logoSources = {
    icon: '/logo-icon.png',
    full: '/logo-full.png',
    white: '/logo-white.png'
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
      src={logoSources[variant]} 
      alt="HybridX Logo" 
      className={`${sizeClasses[size]} object-contain ${className}`}
      onError={(e) => {
        console.error('Logo failed to load, switching to fallback');
        setImageError(true);
      }}
      onLoad={() => console.log('Logo loaded successfully')}
    />
  );
}
