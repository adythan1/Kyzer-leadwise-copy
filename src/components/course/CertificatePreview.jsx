// src/components/course/CertificatePreview.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CERTIFICATE_THEMES } from '@/utils/certificateUtils';

export default function CertificatePreview({
  certificateData,
  theme = 'gallery',
  showWatermark = true,
  logoUrl = null,
  logoPosition = 'top-left',
  onDownload,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (!certificateData) return undefined;

    let cancelled = false;

    const generatePreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        const { renderCertificateCanvas } = await import('@/utils/certificateUtils');
        await renderCertificateCanvas(ctx, canvas.width, canvas.height, theme, certificateData, {
          logo_url: logoUrl,
          logo_position: logoPosition,
          showWatermark,
        });

        if (cancelled) return;

        canvas.toBlob((blob) => {
          if (cancelled) return;
          if (blob) {
            const url = URL.createObjectURL(blob);
            if (previewUrlRef.current) {
              URL.revokeObjectURL(previewUrlRef.current);
            }
            previewUrlRef.current = url;
            setPreviewUrl(url);
          } else {
            setError('Failed to generate preview image');
          }
          setLoading(false);
        }, 'image/png');
      } catch {
        if (!cancelled) {
          setError('Failed to generate preview');
          setLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      cancelled = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [certificateData, theme, logoUrl, logoPosition, showWatermark, refreshKey]);

  const handleDownload = async () => {
    if (onDownload) {
      onDownload(theme);
    }
  };

  const handleRefresh = useCallback(() => {
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  if (loading) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <LoadingSpinner size="lg" />
        <p className="text-text-light mt-4">Generating certificate preview...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="text-red-600 mb-4">
          <RefreshCw className="w-8 h-8 mx-auto" />
        </div>
        <p className="text-text-dark mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary-default" />
          <h3 className="font-semibold text-text-dark">Certificate Preview</h3>
          <span className="text-sm text-text-muted">
            ({CERTIFICATE_THEMES[theme]?.name || 'Gallery'} theme)
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="p-4">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <img
                src={previewUrl}
                alt="Certificate Preview"
                className="w-full h-auto max-h-96 object-contain"
                style={{ aspectRatio: '4/3' }}
              />
            </div>

            {showDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-text-dark mb-3">Theme Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Theme:</span>
                    <div className="font-medium">{CERTIFICATE_THEMES[theme]?.name}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Description:</span>
                    <div className="font-medium">{CERTIFICATE_THEMES[theme]?.description}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Title Font:</span>
                    <div className="font-medium">{CERTIFICATE_THEMES[theme]?.fonts.title.family.split(',')[0]}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Body Font:</span>
                    <div className="font-medium">{CERTIFICATE_THEMES[theme]?.fonts.body.family.split(',')[0]}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Primary Color:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: CERTIFICATE_THEMES[theme]?.colors.primary }}
                      />
                      <span className="font-mono text-xs">{CERTIFICATE_THEMES[theme]?.colors.primary}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted">Accent Color:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: CERTIFICATE_THEMES[theme]?.colors.accent }}
                      />
                      <span className="font-mono text-xs">{CERTIFICATE_THEMES[theme]?.colors.accent}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-text-light">No preview available</p>
          </div>
        )}
      </div>
    </Card>
  );
}
