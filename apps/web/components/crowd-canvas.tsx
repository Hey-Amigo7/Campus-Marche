"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface CrowdCanvasProps {
  src?: string;
  rows?: number;
  cols?: number;
  className?: string;
}

export function CrowdCanvas({
  src = "/images/peeps/all-peeps.png",
  rows = 15,
  cols = 7,
  className = "absolute bottom-0 h-[75vh] w-full",
}: CrowdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
    const randomIndex = (array: unknown[]) => (randomRange(0, array.length) | 0);
    const removeFromArray = (array: unknown[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = <T,>(array: T[], item: T) =>
      removeFromArray(array as unknown[], (array as unknown[]).indexOf(item)) as T;
    const removeRandomFromArray = <T,>(array: T[]) =>
      removeFromArray(array as unknown[], randomIndex(array as unknown[])) as T;
    const getRandomFromArray = <T,>(array: T[]) => array[randomIndex(array as unknown[]) | 0];

    type Peep = {
      image: HTMLImageElement;
      rect: number[];
      width: number;
      height: number;
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      walk: gsap.core.Timeline | null;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    const stage = { width: 0, height: 0 };
    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeep = ({ image, rect }: { image: HTMLImageElement; rect: number[] }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect(r) {
          this.rect = r;
          this.width = r[2] ?? 0;
          this.height = r[3] ?? 0;
        },
        render(ctx) {
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.scale(this.scaleX, 1);
          ctx.drawImage(this.image, this.rect[0] ?? 0, this.rect[1] ?? 0, this.rect[2] ?? 0, this.rect[3] ?? 0, 0, 0, this.width, this.height);
          ctx.restore();
        },
      };
      peep.setRect(rect);
      return peep;
    };

    const resetPeep = (peep: Peep) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * (gsap.parseEase("power2.in")(Math.random()) as number);
      const startY = stage.height - peep.height + offsetY;
      let startX: number, endX: number;
      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;
      return { startX, startY, endX };
    };

    const walkPeep = (peep: Peep, props: ReturnType<typeof resetPeep>) => {
      const { startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;
      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 }, 0);
      return tl;
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const props = resetPeep(peep);
      const walk = walkPeep(peep, props).eventCallback("onComplete", () => {
        removeItemFromArray(crowd, peep);
        availablePeeps.push(peep);
        addPeepToCrowd();
      });
      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      crowd.forEach((peep) => peep.render(ctx));
      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      canvas.width = stage.width * devicePixelRatio;
      canvas.height = stage.height * devicePixelRatio;
      crowd.forEach((p) => p.walk?.kill());
      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);
      // Stagger initial positions
      while (availablePeeps.length) {
        addPeepToCrowd().walk?.progress(Math.random());
      }
    };

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const total = rows * cols;
      const rectW = img.naturalWidth / rows;
      const rectH = img.naturalHeight / cols;
      for (let i = 0; i < total; i++) {
        const col = (i / rows) | 0;
        allPeeps.push(
          createPeep({
            image: img,
            rect: [(i % rows) * rectW, col * rectH, rectW, rectH],
          }),
        );
      }
      resize();
      gsap.ticker.add(render);
    };
    img.src = src;

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      gsap.ticker.remove(render);
      crowd.forEach((p) => p.walk?.kill());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return <canvas ref={canvasRef} className={className} />;
}
