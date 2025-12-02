import { Service } from '../types';

export const serviceCategories = [
    { value: 'all', label: 'Tümü' },
    { value: 'Yüz Estetiği', label: 'Yüz Estetiği' },
    { value: 'Vücut Estetiği', label: 'Vücut Estetiği' },
    { value: 'Lazer Tedavileri', label: 'Lazer Tedavileri' },
    { value: 'Saç Tedavileri', label: 'Saç Tedavileri' }
];

export function getServiceBySlug(slug: string) {
    return services.find(service => service.slug === slug);
}

export function getServicesByCategory(category: string) {
    return services.filter(service => service.category === category);
}

export const services: Service[] = [
    {
        id: '1',
        slug: 'botoks',
        title: 'Botoks Uygulaması',
        category: 'Yüz Estetiği',
        shortDescription: 'Yüz kırışıklıklarını azaltmak ve gençleşme için botoks uygulaması',
        description: 'Botoks, yüz kaslarını gevşeterek kırışkan azalmasını sağlayan güvenli ve etkili bir yöntemdir. Özellikle alın, göz çevresi ve kaş arası bölgelerinde belirgin sonuçlar verir.',
        price: '2.500 - 5.000 TL',
        duration: '15-30 dakika',
        image: '/images/services/botox.jpg',
        benefits: [
            'Kırışıklıklarda belirgin azalma',
            'Daha genç ve dinç görünüm',
            'Ameliyatsız çözüm',
            'Hızlı uygulama',
            'Hemen sosyal hayata dönüş'
        ],
        process: [
            'Doktor muayenesi ve planlama',
            'Uygulama bölgesinin temizlenmesi',
            'Anestezik krem uygulaması (isteğe bağlı)',
            'İnce uçlu iğnelerle enjeksiyon',
            'Soğuk kompres uygulaması'
        ],
        recovery: 'İşlemden hemen sonra günlük hayata dönülebilir. İlk 4 saat yatay pozisyona geçilmemesi ve öne eğilinmemesi önerilir.',
    },
    {
        id: '2',
        slug: 'dudak-dolgusu',
        title: 'Dudak Dolgusu',
        category: 'Yüz Estetiği',
        shortDescription: 'Dudaklara hacim kazandırmak ve şekillendirmek için hyaluronik asit dolgusu',
        description: 'Dudak dolgusu, dudaklara hacim kazandırmak, asimetriyi düzeltmek ve daha çekici bir görünüm elde etmek için yapılan estetik bir işlemdir.',
        price: '4.000 - 8.000 TL',
        duration: '30 dakika',
        image: '/images/services/lip-filler.jpg',
        benefits: [
            'Daha dolgun dudaklar',
            'Belirgin dudak kontürü',
            'Asimetri düzeltme',
            'Nemli ve canlı görünüm',
            'Doğal sonuçlar'
        ],
        process: [
            'Dudak analizi ve tasarım',
            'Lokal anestezi uygulaması',
            'Dolgu maddesinin enjeksiyonu',
            'Masaj ile şekillendirme',
            'Son kontrol'
        ],
        recovery: 'Hafif şişlik ve morluk olabilir, 2-3 gün içinde geçer.',
    },
    {
        id: '3',
        slug: 'lazer-epilasyon',
        title: 'Lazer Epilasyon',
        category: 'Lazer Tedavileri',
        shortDescription: 'İstenmeyen tüylerden kalıcı olarak kurtulmak için son teknoloji lazer epilasyon',
        description: 'Lazer epilasyon, istenmeyen tüylerden kalıcı olarak kurtulmanın en etkili ve konforlu yoludur. Alexandrite, Diode ve Nd:YAG lazer sistemleri ile her cilt tipine uygun tedavi.',
        price: 'Bölgeye göre değişir',
        duration: '15-60 dakika',
        image: '/images/services/laser.jpg',
        benefits: [
            'Kalıcı sonuçlar',
            'Pürüzsüz cilt',
            'Batık oluşumunu engelleme',
            'Zaman tasarrufu',
            'Ağrısız uygulama'
        ],
        process: [
            'Cilt ve kıl tipi analizi',
            'Bölgenin temizlenmesi ve kısaltılması',
            'Jel sürülmesi (cihaza göre)',
            'Lazer atışlarının yapılması',
            'Nemlendirici ve güneş koruyucu uygulaması'
        ],
        recovery: 'İşlem sonrası hafif kızarıklık olabilir, birkaç saat içinde geçer. Güneşten korunmak önemlidir.',
    },
    {
        id: '4',
        slug: 'prp-sac-tedavisi',
        title: 'PRP Saç Tedavisi',
        category: 'Saç Tedavileri',
        shortDescription: 'Saç dökülmesini durdurmak ve saç kalitesini artırmak için PRP tedavisi',
        description: 'PRP (Platelet Rich Plasma), kişinin kendi kanından elde edilen zenginleştirilmiş plazmanın saçlı deriye enjekte edilmesi işlemidir. Saç köklerini besler ve güçlendirir.',
        price: '2.000 - 3.000 TL / Seans',
        duration: '45 dakika',
        image: '/images/services/prp-hair.jpg',
        benefits: [
            'Saç dökülmesinde azalma',
            'Saç kalitesinde artış',
            'Yeni saç oluşumunu destekleme',
            'Doğal ve güvenli yöntem',
            'Yan etkisi yok'
        ],
        process: [
            'Kişiden kan alınması',
            'Santrifüj işlemi ile plazmanın ayrıştırılması',
            'Saçlı derinin temizlenmesi',
            'Mikro enjeksiyon ile uygulama',
            'Masaj yapılması'
        ],
        recovery: 'İşlem sonrası günlük hayata hemen dönülebilir. O gün saç yıkanmamalıdır.',
    },
    {
        id: '5',
        slug: 'hydrafacial',
        title: 'Hydrafacial Cilt Bakımı',
        category: 'Yüz Estetiği',
        shortDescription: 'Derinlemesine temizlik ve yenilenme sağlayan profesyonel cilt bakımı',
        description: 'Hydrafacial, cildi derinlemesine temizleyen, besleyen ve nemlendiren anti-aging bakım sistemidir. Vakum teknolojisi ile gözenekleri temizler.',
        price: '1.500 - 2.500 TL',
        duration: '45-60 dakika',
        image: '/images/services/hydrafacial.jpg',
        benefits: [
            'Derinlemesine temizlik',
            'Siyah nokta temizliği',
            'Cilt tonu eşitleme',
            'Yoğun nemlendirme',
            'Parlak ve canlı görünüm'
        ],
        process: [
            'Temizleme ve peeling',
            'Vakum ile gözenek temizliği',
            'Nemlendirme ve besleme',
            'Led terapi',
            'Güneş koruyucu uygulaması'
        ],
        recovery: 'Herhangi bir iyileşme süreci gerekmez, hemen sosyal hayata dönülebilir.',
    },
    {
        id: '6',
        slug: 'kimyasal-peeling',
        title: 'Kimyasal Peeling',
        category: 'Yüz Estetiği',
        shortDescription: 'Cilt yenileme ve leke tedavisi için kimyasal peeling',
        description: 'Özel asitlerle cildin üst tabakasının kontrollü şekilde soyulması ile leke, akne izi ve kırışıklıkların tedavisi.',
        price: '1.500 - 4.000 TL / Seans',
        duration: '30-45 dakika',
        image: '/images/services/peeling.jpg',
        benefits: [
            'Leke tedavisi',
            'Akne izi azaltma',
            'Cilt tonu eşitleme',
            'Gözenek sıkılaştırma',
            'Cilt dokusunu iyileştirme'
        ],
        process: [
            'Cilt temizliği',
            'Peeling solüsyonu uygulama',
            'Bekleme süresi',
            'Nötralizasyon',
            'Nemlendirici ve güneş koruyucu'
        ],
        recovery: 'Hafif soyulma 3-5 gün sürer. Güneşten korunma zorunludur.',
    },
];
