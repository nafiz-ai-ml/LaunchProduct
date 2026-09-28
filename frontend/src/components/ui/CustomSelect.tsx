'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
  disabled?: boolean;
}

export type RawOption = SelectOption | string;

export interface CustomSelectProps {
  options: RawOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  shape?: 'xl' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  align?: 'left' | 'right';
}

function normalizeOption(opt: RawOption): SelectOption {
  if (typeof opt === 'string') {
    return { value: opt, label: opt };
  }
  return opt;
}

export function CustomSelect({
  options = [],
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select option...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  id,
  name,
  ariaLabel,
  shape = 'xl',
  size = 'md',
  fullWidth = false,
  align = 'left',
}: CustomSelectProps) {
  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined
      ? controlledValue
      : defaultValue !== undefined
      ? defaultValue
      : ''
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const normalizedOptions = React.useMemo(() => {
    return options.map(normalizeOption);
  }, [options]);

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;

  const selectedOption = normalizedOptions.find((o) => o.value === currentValue);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape & support keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
          const currentIndex = normalizedOptions.findIndex((o) => o.value === currentValue);
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev < normalizedOptions.length - 1 ? prev + 1 : 0;
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : normalizedOptions.length - 1;
            return next;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
            const option = normalizedOptions[highlightedIndex];
            if (!option.disabled) {
              handleSelect(option.value);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, disabled, highlightedIndex, normalizedOptions, currentValue]
  );

  const handleSelect = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-2',
    md: 'text-sm px-4 py-2 gap-2.5',
    lg: 'text-base px-4.5 py-2.5 gap-3',
  };

  const shapeClasses = {
    xl: 'rounded-xl',
    pill: 'rounded-full',
  };

  const SelectedIcon = selectedOption?.icon;

  return (
    <div
      ref={containerRef}
      className={twMerge(
        'relative inline-block text-left select-none',
        fullWidth ? 'w-full' : '',
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for forms */}
      {name && <input type="hidden" name={name} value={currentValue} />}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={twMerge(
          clsx(
            'flex items-center justify-between border border-border bg-surface font-medium text-text-primary transition-all duration-150',
            'hover:border-border-hover hover:bg-slate-50 dark:hover:bg-slate-800/40',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            shapeClasses[shape],
            sizeClasses[size],
            fullWidth ? 'w-full' : 'min-w-[140px]',
            triggerClassName
          )
        )}
      >
        <span className="flex items-center gap-2 truncate text-left mr-1">
          {SelectedIcon && <SelectedIcon className="w-4 h-4 shrink-0 text-text-muted" />}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-text-muted">{placeholder}</span>}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-primary-subtle text-primary">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={twMerge(
            'w-4 h-4 text-text-muted shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180 text-primary' : ''
          )}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          className={twMerge(
            clsx(
              'absolute mt-1.5 min-w-[180px] rounded-2xl border border-border',
              'bg-surface-elevated/95 backdrop-blur-md shadow-popover p-1.5 z-50',
              'animate-in fade-in-0 zoom-in-95 duration-100 max-h-64 overflow-y-auto',
              align === 'right' ? 'right-0' : 'left-0',
              fullWidth ? 'w-full' : '',
              menuClassName
            )
          )}
        >
          {normalizedOptions.map((option, idx) => {
            const isSelected = option.value === currentValue;
            const isHighlighted = idx === highlightedIndex;
            const OptionIcon = option.icon;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={twMerge(
                  clsx(
                    'flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary-subtle text-primary font-semibold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-text-primary'
                      : 'text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-text-primary',
                    option.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                  )
                )}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {OptionIcon && (
                    <OptionIcon
                      className={twMerge(
                        'w-4 h-4 shrink-0',
                        isSelected ? 'text-primary' : 'text-text-muted'
                      )}
                    />
                  )}
                  <div className="truncate">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block text-xs text-text-muted font-normal truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {option.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 dark:bg-slate-800 text-text-secondary">
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
