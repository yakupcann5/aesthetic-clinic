import Link from 'next/link';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const footerLinks = {
    hizmetler: [
        { name: 'Botoks', href: '/hizmetler/botoks' },
        { name: 'Dolgu', href: '/hizmetler/dolgu' },
        { name: 'Lazer Epilasyon', href: '/hizmetler/lazer-epilasyon' },
        { name: 'PRP Tedavisi', href: '/hizmetler/prp' },
    ],
    kurumsal: [
        { name: 'Hakkımızda', href: '/hakkimizda' },
        { name: 'Ekibimiz', href: '/ekibimiz' },
        { name: 'Blog', href: '/blog' },
        { name: 'İletişim', href: '/iletisim' },
    ],
    bilgi: [
        { name: 'SSS', href: '/sss' },
        { name: 'Gizlilik Politikası', href: '/gizlilik' },
        { name: 'Kullanım Koşulları', href: '/kosullar' },
        { name: 'KVKK', href: '/kvkk' },
    ],
};

const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Youtube', icon: Youtube, href: '#' },
];

export default function Footer() {
    return (
        <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">A</span>
                            </div>
                            <span className="text-2xl font-display font-bold text-white">
                                Aesthetic Clinic
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Güzelliğiniz için en son teknoloji ve uzman kadromuzla hizmetinizdeyiz.
                        </p>
                        <div className="flex space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition-colors"
                                    aria-label={social.name}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Hizmetlerimiz</h3>
                        <ul className="space-y-2">
                            {footerLinks.hizmetler.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm hover:text-primary-400 transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">Kurumsal</h3>
                        <ul className="space-y-2">
                            {footerLinks.kurumsal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm hover:text-primary-400 transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">İletişim</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start space-x-3">
                                <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">
                                    Bağdat Caddesi No: 123<br />
                                    Kadıköy, İstanbul
                                </span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                                <a href="tel:+905551234567" className="text-sm hover:text-primary-400 transition-colors">
                                    0555 123 45 67
                                </a>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                                <a href="mailto:info@aestheticclinic.com" className="text-sm hover:text-primary-400 transition-colors">
                                    info@aestheticclinic.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-400">
                            © {new Date().getFullYear()} Aesthetic Clinic. Tüm hakları saklıdır.
                        </p>
                        <div className="flex space-x-6">
                            {footerLinks.bilgi.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
