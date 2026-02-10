'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryFilterProps<T> {
  categories: CategoryOption[];
  items: T[];
  filterKey: keyof T;
  renderItems: (filteredItems: T[]) => React.ReactNode;
}

export default function CategoryFilter<T>({
  categories,
  items,
  filterKey,
  renderItems,
}: CategoryFilterProps<T>) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item[filterKey] === selectedCategory);

  return (
    <>
      <section className="py-8 border-b border-gray-100 bg-white">
        <div className="section-container py-0">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={cn(
                  'px-4 sm:px-6 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300',
                  selectedCategory === category.value
                    ? 'bg-primary-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {renderItems(filteredItems)}
    </>
  );
}
