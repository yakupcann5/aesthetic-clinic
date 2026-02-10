import { Users, Award, Clock, Star } from 'lucide-react';

const stats = [
    {
        icon: Users,
        value: '15,000+',
        label: 'Mutlu Müşteri',
        description: 'Güvenle hizmet verdiğimiz müşteri sayısı',
    },
    {
        icon: Award,
        value: '98%',
        label: 'Memnuniyet Oranı',
        description: 'Müşteri memnuniyeti ve tavsiye oranı',
    },
    {
        icon: Clock,
        value: '12+',
        label: 'Yıl Tecrübe',
        description: 'Estetik alanında profesyonel deneyim',
    },
    {
        icon: Star,
        value: '4.9/5',
        label: 'Müşteri Puanı',
        description: 'Ortalama müşteri değerlendirmesi',
    },
];

export default function Statistics() {
    return (
        <section className="section-container bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white">
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
                    Rakamlarla Biz
                </h2>
                <p className="text-base sm:text-lg text-primary-100">
                    Yıllardır süren deneyimimiz ve memnun müşterilerimizle gurur duyuyoruz
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`text-center space-y-4 animate-scale-in animation-delay-${index * 200}`}
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl">
                            <stat.icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2">{stat.value}</p>
                            <p className="text-base sm:text-lg md:text-xl font-semibold mb-1">{stat.label}</p>
                            <p className="text-sm text-primary-100">{stat.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
