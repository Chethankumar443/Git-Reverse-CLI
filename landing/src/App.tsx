import { Navbar } from "./components/sections/Navbar";
import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Commands } from "./components/sections/Commands";
import { Onboarding } from "./components/sections/Onboarding";
import { Footer } from "./components/sections/Footer";

function App() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Commands />
        <Onboarding />
      </main>
      <Footer />
    </div>
  );
}

export default App;
