import React, { useEffect, useRef, useState } from 'react';
import { 
  Canvas, 
  FabricImage, 
  Rect, 
  Circle, 
  IText, 
  PencilBrush,
  PencilBrush as FabricPencilBrush,
  TPointerEventInfo,
  Object as FabricObject
} from 'fabric';
import { Button } from '@/components/ui/button';
import { 
  Pencil as PencilIcon, 
  Square as SquareIcon, 
  Circle as CircleIcon, 
  Type as TypeIcon, 
  Trash2, 
  Download, 
  X, 
  Undo2,
  Highlighter,
  Pointer,
  Loader2,
  Sparkles,
  Bot,
  Search,
  MoreVertical
} from 'lucide-react';
import { aiMarkImage, Detection } from '@/src/lib/gemini';
import { toast } from 'sonner';

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImageAnnotatorProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ imageUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<FabricImage | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pencil' | 'square' | 'circle' | 'text'>('select');
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: window.innerWidth * 0.9,
      height: window.innerHeight * 0.7,
      backgroundColor: '#f3f4f6',
    });

    setFabricCanvas(canvas);

    const initImage = async () => {
      try {
        let finalUrl = imageUrl;
        
        // Use proxy for external images to avoid CORS issues if not already a data URL
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('/')) {
          try {
            const proxyResponse = await fetch('/api/proxy-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: imageUrl })
            });
            if (proxyResponse.ok) {
              const { base64, contentType } = await proxyResponse.json();
              finalUrl = `data:${contentType};base64,${base64}`;
            }
          } catch (e) {
            console.warn("Proxy failed, trying direct load with CORS anonymous");
          }
        }

        const img = await FabricImage.fromURL(finalUrl, {
          crossOrigin: 'anonymous'
        });
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        ) * 0.9;

        img.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        imageRef.current = img;
        canvas.centerObject(img);
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
        setLoading(false);
      } catch (error) {
        console.error('Error loading image into fabric:', error);
        setLoading(false);
      }
    };

    initImage();

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);


  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'pencil';
    if (fabricCanvas.isDrawingMode) {
      fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.width = 5;
      fabricCanvas.freeDrawingBrush.color = '#ef4444'; // Red
    }

    // Handle tool clicks
    const handleMouseDown = (options: TPointerEventInfo) => {
      if (activeTool === 'select' || activeTool === 'pencil') return;

      const pointer = fabricCanvas.getScenePoint(options.e);
      let obj;

      if (activeTool === 'square') {
        obj = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 50,
          height: 50,
          fill: 'transparent',
          stroke: '#ef4444',
          strokeWidth: 3,
        });
      } else if (activeTool === 'circle') {
        obj = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 25,
          fill: 'transparent',
          stroke: '#ef4444',
          strokeWidth: 3,
        });
      } else if (activeTool === 'text') {
        obj = new IText('Annotate here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: '#ef4444',
        });
      }

      if (obj) {
        fabricCanvas.add(obj);
        fabricCanvas.setActiveObject(obj);
        setActiveTool('select');
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
    };
  }, [activeTool, fabricCanvas]);

  const removeSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    fabricCanvas.remove(...activeObjects);
    fabricCanvas.discardActiveObject().renderAll();
  };

  const downloadImage = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
    });
    const link = document.createElement('a');
    link.download = 'forester-annotation.png';
    link.href = dataURL;
    link.click();
  };

  const handleAiMark = async () => {
    if (!fabricCanvas || !imageRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    toast.info('AI is scanning for wildlife...');

    try {
      const detections = await aiMarkImage(imageUrl);
      
      if (detections.length === 0) {
        toast.error('AI couldn\'t find anything specific to mark here.');
        return;
      }

      const img = imageRef.current;
      const imgWidth = img.getScaledWidth();
      const imgHeight = img.getScaledHeight();
      const imgTop = img.top!;
      const imgLeft = img.left!;

      detections.forEach((det: Detection) => {
        const [ymin, xmin, ymax, xmax] = det.box_2d;
        
        // Convert normalized [0, 1000] to canvas coordinates relative to image
        const left = imgLeft + (xmin / 1000) * imgWidth;
        const top = imgTop + (ymin / 1000) * imgHeight;
        const width = ((xmax - xmin) / 1000) * imgWidth;
        const height = ((ymax - ymin) / 1000) * imgHeight;

        const rect = new Rect({
          left,
          top,
          width,
          height,
          fill: 'transparent',
          stroke: '#22c55e', // Green for AI detections
          strokeWidth: 3,
        });

        const label = new IText(det.label, {
          left,
          top: top - 25,
          fontSize: 16,
          fill: '#22c55e',
          fontFamily: 'system-ui',
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.5)',
        });

        fabricCanvas.add(rect, label);
      });

      fabricCanvas.renderAll();
      toast.success(`AI marked ${detections.length} features!`);
    } catch (error) {
      console.error('AI Marking failed:', error);
      toast.error('Failed to analyze image with AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute top-6 right-6 flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={downloadImage}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full w-12 h-12"
        >
          <X className="w-8 h-8" />
        </Button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 flex flex-col items-center space-y-6 shadow-2xl overflow-hidden max-w-[95vw] max-h-[90vh]">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-1">Wildlife Mark</h2>
          <p className="text-white/60 text-xs uppercase tracking-widest">Observe • Mark • Save</p>
        </div>

        {/* Desktop Toolbar */}
        <div className="hidden md:flex items-center space-x-2 bg-stone-900/80 p-2 rounded-2xl border border-white/10">
          <ToolButton 
            active={activeTool === 'select'} 
            onClick={() => setActiveTool('select')} 
            icon={<Pointer className="w-5 h-5" />} 
            label="Select"
          />
          <ToolButton 
            active={activeTool === 'pencil'} 
            onClick={() => setActiveTool('pencil')} 
            icon={<PencilIcon className="w-5 h-5" />} 
            label="Sketch"
          />
          <ToolButton 
            active={activeTool === 'square'} 
            onClick={() => setActiveTool('square')} 
            icon={<SquareIcon className="w-5 h-5" />} 
            label="Box"
          />
          <ToolButton 
            active={activeTool === 'circle'} 
            onClick={() => setActiveTool('circle')} 
            icon={<CircleIcon className="w-5 h-5" />} 
            label="Circle"
          />
          <ToolButton 
            active={activeTool === 'text'} 
            onClick={() => setActiveTool('text')} 
            icon={<TypeIcon className="w-5 h-5" />} 
            label="Text"
          />
          <div className="w-[1px] h-8 bg-white/10 mx-1" />
          <ToolButton 
            onClick={removeSelected} 
            icon={<Trash2 className="w-5 h-5 text-rose-400" />} 
            label="Delete Selected"
          />
          <ToolButton 
            onClick={() => {
              const objects = fabricCanvas?.getObjects().filter(o => o.selectable);
              if (objects) fabricCanvas?.remove(...objects);
            }} 
            icon={<Undo2 className="w-5 h-5 text-stone-400" />} 
            label="Clear All Annotations"
          />
          <div className="w-[1px] h-8 bg-white/10 mx-1" />
          <ToolButton 
            active={isAnalyzing} 
            onClick={handleAiMark} 
            icon={isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <Sparkles className="w-5 h-5 text-brand-400" />} 
            label="AI Auto-Mark"
          />
        </div>

        {/* Mobile Toolbar */}
        <div className="md:hidden flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-stone-900/80 p-1.5 rounded-2xl border border-white/10">
            <ToolButton 
              active={activeTool === 'select'} 
              onClick={() => setActiveTool('select')} 
              icon={<Pointer className="w-5 h-5" />} 
              label="Select"
            />
            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 flex items-center space-x-2 outline-none">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-1">Draw</span>
                  <MoreVertical className="w-3 h-3 opacity-60" />
                </button>
              } />
              <DropdownMenuContent align="center" className="w-56 p-2 rounded-[2rem] bg-stone-950/95 backdrop-blur border border-white/10 shadow-2xl z-[300]">
                <DropdownMenuItem onClick={() => setActiveTool('pencil')} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-white/10 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <PencilIcon className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-sm font-bold text-white">Sketch</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTool('square')} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-white/10 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <SquareIcon className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-sm font-bold text-white">Box</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTool('circle')} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-white/10 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <CircleIcon className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-sm font-bold text-white">Circle</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTool('text')} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-white/10 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <TypeIcon className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-sm font-bold text-white">Text</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 outline-none">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                </button>
              } />
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-[2rem] bg-stone-950/95 backdrop-blur border border-white/10 shadow-2xl z-[300]">
                <DropdownMenuItem onClick={handleAiMark} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-brand-900/40 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-brand-900/40 flex items-center justify-center">
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <Sparkles className="w-5 h-5 text-brand-400" />}
                  </div>
                  <span className="text-sm font-bold text-white">{isAnalyzing ? 'Analyzing...' : 'AI Auto-Mark'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={removeSelected} className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-rose-900/40 cursor-pointer text-rose-400">
                  <div className="w-10 h-10 rounded-xl bg-rose-900/40 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">Delete</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const objects = fabricCanvas?.getObjects().filter(o => o.selectable);
                    if (objects) fabricCanvas?.remove(...objects);
                  }} 
                  className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-white/10 cursor-pointer text-stone-400"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Undo2 className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">Clear All</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative border-4 border-white/5 rounded-3xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          )}
          <canvas ref={canvasRef} />
        </div>

        <div className="text-center text-white/40 text-[10px] uppercase tracking-widest font-bold">
          Click an area to add shapes • Drag to sketch • Select & delete to clear
        </div>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-3 rounded-xl transition-all ${
      active 
        ? 'bg-brand-600 text-white shadow-lg scale-110' 
        : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
  >
    {icon}
  </button>
);
