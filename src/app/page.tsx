import { FinalCta, SiteFooter } from "@/components/landing/closing";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingShell } from "@/components/landing/landing-shell";
import { MobileCtaBar } from "@/components/landing/mobile-cta";
import { Pricing } from "@/components/landing/pricing";
import { ProductTabs } from "@/components/landing/product-tabs";
import { SiteHeader } from "@/components/landing/site-header";
import { TrustMarquee } from "@/components/landing/trust-marquee";
import { Trust } from "@/components/landing/trust";

// Public landing page (AIDA), six sections:
// attention (hero + trust strip) → interest (how it works, product tabs)
// → desire (evidence loop + commitments) → action (pricing, FAQ + closing CTA).
export default function Home() {
  return (
    <LandingShell>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <TrustMarquee />
        <HowItWorks />
        <ProductTabs />
        <Trust />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <MobileCtaBar />
    </LandingShell>
  );
}
