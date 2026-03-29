// src/components/dashboard/CertificateGalleryCard.jsx
import { ChevronRight } from 'lucide-react';
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
    <div className="mx-auto flex w-full max-w-[340px] flex-col sm:mx-0">
      <article className="flex w-full flex-col">
        <div
          className="rounded-sm p-3 pb-3 pt-3 shadow-md"
          style={{ backgroundColor: LEADWISE_BRAND_NAVY }}
        >
          <div className="relative min-h-[200px] overflow-hidden rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-[2.25rem] bg-white px-4 pb-5 pt-4">
            <div
              className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[7rem] font-bold leading-none text-gray-200/90 sm:text-[8rem]"
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
                  <p className="mt-0.5 text-[10px] font-medium leading-tight text-text-dark">
                    {brandTagline}
                  </p>
                </div>
                {status ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClassName}`}
                  >
                    {status}
                  </span>
                ) : null}
              </div>

              <p className="pr-2 text-[11px] font-medium leading-snug text-text-muted">{subtitle}</p>

              <h3 className="line-clamp-3 pr-1 text-lg font-bold leading-tight text-text-dark sm:text-xl">
                {courseTitle}
              </h3>

              <div className="mt-1 border-t border-gray-100 pt-2">
                <p className="text-[11px] font-medium text-text-muted">Awarded to</p>
                <p
                  className="truncate text-base font-bold"
                  style={{ color: LEADWISE_BRAND_NAVY }}
                >
                  {recipientName}
                </p>
                {issuedLabel ? (
                  <p className="mt-1 text-[10px] text-text-muted">{issuedLabel}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>

      <button
        type="button"
        onClick={onViewFull}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[opacity,box-shadow] hover:opacity-95 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7841C] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        style={{ backgroundColor: LEADWISE_BRAND_ORANGE }}
      >
        <span>View full certificate</span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </button>
    </div>
  );
}
