
import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, selectedImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resizeAndCompress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension for Gemini to ensure fast upload and avoid payload limits
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Export as high quality JPEG to save space
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const processedBase64 = await resizeAndCompress(file);
        onImageSelect(processedBase64);
      } catch (err) {
        console.error("Image processing failed", err);
        alert("Could not process image. Try another one!");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/50 active:scale-[0.98] ${selectedImage ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white'}`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center animate-pulse">
            <i className="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-2"></i>
            <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest">Optimizing...</p>
          </div>
        ) : selectedImage ? (
          <img src={selectedImage} alt="Target" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="text-center p-4">
            <i className="fas fa-camera text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-500 font-medium">Upload Hero Photo</p>
            <p className="text-gray-400 text-sm">Target character face</p>
          </div>
        )}
      </div>
      {/* Standard file input with better iOS support attributes */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*"
        className="hidden" 
      />
    </div>
  );
};
