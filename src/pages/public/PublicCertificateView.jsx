// src/pages/public/PublicCertificateView.jsx
// Public, no-login page: anyone with the share link can view the rendered certificate.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { revokeObjectURL } from '@/utils/certificateUtils';

export default function PublicCertificateView() {
  const { shareToken } = useParams();
  const [imageUrl, setImageUrl] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const run = async () => {
      if (!shareToken || shareToken.trim().length < 16) {
        setError('This certificate link is invalid.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('get_certificate_by_share_token', {
          p_token: shareToken.trim(),
        });

        if (rpcError) {
          throw rpcError;
        }

        if (
          data == null ||
          (typeof data === 'object' && data !== null && !data.certificate_data)
        ) {
          setError('This certificate could not be found. The link may be wrong or no longer valid.');
          setLoading(false);
          return;
        }

        const payload = typeof data === 'string' ? JSON.parse(data) : data;
        const certData = payload.certificate_data;
        const template = payload.template || {};

        if (!certData || typeof certData !== 'object') {
          setError('Certificate data is not available.');
          setLoading(false);
          return;
        }

        setCourseTitle(
          typeof certData.course_title === 'string' ? certData.course_title : 'Course certificate'
        );

        const {
          renderCertificateCanvas,
          getCertificateCanvasDimensions,
        } = await import('@/utils/certificateUtils');

        const theme = template.theme || 'gallery';
        const { width: cw, height: ch } = getCertificateCanvasDimensions(theme);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas not supported');
        }

        await renderCertificateCanvas(ctx, cw, ch, theme, certData, {
          logo_url: template.logo_url,
          logo_position: template.logo_position || 'top-left',
          theme_colors:
            template.theme_colors && typeof template.theme_colors === 'object'
              ? template.theme_colors
              : undefined,
        });

        await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (cancelled) {
              resolve();
              return;
            }
            if (!blob) {
              reject(new Error('Failed to render certificate'));
              return;
            }
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
            resolve();
          }, 'image/png');
        });
      } catch {
        if (!cancelled) {
          setError('Unable to load this certificate. Ask the sender for a new link.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (objectUrl) {
        revokeObjectURL(objectUrl);
      }
    };
  }, [shareToken]);

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-text-light mb-1">Leadwise Academy</p>
            <h1 className="text-xl font-semibold text-text-dark">
              {courseTitle || 'Verified certificate'}
            </h1>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-primary-default hover:text-primary-dark"
          >
            Back to home
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-border bg-background-white">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-text-light text-sm">Loading certificate…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-background-white p-10 text-center">
            <p className="text-text-dark font-medium mb-2">Certificate unavailable</p>
            <p className="text-text-light text-sm">{error}</p>
          </div>
        ) : imageUrl ? (
          <div className="rounded-xl border border-border bg-background-white shadow-sm overflow-hidden">
            <img
              src={imageUrl}
              alt={courseTitle ? `Certificate: ${courseTitle}` : 'Course completion certificate'}
              className="w-full h-auto object-contain max-h-[min(85vh,640px)] mx-auto block bg-background-medium"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
