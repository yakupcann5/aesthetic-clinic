import type { Metadata } from 'next';
import AppointmentForm from '@/components/forms/AppointmentForm';

export const metadata: Metadata = {
    title: 'Randevu Al | Aesthetic Clinic',
    description: 'Online randevu alın. Botoks, dolgu, lazer epilasyon ve diğer estetik işlemler için uzmanlarımızla görüşme planlayın.',
    openGraph: {
        title: 'Randevu Al | Aesthetic Clinic',
        description: 'Online randevu alın. Botoks, dolgu, lazer epilasyon ve diğer estetik işlemler için uzmanlarımızla görüşme planlayın.',
    },
};

export default function AppointmentPage() {
    return (
        <div className="min-h-screen pb-20">
            <AppointmentForm />
        </div>
    );
}
