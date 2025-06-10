import React, { useState, useRef } from 'react';

interface FileUploadProps {
  label: string;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onChange,
  accept = ".xlsx, .xls, .csv",
  required = false,
  id
}) => {
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || '');
    onChange(file);
  };

  const handleRemoveFile = () => {
    setFileName('');
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="flex items-center">
        <div className="relative flex-1">
          <input
            type="file"
            id={id}
            className="form-file-input"
            accept={accept}
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </div>
        {fileName && (
          <button
            type="button"
            className="btn btn-outline ml-2"
            onClick={handleRemoveFile}
          >
            취소
          </button>
        )}
      </div>
      {fileName && (
        <div className="mt-2 p-2 bg-light-gray rounded-lg">
          <div className="flex items-center">
            <span className="text-sm font-bold text-primary">
              {fileName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 