// apps/web/src/components/UploadForm.tsx
import { useRef, useState } from 'react';
import { uploadImportFile, type ImportDetail } from '../api/imports';

interface UploadFormProps {
  onUploaded: (result: ImportDetail) => void;
}

export function UploadForm({ onUploaded }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadImportFile(file);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="upload-form">
      <label htmlFor="csv-upload" className="upload-form__label">
        {isUploading ? 'Uploading…' : 'Upload transactions CSV'}
      </label>
      <input
        id="csv-upload"
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        disabled={isUploading}
        onChange={(e) => handleFileChosen(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="upload-form__error">
          {error}
        </p>
      )}
    </div>
  );
}
