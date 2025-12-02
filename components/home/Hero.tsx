import Link from 'next/link';
import { ArrowRight, Sparkles, Users, Award, Clock } from 'lucide-react';
import Button from '@/components/common/Button';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse-slow"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse-slow animation-delay-200"></div>
                <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse-slow animation-delay-400"></div>
            </div>

            <div className="relative section-container">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="space-y-8 animate-fade-in">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-50 rounded-full">
                            <Sparkles className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-medium text-primary-600">
                                Türkiye'nin Önde Gelen Estetik Kliniği
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
                            Güzelliğiniz İçin
                            <span className="block gradient-text">En İyi Hizmet</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl">
                            Modern teknoloji ve uzman kadromuzla botoks, dolgu, lazer epilasyon ve daha fazlası.
                            Güvenli, etkili ve doğal sonuçlar için bize güvenin.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/randevu">
                                <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                                    Hemen Randevu Alın
                                </Button>
                            </Link>
                            <Link href="/hizmetler">
                                <Button variant="outline" size="lg">
                                    Hizmetlerimizi Keşfedin
                                </Button>
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-8">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <Users className="w-5 h-5 text-primary-600" />
                                    <p className="text-3xl font-bold text-gray-900">15K+</p>
                                </div>
                                <p className="text-sm text-gray-600">Mutlu Müşteri</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <Award className="w-5 h-5 text-primary-600" />
                                    <p className="text-3xl font-bold text-gray-900">98%</p>
                                </div>
                                <p className="text-sm text-gray-600">Memnuniyet</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-5 h-5 text-primary-600" />
                                    <p className="text-3xl font-bold text-gray-900">12+</p>
                                </div>
                                <p className="text-sm text-gray-600">Yıl Tecrübe</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Content - Image Placeholder */}
                    <div className="relative animate-slide-up animation-delay-200">
                        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-400 opacity-20"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Sparkles className="w-24 h-24 mx-auto text-primary-600 opacity-50" />
                                    <p className="text-2xl font-display font-bold text-gray-700">
                                        Hero Image
                                    </p>
                                    <p className="text-gray-600">
                                        Buraya klinik veya tedavi görseli eklenecek
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Floating Card */}
                        <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 max-w-xs glass-card">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Sertifikalı Uzmanlar</p>
                                    <p className="text-sm text-gray-600">Deneyimli kadro</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
