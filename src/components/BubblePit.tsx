import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9',
  '#F8C471', '#73C6B6', '#D2B4DE', '#FAD7A0', '#AED6F1'
];

export default function BubblePit() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0 || !sceneRef.current) return;

    // Initialize Matter.js
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

    // Create boundaries
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

    // Add mouse control
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });
    Matter.Composite.add(engine.world, mouseConstraint);

    // Run the engine and renderer
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    const RADIUS_SMALL = 35;
    const RADIUS_LARGE = 55;

    // Click to spawn 3 bubbles with jumping effect
    const handleCanvasClick = (event: MouseEvent) => {
      for (let i = 0; i < 3; i++) {
        const radius = Math.random() > 0.5 ? RADIUS_SMALL : RADIUS_LARGE;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        const bubble = Matter.Bodies.circle(
          event.offsetX + (Math.random() - 0.5) * 20, 
          event.offsetY + (Math.random() - 0.5) * 20, 
          radius, 
          {
            restitution: 0.8,
            friction: 0.05,
            render: {
              fillStyle: color,
              strokeStyle: 'rgba(255, 255, 255, 0.5)',
              lineWidth: 4,
            },
          }
        );

        // Jumping effect: random upward and outward velocity
        Matter.Body.setVelocity(bubble, {
          x: (Math.random() - 0.5) * 15,
          y: -Math.random() * 15 - 10
        });
        
        Matter.Composite.add(engine.world, bubble);
      }
    };

    render.canvas.addEventListener('mousedown', handleCanvasClick);

    // Initial limited flow (spawn 15 bubbles at start)
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        if (!engineRef.current) return;
        const radius = Math.random() > 0.5 ? RADIUS_SMALL : RADIUS_LARGE;
        const x = Math.random() * dimensions.width;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        const bubble = Matter.Bodies.circle(x, -100, radius, {
          restitution: 0.7,
          friction: 0.05,
          render: {
            fillStyle: color,
            strokeStyle: 'rgba(255, 255, 255, 0.4)',
            lineWidth: 3,
          },
        });
        Matter.Composite.add(engine.world, bubble);
      }, i * 150);
    }

    return () => {
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, [dimensions]);

  const handleClear = () => {
    if (engineRef.current) {
      const allBodies = Matter.Composite.allBodies(engineRef.current.world);
      const bubbles = allBodies.filter(b => !b.isStatic);
      Matter.Composite.remove(engineRef.current.world, bubbles);
    }
  };

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
