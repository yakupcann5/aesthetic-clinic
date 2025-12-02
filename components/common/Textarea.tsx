'use client';

import { forwardRef, TextareaHTMLAttributes, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
    autoResize?: boolean;
    maxLength?: number;
    showCharCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({
        className,
        label,
        error,
        helperText,
        id,
        autoResize = false,
        maxLength,
        showCharCount = false,
        value,
        ...props
    }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        useEffect(() => {
            if (autoResize && internalRef.current) {
                const textarea = internalRef.current;
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }, [value, autoResize]);

        const handleRef = (node: HTMLTextAreaElement) => {
            internalRef.current = node;
            if (typeof ref === 'function') {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        };

        const currentLength = typeof value === 'string' ? value.length : 0;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <textarea
                    ref={handleRef}
                    id={inputId}
                    maxLength={maxLength}
                    value={value}
                    className={cn(
                        'w-full px-4 py-2.5 rounded-lg border transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                        'resize-none',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-gray-300',
                        className
                    )}
                    {...props}
                />
                <div className="flex justify-between items-start mt-1.5">
                    <div className="flex-1">
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                        {helperText && !error && (
                            <p className="text-sm text-gray-500">{helperText}</p>
                        )}
                    </div>
                    {showCharCount && maxLength && (
                        <p className={cn(
                            'text-sm ml-2',
                            currentLength > maxLength * 0.9 ? 'text-orange-600' : 'text-gray-500'
                        )}>
                            {currentLength}/{maxLength}
                        </p>
                    )}
                </div>
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
