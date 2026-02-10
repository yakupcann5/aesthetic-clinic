import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
