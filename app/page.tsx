import Hero from '@/components/home/Hero';
import FeaturedServices from '@/components/home/FeaturedServices';
import Statistics from '@/components/home/Statistics';
import Testimonials from '@/components/home/Testimonials';

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedServices />
      <Statistics />
      <Testimonials />
    </>
  );
}
