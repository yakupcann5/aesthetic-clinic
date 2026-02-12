'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import { useForm } from 'react-hook-form';
import type { ContactFormData } from '@/lib/types';

export default function ContactForm() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>();
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const onSubmit = async (data: ContactFormData) => {
        setSubmitting(true);
        setSubmitStatus('idle');
        setSubmitError(null);
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || 'Bir hata oluştu');
            }
            setSubmitStatus('success');
            reset();
        } catch (err) {
            setSubmitStatus('error');
            setSubmitError(err instanceof Error ? err.message : 'Mesaj gönderilirken bir hata oluştu');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <section className="py-12 sm:py-16 md:py-20 bg-primary-50">
                <div className="section-container text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
                            İletişim
                        </h1>
                        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                            Sorularınız, randevu talepleriniz veya önerileriniz için bize ulaşın. Size yardımcı olmaktan mutluluk duyarız.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="section-container">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* Contact Info */}
                    <div className="lg:col-span-1 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8"
                        >
                            <div>
                                <h3 className="text-xl font-display font-bold text-gray-900 mb-6">
                                    İletişim Bilgileri
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Telefon</p>
                                            <a href="tel:+905551234567" className="text-gray-900 font-medium hover:text-primary-600 transition-colors">
                                                0555 123 45 67
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">E-posta</p>
                                            <a href="mailto:info@aestheticclinic.com" className="text-gray-900 font-medium hover:text-primary-600 transition-colors">
                                                info@aestheticclinic.com
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Adres</p>
                                            <p className="text-gray-900 font-medium">
                                                Bağdat Caddesi No: 123<br />
                                                Kadıköy, İstanbul
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-lg font-display font-bold text-gray-900 mb-4">
                                    Çalışma Saatleri
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Pazartesi - Cuma</span>
                                        <span className="font-medium text-gray-900">09:00 - 19:00</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Cumartesi</span>
                                        <span className="font-medium text-gray-900">10:00 - 17:00</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Pazar</span>
                                        <span className="font-medium text-red-500">Kapalı</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-5 sm:p-8 md:p-12"
                        >
                            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                                Bize Yazın
                            </h2>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Adınız Soyadınız"
                                        placeholder="Adınız Soyadınız"
                                        {...register('name', { required: 'Bu alan zorunludur' })}
                                        error={errors.name?.message as string}
                                    />
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
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Telefon Numaranız"
                                        type="tel"
                                        placeholder="0555 555 55 55"
                                        {...register('phone')}
                                    />
                                    <Input
                                        label="Konu"
                                        placeholder="Mesajınızın konusu"
                                        {...register('subject', { required: 'Bu alan zorunludur' })}
                                        error={errors.subject?.message as string}
                                    />
                                </div>
                                <Textarea
                                    label="Mesajınız"
                                    placeholder="Bize iletmek istediğiniz mesaj..."
                                    rows={6}
                                    {...register('message', { required: 'Bu alan zorunludur' })}
                                    error={errors.message?.message as string}
                                />
                                {submitStatus === 'success' && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                                        Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
                                    </div>
                                )}
                                {submitStatus === 'error' && submitError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                        {submitError}
                                    </div>
                                )}
                                <button type="submit" disabled={submitting} className="btn-primary w-full md:w-auto flex items-center justify-center gap-2 min-w-[200px] disabled:opacity-50">
                                    <Send className="w-4 h-4" />
                                    {submitting ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>

                {/* Map */}
                <div className="mt-8 sm:mt-12 rounded-2xl overflow-hidden h-[250px] sm:h-[350px] md:h-[400px] shadow-lg">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3011.650490010173!2d29.0212!3d40.9812!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDU4JzUyLjMiTiAyOcKwMDEnMTYuMyJF!5e0!3m2!1str!2str!4v1635789000000!5m2!1str!2str"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            </section>
        </>
    );
}
