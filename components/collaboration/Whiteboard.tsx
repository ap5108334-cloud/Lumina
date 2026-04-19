"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Eraser, Pencil, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhiteboardProps {
  socket: Socket | null;
}

export default function Whiteboard({ socket }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6'); // lumina-purple
  const [brushSize, setBrushSize] = useState(3);
  const [mode, setMode] = useState<'pencil' | 'eraser'>('pencil');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Save content
        const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.putImageData(temp, 0, 0);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // Socket listeners
    if (socket) {
      socket.on('draw', (data: any) => {
        const { x0, y0, x1, y1, color: c, size: s } = data;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
        ctx.lineTo(x1 * canvas.width, y1 * canvas.height);
        ctx.strokeStyle = c;
        ctx.lineWidth = s;
        ctx.stroke();
        ctx.closePath();
      });

      socket.on('clear-canvas', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (socket) {
        socket.off('draw');
        socket.off('clear-canvas');
      }
    };
  }, [socket]);

  const drawOnCanvas = (x0: number, y0: number, x1: number, y1: number, c: string, s: number, emit = true) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket || !canvasRef.current) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    socket.emit('draw', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: c,
      size: s
    });
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const lastPos = useRef({ x: 0, y: 0 });

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const drawColor = mode === 'eraser' ? '#ffffff' : color; // Eraser matches bg color (white)
    drawOnCanvas(lastPos.current.x, lastPos.current.y, pos.x, pos.y, drawColor, mode === 'eraser' ? 20 : brushSize);
    lastPos.current = pos;
  };

  const handleMouseUp = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    socket?.emit('clear-canvas');
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'whiteboard-sketch.png';
    link.href = canvasRef.current?.toDataURL() || '';
    link.click();
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/20 rounded-xl border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/50">
            <button
              onClick={() => setMode('pencil')}
              className={cn("p-1.5 rounded-md transition-all", mode === 'pencil' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={cn("p-1.5 rounded-md transition-all", mode === 'eraser' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {mode === 'pencil' && (
            <div className="flex items-center gap-2">
              {[
                '#8b5cf6', // purple
                '#3b82f6', // blue
                '#06b6d4', // cyan
                '#10b981', // green
                '#f59e0b', // amber
                '#ef4444', // red
                '#ffffff', // white
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-125",
                    color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : ""
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground ml-2">
            <span>Size</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={download} className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </Button>
        </div>
      </div>

      <div className="flex-1 relative cursor-crosshair rounded-2xl border border-border/50 bg-white shadow-inner overflow-hidden group">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className="w-full h-full relative z-10"
        />
        <div className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-slate-400/50 pointer-events-none group-hover:text-slate-500/80 transition-colors z-20">
          Live Whiteboard &middot; Real-time Sync
        </div>
      </div>
    </div>
  );
}
