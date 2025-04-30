// Componente FileSelector.tsx
import {  useRef, useEffect } from 'react';

interface FileSelectorProps {
  onFileSelected: (file: File) => void;
  onCancel: () => void;
}

const FileSelector = ({ onFileSelected, onCancel }: FileSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Automaticamente abre el selector cuando se monta
    fileInputRef.current?.click();
    
    // Cleanup para asegurarse de que no queden event listeners
    return () => {
      // Limpiar cualquier listener si es necesario
    };
  }, []);
  
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          onFileSelected(file);
        } else {
          onCancel();
        }
      }}
      onBlur={onCancel}
    />
  );
};

export default FileSelector;