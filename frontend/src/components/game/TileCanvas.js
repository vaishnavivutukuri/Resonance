import React, { useEffect, useRef } from 'react';
import './TileCanvas.css';

export default function TileCanvas({ canvasRef, onTap, onRelease, lanes = 4 }) {
  const containerRef = useRef(null);
  const activePointers = useRef(new Map());
  const activeKeys = useRef(new Set());

  useEffect(() => {
    const doResize = () => {
      if (containerRef.current && canvasRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (!w || w < 50 || !h || h < 100) return;
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = Math.max(1, Math.floor(w * dpr));
        canvasRef.current.height = Math.max(1, Math.floor(h * dpr));
        canvasRef.current.style.width = `${w}px`;
        canvasRef.current.style.height = `${h}px`;
        const ctx = canvasRef.current.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasRef.current._cssWidth = w;
        canvasRef.current._cssHeight = h;
      }
    };
    doResize();
    const t1 = setTimeout(doResize, 50);
    const t2 = setTimeout(doResize, 300);
    window.addEventListener('resize', doResize);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(doResize);
      ro.observe(containerRef.current);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', doResize);
      if (ro) ro.disconnect();
    };
  }, [canvasRef, lanes]);

  const laneFromClientX = (clientX) => {
    if (!canvasRef.current) return -1;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width) return -1;
    const laneW = rect.width / lanes;
    const laneIdx = Math.floor((clientX - rect.left) / laneW);
    return laneIdx >= 0 && laneIdx < lanes ? laneIdx : -1;
  };

  const handlePointerDown = (e) => {
    const laneIdx = laneFromClientX(e.clientX);
    if (laneIdx < 0) return;
    activePointers.current.set(e.pointerId, laneIdx);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    onTap?.(laneIdx);
  };

  const endPointer = (e) => {
    const laneIdx = activePointers.current.get(e.pointerId);
    activePointers.current.delete(e.pointerId);
    if (laneIdx != null && laneIdx >= 0) onRelease?.(laneIdx);
  };

  useEffect(() => {
    const mapping = ['d', 'f', 'j', 'k'];

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const idx = mapping.indexOf(e.key.toLowerCase());
      if (idx !== -1 && !activeKeys.current.has(idx)) {
        activeKeys.current.add(idx);
        onTap?.(idx);
      }
    };
    const onKeyUp = (e) => {
      const idx = mapping.indexOf(e.key.toLowerCase());
      if (idx !== -1) {
        activeKeys.current.delete(idx);
        onRelease?.(idx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      activeKeys.current.clear();
    };
  }, [onTap, onRelease]);

  return (
    <div className="tile-canvas-wrapper" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="tile-canvas"
      />
      <div className="tile-canvas__hints">
        <><span>D</span><span>F</span><span>J</span><span>K</span></>
      </div>
    </div>
  );
}
