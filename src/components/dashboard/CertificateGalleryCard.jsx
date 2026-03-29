// src/components/dashboard/CertificateGalleryCard.jsx
import leadwiseLogo from '@/assets/images/leadwise.svg';
import { LEADWISE_BRAND_NAVY, LEADWISE_BRAND_ORANGE } from '@/utils/certificateUtils';

/**
 * Gallery-style certificate tile: Leadwise navy frame, white inner panel, brand-orange CTA.
 */
export default function CertificateGalleryCard({
  courseTitle,
  recipientName,
  subtitle = 'Verified certificate of course completion',
  brandTagline = 'Leadwise Academy',
  issuedLabel,
  onViewFull,
  status,
  statusClassName,
}) {
  return (
    <article className="flex flex-col w-full max-w-[340px] mx-auto sm:mx-0">
      <div
        className="rounded-sm p-3 pt-3 pb-4 shadow-md"
        style={{ backgroundColor: LEADWISE_BRAND_NAVY }}
      >
        <div className="relative bg-white px-4 pt-4 pb-5 min-h-[200px] overflow-hidden rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-[2.25rem]">
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center text-[7rem] sm:text-[8rem] font-bold leading-none text-gray-200/90"
            aria-hidden
          >
            L
          </div>

          <div className="relative z-[1] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <img
                  src={leadwiseLogo}
                  alt="Leadwise Academy"
                  className="h-6 w-auto object-contain object-left"
                />
                <p className="text-[10px] text-text-dark mt-0.5 font-medium leading-tight">
                  {brandTagline}
                </p>
              </div>
              {status ? (
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusClassName}`}
                >
                  {status}
                </span>
              ) : null}
            </div>

            <p className="text-[11px] text-text-muted font-medium leading-snug pr-2">
              {subtitle}
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-text-dark leading-tight line-clamp-3 pr-1">
              {courseTitle}
            </h3>

            <div className="mt-1 pt-2 border-t border-gray-100">
              <p className="text-[11px] text-text-muted font-medium">Awarded to</p>
              <p
                className="text-base font-bold truncate"
                style={{ color: LEADWISE_BRAND_NAVY }}
              >
                {recipientName}
              </p>
              {issuedLabel ? (
                <p className="text-[10px] text-text-muted mt-1">{issuedLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewFull}
        className="w-full py-3 px-4 text-sm font-semibold text-white text-center rounded-b-md -mt-0.5 transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F7841C]"
        style={{ backgroundColor: LEADWISE_BRAND_ORANGE }}
      >
        View full certificate
      </button>
    </article>
  );
}
