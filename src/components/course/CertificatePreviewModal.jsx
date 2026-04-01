// src/components/course/CertificatePreviewModal.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Share2, Eye, Award, Copy } from 'lucide-react';
import { Button, LoadingSpinner, Modal } from '@/components/ui';
import { useCourseStore } from '@/store/courseStore';
import {
  formatCertificateData,
  downloadBlob,
  revokeObjectURL,
  handleCertificateError,
  buildCertificateShareLink,
} from '@/utils/certificateUtils';

export default function CertificatePreviewModal({
  courseId,
  courseName,
  userId,
  isOpen,
  onClose
}) {
  const actions = useCourseStore(state => state.actions);
  const [certificateData, setCertificateData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);
  const [copyingLink, setCopyingLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShareStatus(null);
      setCopyingLink(false);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadCertificate = useCallback(async () => {
    if (!userId || !courseId) {
      setError('User ID or Course ID is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the user's certificate for this course
      const { data: userCertificate, error: fetchError } = await actions.getCertificateForCourse(userId, courseId);

      if (fetchError) {
        setError('Certificate not found. You may need to complete the course first.');
        setLoading(false);
        return;
      }

      if (userCertificate) {
        setCertificateData(userCertificate);

        // Generate preview with error handling
        try {
          const { url } = await actions.generateCertificatePreview(userCertificate.id);
          if (url) {
            setPreviewUrl(url);
          }
        } catch {
          setError('Unable to generate certificate preview. You can still download the certificate.');
        }
      } else {
        setError('No certificate found for this course. Please complete the course to earn a certificate.');
      }
    } catch (error) {
      const errorMessage = handleCertificateError(error, 'load certificate');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, courseId, actions]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (isOpen && userId && courseId && mounted) {
        await loadCertificate();
      }
    };

    if (isOpen && userId && courseId) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, userId, courseId, loadCertificate]);

  const handleDownload = useCallback(async () => {
    if (!certificateData) return;

    try {
      setDownloading(true);

      const { blob, filename } = await actions.generateCertificatePreview(certificateData.id);

      // Use utility function for download
      downloadBlob(blob, filename);
      setShareStatus('downloaded');
    } catch (error) {
      const errorMessage = handleCertificateError(error, 'download certificate');
      setError(errorMessage);
      setShareStatus('error');
    } finally {
      setDownloading(false);
    }
  }, [certificateData, actions]);

  const handleShare = useCallback(async () => {
    if (!certificateData || !userId) {
      setShareStatus('error');
      return;
    }

    setCopyingLink(true);
    try {
      let token = certificateData.share_token;
      if (!token) {
        const { data: minted, error: mintError } = await actions.mintCertificateShareToken(
          certificateData.id
        );
        if (mintError || !minted) {
          setShareStatus('error');
          return;
        }
        token = minted;
        setCertificateData((prev) => (prev ? { ...prev, share_token: token } : prev));
      }

      const shareUrl =
        buildCertificateShareLink(token) ||
        certificateData.share_url ||
        certificateData.public_url ||
        window.location.href;

      const sharePayload = {
        title: `${courseName} Certificate`,
        url: shareUrl,
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
        await navigator.share(sharePayload);
        setShareStatus('shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
      } else {
        window.open(shareUrl, '_blank', 'noopener');
        setShareStatus('opened');
      }
    } catch {
      setShareStatus('error');
    } finally {
      setCopyingLink(false);
    }
  }, [courseName, certificateData, userId, actions]);

  const handleViewInNewTab = useCallback(async () => {
    if (!certificateData) return;

    let shareUrl =
      buildCertificateShareLink(certificateData.share_token) ||
      certificateData.share_url ||
      certificateData.public_url;

    if (!shareUrl && userId) {
      const { data: minted } = await actions.mintCertificateShareToken(certificateData.id);
      if (minted) {
        setCertificateData((prev) => (prev ? { ...prev, share_token: minted } : prev));
        shareUrl = buildCertificateShareLink(minted);
      }
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener');
      setShareStatus('opened');
      return;
    }

    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener');
      setShareStatus('opened');
    }
  }, [previewUrl, certificateData, userId, actions]);

  const resetShareStatus = useCallback(() => {
    if (shareStatus && shareStatus !== 'error') {
      setShareStatus(null);
    }
  }, [shareStatus, courseName, certificateData]);

  // Memoized certificate details for performance using utility function
  const certificateDetails = useMemo(() => {
    if (!certificateData) return null;

    const formattedData = formatCertificateData(certificateData);
    if (!formattedData) return null;

    return [
      {
        label: 'Recipient',
        value: formattedData.recipient
      },
      {
        label: 'Course',
        value: formattedData.course
      },
      {
        label: 'Completion Date',
        value: formattedData.completionDate
      },
      {
        label: 'Issue Date',
        value: formattedData.issueDate
      },
      {
        label: 'Certificate ID',
        value: formattedData.certificateId,
        isMonospace: true
      },
      {
        label: 'Instructor',
        value: formattedData.instructor
      },
      {
        label: 'Organization',
        value: formattedData.organization
      }
    ].filter(item => item.value && item.value !== 'Unknown');
  }, [certificateData]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setShareStatus(null);
        onClose();
      }}
      title={courseName ? `${courseName} Certificate` : 'Course Certificate'}
      size="xl"
      showCloseButton
    >
      <div className="space-y-6">
        <div className="overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-text-light mt-4">Generating certificate preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-text-dark mb-2">Error Loading Certificate</h3>
                <p className="text-text-light mb-4">{error}</p>
                <Button onClick={loadCertificate} variant="secondary">
                  Try Again
                </Button>
              </div>
            </div>
          ) : !certificateData ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-dark mb-2">No Certificate Found</h3>
                <p className="text-text-light">
                  Complete this course to earn your certificate.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Certificate Preview */}
              {previewUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Certificate Preview"
                    className="w-full h-auto"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                    onError={() => {
                      setError('Certificate preview failed to load, but you can still download it.');
                    }}
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-text-light">Certificate preview not available</p>
                  <p className="text-sm text-text-light mt-2">You can still download your certificate below</p>
                </div>
              )}

              {/* Certificate Details */}
              {certificateDetails && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-text-dark mb-3">Certificate Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {certificateDetails.map((detail) => (
                      <div key={detail.label}>
                        <span className="text-text-light">{detail.label}:</span>
                        <div className={`font-medium ${detail.isMonospace ? 'font-mono text-xs' : ''}`}>
                          {detail.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Footer Actions */}
        {certificateData && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs text-text-light flex items-center gap-2 min-h-[1.5rem]">
              {shareStatus === 'shared' && <span className="text-success-default">Thanks for sharing your achievement! 🎉</span>}
              {shareStatus === 'copied' && <span className="text-success-default flex items-center gap-1"><Copy className="w-3 h-3" /> Link copied to clipboard</span>}
              {shareStatus === 'opened' && <span className="text-primary-default">Opened certificate preview in a new tab</span>}
              {shareStatus === 'downloaded' && <span className="text-primary-default">Certificate downloaded successfully</span>}
              {shareStatus === 'error' && <span className="text-error-default">Something went wrong. Please try again.</span>}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {previewUrl && (
                <Button variant="ghost" size="sm" onClick={() => void handleViewInNewTab()}>
                  <Eye className="w-4 h-4 mr-2" />
                  Open Preview
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetShareStatus();
                  void handleShare();
                }}
                disabled={copyingLink}
              >
                {copyingLink ? (
                  <div className="w-4 h-4 border-2 border-[#FF8F3F] border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Share
              </Button>
              <Button onClick={handleDownload} size="sm" disabled={downloading}>
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}