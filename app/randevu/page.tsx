'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Check, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Textarea from '@/components/common/Textarea';
import { services } from '@/lib/data/services';

const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
];

export default function AppointmentPage() {
    const [step, setStep] = useState(1);
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const selectedService = watch('service');

    const onSubmit = (data: any) => {
        console.log(data);
        setStep(3); // Success step
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Section */}
            <section className="py-20 bg-primary-50">
                <div className="section-container text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-6">
                            Randevu Alın
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Size özel bir deneyim için hemen randevunuzu oluşturun. Uzmanlarımız en kısa sürede sizinle iletişime geçecektir.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="section-container">
                <div className="max-w-4xl mx-auto">
                    {/* Progress Steps */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10" />
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-sm font-medium text-gray-600">
                            <span>Hizmet & Tarih</span>
                            <span>Kişisel Bilgiler</span>
                            <span>Onay</span>
                        </div>
                    </div>

                    <div className="glass-card p-8 md:p-12">
                        {step === 3 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
                                    Randevu Talebiniz Alındı!
                                </h2>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                    Talebiniz bize ulaştı. En kısa sürede sizinle iletişime geçerek randevunuzu kesinleştireceğiz.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="btn-primary"
                                >
                                    Ana Sayfaya Dön
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)}>
                                {step === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="space-y-8"
                                    >
                                        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                                            <Calendar className="w-6 h-6 text-primary-600" />
                                            Hizmet ve Tarih Seçimi
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Select
                                                label="Hizmet Seçiniz"
                                                options={services.map(s => ({ value: s.title, label: s.title }))}
                                                placeholder="Hizmet Seçiniz"
                                                {...register('service', { required: 'Lütfen bir hizmet seçiniz' })}
                                                error={errors.service?.message as string}
                                            />
                                            <Input
                                                type="date"
                                                label="Tarih Seçiniz"
                                                min={new Date().toISOString().split('T')[0]}
                                                {...register('date', { required: 'Lütfen bir tarih seçiniz' })}
                                                error={errors.date?.message as string}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                                Saat Seçiniz
                                            </label>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                                {timeSlots.map((time) => (
                                                    <label key={time} className="relative cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            value={time}
                                                            {...register('time', { required: 'Saat seçimi zorunludur' })}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="px-2 py-2 text-center text-sm rounded-lg border border-gray-200 hover:border-primary-500 peer-checked:bg-primary-600 peer-checked:text-white peer-checked:border-primary-600 transition-all">
                                                            {time}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            {errors.time && (
                                                <p className="mt-2 text-sm text-red-600">{errors.time.message as string}</p>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-6">
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                Devam Et
                                                <Clock className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="space-y-8"
                                    >
                                        <h2 className="text-2xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                                            <User className="w-6 h-6 text-primary-600" />
                                            Kişisel Bilgiler
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="Adınız Soyadınız"
                                                placeholder="Adınız Soyadınız"
                                                {...register('name', { required: 'Bu alan zorunludur' })}
                                                error={errors.name?.message as string}
                                            />
                                            <Input
                                                label="Telefon Numaranız"
                                                type="tel"
                                                placeholder="0555 555 55 55"
                                                {...register('phone', { required: 'Bu alan zorunludur' })}
                                                error={errors.phone?.message as string}
                                            />
                                        </div>

                                        <Input
                                            label="E-posta Adresiniz"
                                            type="email"
                                            placeholder="ornek@email.com"
                                            {...register('email', {
                                                required: 'Bu alan zorunludur',
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: 'Geçersiz e-posta adresi'
                                                }
                                            })}
                                            error={errors.email?.message as string}
                                        />

                                        <Textarea
                                            label="Notlarınız (Opsiyonel)"
                                            placeholder="Varsa eklemek istedikleriniz..."
                                            rows={4}
                                            {...register('notes')}
                                        />

                                        <div className="flex justify-between pt-6">
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="btn-outline"
                                            >
                                                Geri Dön
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                Randevu Oluştur
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
