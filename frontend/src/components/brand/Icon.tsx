import React from 'react';
import Image from 'next/image';

interface IconProps {
  size?: number;
  className?: string;
}

export const BrandIcon: React.FC<IconProps> = ({ size = 32, className = '' }) => {
  return (
    <Image
      src="/brand/icon/icon.png"
      alt="LaunchProduct Icon"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
};

export default BrandIcon;
