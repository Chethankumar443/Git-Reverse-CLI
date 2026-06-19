import { Hero } from "../components/sections/Hero";
import { Features } from "../components/sections/Features";
import { Showcase } from "../components/sections/Showcase";
import { Commands } from "../components/sections/Commands";
import { Onboarding } from "../components/sections/Onboarding";

export const LandingPage = () => {
  return (
    <main>
      <Hero />
      <Features />
      <Showcase />
      <Commands />
      <Onboarding />
    </main>
  );
};
