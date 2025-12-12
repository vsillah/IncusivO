import React, { useRef, useState } from 'react';
import { Upload, FileText, X, FileType } from 'lucide-react';
import { FileContent } from '../types';

interface FileUploadProps {
  label: string;
  onFileSelect: (fileContent: FileContent, fileName: string) => void;
  accept?: string;
  placeholder?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  onFileSelect, 
  accept = ".txt,.md,.pdf",
  placeholder = "Paste your text here or upload a .txt, .md, or .pdf file"
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const isPdf = file.type === "application/pdf";
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      let fileContent: FileContent;

      if (isPdf) {
        // result is "data:application/pdf;base64,JVBERi..."
        // We need to strip the prefix for the API
        const base64Data = result.split(',')[1];
        fileContent = {
          mimeType: file.type,
          data: base64Data,
          isBinary: true
        };
        // For PDFs, we don't set the textarea value to the content
        setTextValue(""); 
      } else {
        fileContent = {
          mimeType: "text/plain",
          data: result,
          isBinary: false
        };
        setTextValue(result);
      }

      setFileName(file.name);
      onFileSelect(fileContent, file.name);
    };

    if (isPdf) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextValue(val);
    setFileName(null);
    onFileSelect({
      mimeType: "text/plain",
      data: val,
      isBinary: false
    }, "Manual Input");
  };

  const clearFile = () => {
    setTextValue("");
    setFileName(null);
    onFileSelect({
      mimeType: "text/plain",
      data: "",
      isBinary: false
    }, "");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {fileName && (
          <button onClick={clearFile} className="text-xs text-red-500 hover:text-red-700 flex items-center">
            <X className="w-3 h-3 mr-1" /> Clear
          </button>
        )}
      </div>

      <div
        className={`relative group rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out
          ${dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-white"}
          ${fileName ? "p-4" : "p-8"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />

        {!fileName ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-3 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                <button 
                  onClick={() => inputRef.current?.click()}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Upload a file
                </button> 
                {' '}or drag and drop
              </p>
              <p className="text-xs text-slate-500 mt-1">TXT, MD, PDF (max 5MB)</p>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or paste text</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 text-indigo-900 bg-indigo-50 p-3 rounded-lg">
            {fileName.endsWith('.pdf') ? (
              <FileType className="w-5 h-5 text-red-600 flex-shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
        )}

        {/* Text Area fallback/primary */}
        <textarea
          className={`w-full mt-4 p-3 text-sm border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 min-h-[150px] resize-y
            ${fileName ? "hidden" : "block"}
          `}
          placeholder={placeholder}
          value={textValue}
          onChange={handleTextChange}
        />
      </div>
    </div>
  );
};
