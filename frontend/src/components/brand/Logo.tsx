import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  variant?: 'horizontal' | 'light' | 'dark' | 'wordmark';
  width?: number;
  height?: number;
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  width = 180,
  height = 36,
  className = '',
  href,
}) => {
  let src = '/brand/logo/primary-horizontal.png';

  if (variant === 'light') {
    src = '/brand/logo/logo-light.png';
  } else if (variant === 'dark') {
    src = '/brand/logo/logo-dark.png';
  } else if (variant === 'wordmark') {
    src = '/brand/logo/wordmark.png';
  }

  const imageElement = (
    <Image
      src={src}
      alt="LaunchProduct"
      width={width}
      height={height}
      priority
      className={`object-contain ${className}`}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
        {imageElement}
      </Link>
    );
  }

  return imageElement;
};

export default Logo;
