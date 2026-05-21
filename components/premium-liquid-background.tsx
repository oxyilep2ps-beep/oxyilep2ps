"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

export function PremiumLiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    type Leaf = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: { r: number; g: number; b: number };
      rotation: number;
      rotSpeed: number;
    };

    // Leaf system - actual leaf shapes falling
    const leaves: Leaf[] = [];

    const colors = [
      { r: 255, g: 90, b: 31 },
      { r: 255, g: 129, b: 74 },
      { r: 224, g: 59, b: 0 }
    ];

    // Initialize leaf
    function initLeaf(leaf: Leaf) {
      leaf.x = Math.random() * width * 0.3; // Start from left side
      leaf.y = Math.random() * height * 0.3 - 100; // Start from top
      leaf.vx = 0.8 + Math.random() * 1.2; // Move right
      leaf.vy = 0.8 + Math.random() * 1.5; // Move down
      leaf.size = 30 + Math.random() * 50;
      leaf.color = colors[Math.floor(Math.random() * colors.length)];
      leaf.rotation = Math.random() * Math.PI * 2;
      leaf.rotSpeed = (Math.random() - 0.5) * 0.08;
    }

    for (let i = 0; i < 45; i++) {
      const leaf: Leaf = { x: 0, y: 0, vx: 0, vy: 0, size: 0, color: { r: 0, g: 0, b: 0 }, rotation: 0, rotSpeed: 0 };
      initLeaf(leaf);
      leaves.push(leaf);
    }

    // Function to draw a realistic leaf shape
    function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: { r: number; g: number; b: number }, alpha: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Draw leaf body with pointed tip
      const w = size * 0.5;
      const h = size * 0.75;

      // Main leaf shape (pointed at top, rounded at bottom)
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -h); // Top point
      ctx.quadraticCurveTo(w, -h * 0.5, w * 0.7, h * 0.3);
      ctx.quadraticCurveTo(w * 0.5, h * 0.8, 0, h); // Bottom curve
      ctx.quadraticCurveTo(-w * 0.5, h * 0.8, -w * 0.7, h * 0.3);
      ctx.quadraticCurveTo(-w, -h * 0.5, 0, -h);
      ctx.closePath();
      ctx.fill();

      // Leaf gradient for depth
      const grad = ctx.createLinearGradient(-w, 0, w, 0);
      grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      grad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Main vein down the center
      ctx.strokeStyle = `rgba(${color.r * 0.7}, ${color.g * 0.7}, ${color.b * 0.7}, ${alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(0, h * 0.95);
      ctx.stroke();

      // Side veins - constrained within leaf bounds
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${color.r * 0.7}, ${color.g * 0.7}, ${color.b * 0.7}, ${alpha * 0.3})`;
      for (let i = 0; i < 4; i++) {
        const veinY = -h + (h * 2 * i) / 4;
        const progress = (veinY + h) / (h * 2); // 0 to 1 from top to bottom
        const maxVeinX = w * (0.6 - progress * 0.3); // Narrower at edges
        
        ctx.beginPath();
        ctx.moveTo(0, veinY);
        ctx.lineTo(maxVeinX * 0.8, veinY + h * 0.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, veinY);
        ctx.lineTo(-maxVeinX * 0.8, veinY + h * 0.2);
        ctx.stroke();
      }

      ctx.restore();
    }

    const render = () => {
      // Clear with theme base
      ctx.fillStyle = theme === "dark" ? "#050505" : "#FCFAF7";
      ctx.fillRect(0, 0, width, height);

      time += 0.01;

      // Update and draw leaves
      leaves.forEach((leaf, i) => {
        // Wind gusts create organic flow variation
        const windGust = Math.sin(time * 0.3 + i * 0.5) * 0.2;
        leaf.vx = 0.8 + Math.sin(time * 0.2 + i) * 0.3 + windGust;
        
        // Natural vertical flow with sine wave bobbing
        leaf.vy = 0.8 + Math.sin(time * 0.15 + i * 0.3) * 0.3;

        // Update position
        leaf.x += leaf.vx;
        leaf.y += leaf.vy;

        // Rotation for leaf effect
        leaf.rotation += leaf.rotSpeed;

        // Reset when off screen (bottom right)
        if (leaf.x > width + 100 || leaf.y > height + 100) {
          initLeaf(leaf);
        }

        // Draw leaf with shape and gradient
        const alpha = 0.5;
        drawLeaf(ctx, leaf.x, leaf.y, leaf.size, leaf.rotation, leaf.color, alpha);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
  );
}