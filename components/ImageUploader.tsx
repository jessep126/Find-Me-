
import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, selectedImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/50 ${selectedImage ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white'}`}
      >
        {selectedImage ? (
          <img src={selectedImage} alt="Target" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="text-center p-4">
            <i className="fas fa-camera text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-500 font-medium">Click to upload your photo</p>
            <p className="text-gray-400 text-sm">Target to hide</p>
          </div>
        )}
      </div>
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
