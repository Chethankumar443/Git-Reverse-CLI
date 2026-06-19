import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/sections/Navbar";
import { Footer } from "./components/sections/Footer";
import { AuroraBackground } from "./components/sections/AuroraBackground";
import { LandingPage } from "./pages/LandingPage";
import { DocsPage } from "./pages/DocsPage";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="relative min-h-[100dvh] text-zinc-50 antialiased">
        <AuroraBackground />
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;

