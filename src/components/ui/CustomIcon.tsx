import React from 'react';
import Image from 'next/image';

interface CustomIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16'
};

const sizeValues = {
  sm: 32,
  md: 40,
  lg: 64
};

export const CustomIcon: React.FC<CustomIconProps> = ({
  size = 'md',
  className = '',
  alt = '研究室アイコン'
}) => {
  const sizeClass = sizeClasses[size];
  const sizeValue = sizeValues[size];

  return (
    <Image
      src="/image/1000002408.jpg"
      alt={alt}
      width={sizeValue}
      height={sizeValue}
      className={`${sizeClass} rounded-lg object-cover ${className}`}
    />
  );
};