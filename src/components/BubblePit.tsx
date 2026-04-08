import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const IMAGE_URLS = [
  'https://picsum.photos/seed/nature/200/200',
  'https://picsum.photos/seed/city/200/200',
  'https://picsum.photos/seed/tech/200/200',
  'https://picsum.photos/seed/food/200/200',
  'https://picsum.photos/seed/abstract/200/200',
  'https://picsum.photos/seed/animals/200/200',
  'https://picsum.photos/seed/people/200/200',
  'https://picsum.photos/seed/travel/200/200',
  'https://picsum.photos/seed/art/200/200',
  'https://picsum.photos/seed/space/200/200'
];

// Helper to create a circular glassy texture from an image URL
const createGlassyTexture = (url: string, size: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(url);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 2;

      // 1. Clip to circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      // 2. Draw image
      ctx.drawImage(img, 0, 0, size, size);

      // 3. Add glassy sphere effect (gradient overlay)
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // 4. Add top highlight (specular)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - radius * 0.6, radius * 0.6, radius * 0.3, 0, 0, Math.PI * 2);
      const highlight = ctx.createLinearGradient(0, centerY - radius * 0.9, 0, centerY - radius * 0.3);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlight;
      ctx.fill();

      // 5. Add outer glassy border
      ctx.restore(); // Reset clip for border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();

      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(url);
  });
};

export default function BubblePit() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [textures, setTextures] = useState<string[]>([]);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const initialSpawnedRef = useRef(false);

  // 1. Handle Dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (sceneRef.current) {
        setDimensions({
          width: sceneRef.current.clientWidth,
          height: sceneRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 2. Pre-process Textures
  useEffect(() => {
    Promise.all(IMAGE_URLS.map(url => createGlassyTexture(url, 200)))
      .then(setTextures);
  }, []);

  // 3. Initialize Engine
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0 || !sceneRef.current) return;

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: dimensions.width,
        height: dimensions.height,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;

    // Boundaries
    const ground = Matter.Bodies.rectangle(
      dimensions.width / 2,
      dimensions.height + 50,
      dimensions.width,
      100,
      { isStatic: true }
    );
    const leftWall = Matter.Bodies.rectangle(
      -50,
      dimensions.height / 2,
      100,
      dimensions.height,
      { isStatic: true }
    );
    const rightWall = Matter.Bodies.rectangle(
      dimensions.width + 50,
      dimensions.height / 2,
      100,
      dimensions.height,
      { isStatic: true }
    );

    Matter.Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Mouse control
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Matter.Composite.add(engine.world, mouseConstraint);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    setIsEngineReady(true);

    // Click to spawn 3 bubbles
    const handleCanvasClick = (event: MouseEvent) => {
      if (textures.length === 0) return;
      
      const RADIUS_SMALL = 35;
      const RADIUS_LARGE = 55;

      for (let i = 0; i < 3; i++) {
        const radius = Math.random() > 0.5 ? RADIUS_SMALL : RADIUS_LARGE;
        const texture = textures[Math.floor(Math.random() * textures.length)];
        
        const bubble = Matter.Bodies.circle(
          event.offsetX + (Math.random() - 0.5) * 20, 
          event.offsetY + (Math.random() - 0.5) * 20, 
          radius, 
          {
            restitution: 0.8,
            friction: 0.05,
            render: {
              sprite: {
                texture: texture,
                xScale: (radius * 2) / 200,
                yScale: (radius * 2) / 200,
              }
            }
          }
        );

        Matter.Body.setVelocity(bubble, {
          x: (Math.random() - 0.5) * 15,
          y: -Math.random() * 15 - 10
        });
        
        Matter.Composite.add(engine.world, bubble);
      }
    };

    render.canvas.addEventListener('mousedown', handleCanvasClick);

    return () => {
      setIsEngineReady(false);
      initialSpawnedRef.current = false;
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (renderRef.current) Matter.Render.stop(renderRef.current);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, [dimensions, textures]);

  // 4. Initial Spawning
  useEffect(() => {
    if (!isEngineReady || textures.length === 0 || initialSpawnedRef.current || !engineRef.current) return;

    initialSpawnedRef.current = true;
    const RADIUS_SMALL = 35;
    const RADIUS_LARGE = 55;

    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        if (!engineRef.current) return;
        const radius = Math.random() > 0.5 ? RADIUS_SMALL : RADIUS_LARGE;
        const x = Math.random() * dimensions.width;
        const texture = textures[Math.floor(Math.random() * textures.length)];

        const bubble = Matter.Bodies.circle(x, -100, radius, {
          restitution: 0.7,
          friction: 0.05,
          render: {
            sprite: {
              texture: texture,
              xScale: (radius * 2) / 200,
              yScale: (radius * 2) / 200,
            }
          },
        });
        Matter.Composite.add(engineRef.current.world, bubble);
      }, i * 150);
    }
  }, [isEngineReady, textures, dimensions.width]);

  return (
    <div 
      ref={sceneRef} 
      className="w-full h-full relative overflow-hidden bg-[#050505]"
      id="bubble-pit-container"
    >
      {/* Atmospheric overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/40" />
    </div>
  );
}
