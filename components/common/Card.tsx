import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glass?: boolean;
}

export default function Card({ children, className = '', hover = false, glass = false }: CardProps) {
    const baseStyles = 'rounded-2xl p-6';
    const glassStyles = glass ? 'glass-card' : 'bg-white shadow-lg';
    const hoverStyles = hover ? 'card-hover' : '';

    return (
        <div className={`${baseStyles} ${glassStyles} ${hoverStyles} ${className}`}>
            {children}
        </div>
    );
}
