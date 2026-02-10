import { Star, Quote } from 'lucide-react';
import Card from '@/components/common/Card';

const testimonials = [
    {
        id: 1,
        name: 'Ayşe K.',
        service: 'Botoks Uygulaması',
        rating: 5,
        comment: 'Harika bir deneyimdi! Sonuçlar çok doğal ve beklentilerimin üzerinde. Ekip çok profesyonel ve ilgili.',
        date: '2024-11-15',
    },
    {
        id: 2,
        name: 'Mehmet D.',
        service: 'Lazer Epilasyon',
        rating: 5,
        comment: 'Lazer epilasyon için tam 6 seans tamamladım. Sonuçlar mükemmel! Artık tüy problemim yok.',
        date: '2024-11-10',
    },
    {
        id: 3,
        name: 'Zeynep Y.',
        service: 'Dudak Dolgusu',
        rating: 5,
        comment: 'Dudak dolgusundan çok memnun kaldım. Doğal ve şık bir görünüm elde ettim. Teşekkürler!',
        date: '2024-11-05',
    },
];

export default function Testimonials() {
    return (
        <section className="section-container bg-gradient-to-br from-slate-50 to-purple-50">
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
                    Müşteri <span className="gradient-text">Yorumları</span>
                </h2>
                <p className="text-base sm:text-lg text-gray-600">
                    Binlerce mutlu müşterimizin deneyimlerinden bazıları
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {testimonials.map((testimonial, index) => (
                    <Card
                        key={testimonial.id}
                        glass
                        className={`animate-slide-up animation-delay-${index * 200}`}
                    >
                        <div className="space-y-4">
                            {/* Quote Icon */}
                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                <Quote className="w-6 h-6 text-primary-600" />
                            </div>

                            {/* Rating */}
                            <div className="flex space-x-1">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>

                            {/* Comment */}
                            <p className="text-gray-700 leading-relaxed">
                                &ldquo;{testimonial.comment}&rdquo;
                            </p>

                            {/* Author Info */}
                            <div className="pt-4 border-t border-gray-200">
                                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                                <p className="text-sm text-gray-600">{testimonial.service}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </section>
    );
}
