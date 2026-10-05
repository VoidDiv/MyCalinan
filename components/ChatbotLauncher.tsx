/* FILE: app/page.tsx
   Your Home page, plus <AppVersion /> (one small line under the footer that shows the version of the app). */
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import DiscoverGrid from "@/components/DiscoverGrid";
import CommunityFeed from "@/components/CommunityFeed";
import WeatherWidget from "@/components/WeatherWidget";
import BarangayOfficials from "@/components/BarangayOfficials";
import BarangayRules from "@/components/BarangayRules";
import Footer from "@/components/Footer";
import AppVersion from "@/components/Appversion";
import ChatbotLauncher from "@/components/ChatbotLauncher";
import WelcomeTutorial from "@/components/WelcomeTutorial";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WeatherWidget />
        <DiscoverGrid />
        <CommunityFeed />
        <BarangayOfficials />
        <BarangayRules />
      </main>
      <Footer />
      <AppVersion />
      <ChatbotLauncher />
      <WelcomeTutorial />
    </>
  );
}