import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  variant?: 'auto' | 'horizontal' | 'light' | 'dark' | 'wordmark' | 'icon';
  width?: number;
  height?: number;
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'auto',
  width = 160,
  height = 36,
  className = '',
  href,
}) => {
  if (variant === 'light') {
    const el = (
      <Image
        src="/brand/logo/light_theme_logo.png"
        alt="LaunchProduct"
        width={width}
        height={height}
        priority
        className={`object-contain ${className}`}
      />
    );
    return href ? <Link href={href} className="inline-flex items-center focus:outline-none">{el}</Link> : el;
  }

  if (variant === 'dark') {
    const el = (
      <Image
        src="/brand/logo/dark_theme_logo.png"
        alt="LaunchProduct"
        width={width}
        height={height}
        priority
        className={`object-contain ${className}`}
      />
    );
    return href ? <Link href={href} className="inline-flex items-center focus:outline-none">{el}</Link> : el;
  }

  // Dual theme responsive (automatic switch between light and dark):
  let lightSrc = '/brand/logo/light_theme_logo.png';
  let darkSrc = '/brand/logo/dark_theme_logo.png';

  if (variant === 'wordmark') {
    lightSrc = '/brand/logo/light_theme_wordmark_only.png';
    darkSrc = '/brand/logo/dark_theme__wordmark_only.png';
  } else if (variant === 'icon') {
    lightSrc = '/brand/icon/Light%20Theme%20Icon%20Only.png';
    darkSrc = '/brand/icon/Dark%20Theme%20Icon%20Only.png';
  }

  const dualElement = (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={lightSrc}
        alt="LaunchProduct"
        width={width}
        height={height}
        priority
        className="block dark:hidden object-contain"
      />
      <Image
        src={darkSrc}
        alt="LaunchProduct"
        width={width}
        height={height}
        priority
        className="hidden dark:block object-contain"
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
        {dualElement}
      </Link>
    );
  }

  return dualElement;
};

export default Logo;


