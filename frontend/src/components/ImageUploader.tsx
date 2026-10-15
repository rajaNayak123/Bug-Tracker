import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { bugApi, s3Api } from '../api/client';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  currentImageKey?: string | null;
  onImageUploaded: (imageKey: string | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  currentImageKey,
  onImageUploaded,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file format. Only JPG, JPEG, PNG, and WebP images are permitted.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const res = await bugApi.getUploadUrl(file.name, file.type, file.size);
      const { uploadUrl, imageKey: newKey, requiredHeaders } = res.data;

      setUploadProgress(30);

      await s3Api.uploadFileToS3(
        uploadUrl,
        file,
        requiredHeaders,
        (progress) => {
          const scaled = 30 + Math.round((progress * 70) / 100);
          setUploadProgress(scaled);
        }
      );

      onImageUploaded(newKey);
      setUploadProgress(100);
    } catch (err: any) {
      setError(err.message || 'Direct S3 image upload failed. Please try again.');
      setPreviewUrl(currentImageUrl || null);
      onImageUploaded(currentImageKey || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onImageUploaded(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">Screenshot / Image Attachment</label>

      {error && (
        <div className="alert alert-error" style={{ padding: '0.625rem 0.875rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {previewUrl ? (
        <div className="preview-container">
          <img src={previewUrl} alt="Attached screenshot" className="preview-image" />
          <button
            type="button"
            id="remove-image-btn"
            onClick={handleRemove}
            className="btn btn-secondary"
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              padding: '0.375rem 0.625rem',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              fontSize: '0.75rem',
            }}
          >
            <X size={14} /> Remove
          </button>
          {isUploading && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(17, 24, 39, 0.9)',
              padding: '0.5rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span>Uploading directly to S3...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          id="upload-dropzone"
          className="upload-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id="bug-file-input"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
            <Upload size={32} />
          </div>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Click or drag screenshot here to upload
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            JPG, PNG, or WebP up to 5 MB. Uploaded directly to private AWS S3.
          </p>
        </div>
      )}
    </div>
  );
};
