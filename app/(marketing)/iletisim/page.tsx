import type { Metadata } from 'next';
import ContactForm from '@/components/forms/ContactForm';

export const metadata: Metadata = {
    title: 'İletişim | Aesthetic Clinic',
    description: 'Aesthetic Clinic ile iletişime geçin. Bağdat Caddesi No: 123, Kadıköy, İstanbul. Telefon: 0555 123 45 67.',
    openGraph: {
        title: 'İletişim | Aesthetic Clinic',
        description: 'Aesthetic Clinic ile iletişime geçin. Bağdat Caddesi No: 123, Kadıköy, İstanbul.',
    },
};

export default function ContactPage() {
    return (
        <div className="min-h-screen pb-20">
            <ContactForm />
        </div>
    );
}
