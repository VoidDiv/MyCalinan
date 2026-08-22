import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import DiscoverGrid from "@/components/DiscoverGrid";
import CommunityFeed from "@/components/CommunityFeed";
import WeatherWidget from "@/components/WeatherWidget";
import Footer from "@/components/Footer";
import ChatbotLauncher from "@/components/ChatbotLauncher";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <DiscoverGrid />
        <CommunityFeed />
        <WeatherWidget />
      </main>
      <Footer />
      <ChatbotLauncher />
    </>
  );
}
