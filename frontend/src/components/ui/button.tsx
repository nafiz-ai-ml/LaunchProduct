import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className = '',
}: ButtonStyleOptions = {}): string {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none whitespace-nowrap shrink-0';

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-sm shadow-primary/20 hover:shadow-primary/30',
    default:
      'bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-sm shadow-primary/20 hover:shadow-primary/30',
    secondary:
      'bg-surface text-text-primary border border-border hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-border-hover',
    outline:
      'bg-surface text-text-primary border border-border hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-border-hover',
    ghost:
      'bg-transparent text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-primary',
    danger:
      'bg-status-error hover:bg-red-600 text-white shadow-sm shadow-status-error/20',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-sm gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl',
    icon: 'p-2 w-9 h-9 gap-0 rounded-xl',
  };

  return twMerge(clsx(baseClasses, variantClasses[variant] || variantClasses.primary, sizeClasses[size] || sizeClasses.md, className));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
