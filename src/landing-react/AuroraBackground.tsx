import React, { useEffect } from "react";
import { Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  useMotionTemplate,
  useMotionValue,
  motion,
  animate,
} from "framer-motion";

// Adjusted colors to match Git-Reverse brand / slightly darker tech look
// You can tweak these!
const COLORS_TOP = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"];

export const AuroraBackground = () => {
  const color = useMotionValue(COLORS_TOP[0]);

  useEffect(() => {
    animate(color, COLORS_TOP, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
  }, [color]);

  // We are using absolute positioning to place this directly behind the hero section
  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #02040a 50%, ${color})`;

  return (
    <motion.div
      style={{
        backgroundImage,
        position: "absolute",
        inset: 0,
        zIndex: 0,
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Canvas>
          <Stars radius={50} count={2500} factor={4} fade speed={2} />
        </Canvas>
      </div>
    </motion.div>
  );
};
