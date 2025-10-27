
import Navbar from "@/components/Navbar";
import AppHeader from "@/components/AppHeader";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import FreelancerStepsSection from "@/components/FreelancerStepsSection";
import ClientStepsSection from "@/components/ClientStepsSection";
import FeaturedFreelancersSection from "@/components/FeaturedFreelancersSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PlansSection from "@/components/PlansSection";
import FreelancerCTASection from "@/components/FreelancerCTASection";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { AdminService } from "@/services/adminService";

const Index = () => {
  const [showPlans, setShowPlans] = useState(false);
  useEffect(() => {
    AdminService.getPlanStatus().then(setShowPlans);
  }, []);
  return (
    <div className="min-h-screen">
      <Navbar />
      <AppHeader variant="landing" />
      {/* Adiciona padding-top no mobile para compensar o header fixo */}
      <div className="md:pt-0 pt-12">
        <HeroSection />
        <FeaturesSection />
        <FreelancerStepsSection />
        <ClientStepsSection />
        <FeaturedFreelancersSection />
        {showPlans && <PlansSection isLandingPage={true} />}
        {/* <FreelancerCTASection /> */}
        <Footer />
      </div>
    </div>
  );
};

export default Index;
