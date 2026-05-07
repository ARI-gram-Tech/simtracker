// src/pages/Landing.tsx
import Navbar   from "@/components/landing/Navbar";
import Hero     from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Workflow from "@/components/landing/Workflow";
import CTA      from "@/components/landing/CTA";
import Footer   from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "#080e1a" }}>
      <Navbar />
      <main>
        <section id="hero">
          <Hero />
        </section>
        <section id="features">
          <Features />
        </section>
        <section id="workflow">
          <Workflow />
        </section>
        <CTA />
      </main>
      <Footer />
    </div>
  );
}