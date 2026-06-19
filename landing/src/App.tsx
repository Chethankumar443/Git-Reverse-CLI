import { Navbar } from "./components/sections/Navbar";
import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Showcase } from "./components/sections/Showcase";
import { Commands } from "./components/sections/Commands";
import { Onboarding } from "./components/sections/Onboarding";
import { Docs } from "./components/sections/Docs";
import { Footer } from "./components/sections/Footer";
import { AuroraBackground } from "./components/sections/AuroraBackground";

function App() {
  return (
    <div className="relative min-h-[100dvh] text-zinc-50 antialiased">
      <AuroraBackground />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Showcase />
        <Commands />
        <Onboarding />
        <Docs />
      </main>
      <Footer />
    </div>
  );
}

export default App;
