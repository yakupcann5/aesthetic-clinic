'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, Mail } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
    { name: 'Ana Sayfa', href: '/' },
    { name: 'Hizmetler', href: '/hizmetler' },
    { name: 'Ürünler', href: '/urunler' },
    { name: 'Galeri', href: '/galeri' },
    { name: 'Blog', href: '/blog' },
    { name: 'İletişim', href: '/iletisim' },
];

export default function Header() {
    const pathname = usePathname();
    const { isMenuOpen, toggleMenu, closeMenu } = useStore();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2" onClick={closeMenu}>
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">A</span>
                        </div>
                        <span className="text-2xl font-display font-bold gradient-text">
                            Aesthetic Clinic
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-8">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`text-sm font-medium transition-colors hover:text-primary-600 ${pathname === item.href
                                        ? 'text-primary-600'
                                        : 'text-gray-700'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA Button */}
                    <div className="hidden lg:flex items-center space-x-4">
                        <a href="tel:+905551234567" className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm font-medium">0555 123 45 67</span>
                        </a>
                        <Link href="/randevu" className="btn-primary">
                            Randevu Al
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMenu}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6 text-gray-700" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-700" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="lg:hidden border-t border-gray-200 bg-white"
                    >
                        <nav className="px-4 py-6 space-y-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={closeMenu}
                                    className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${pathname === item.href
                                            ? 'bg-primary-50 text-primary-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-gray-200 space-y-3">
                                <a
                                    href="tel:+905551234567"
                                    className="flex items-center space-x-2 px-4 py-2 text-gray-700"
                                >
                                    <Phone className="w-5 h-5" />
                                    <span>0555 123 45 67</span>
                                </a>
                                <Link href="/randevu" onClick={closeMenu} className="block">
                                    <button className="w-full btn-primary">Randevu Al</button>
                                </Link>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
