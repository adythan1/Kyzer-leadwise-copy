// src/components/layout/PageTitle.jsx
import { LEADWISE_BRAND_ORANGE } from '@/utils/certificateUtils';

const SIZES = {
  default: {
    title: 'text-2xl font-bold text-text-dark pb-3',
    accent: 'h-1 w-14 rounded-full',
    subtitle: 'pt-1 text-sm text-text-light sm:text-base',
  },
  compact: {
    title: 'text-lg font-semibold text-text-dark pb-2',
    accent: 'h-0.5 w-10 rounded-full',
    subtitle: 'pt-0.5 text-sm text-text-light',
  },
  large: {
    title: 'text-2xl md:text-4xl font-bold text-text-dark pb-4',
    accent: 'h-1 w-16 rounded-full',
    subtitle: 'pt-1 text-sm text-text-light sm:text-base md:text-lg',
  },
  hero: {
    title: 'text-4xl md:text-6xl font-bold text-text-dark pb-4 md:pb-6 leading-tight',
    accent: 'h-1 md:h-1.5 w-20 md:w-28 rounded-full',
    subtitle: 'pt-2 text-lg text-text-medium md:text-xl max-w-3xl mx-auto',
  },
};

/**
 * Page heading with Leadwise orange accent (matches Certificates page).
 * Breadcrumbs render above in Layout; use this for title + optional subtitle.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.subtitle]
 * @param {import('react').ReactNode} [props.leading] — e.g. back button or icon before the title
 * @param {'default' | 'compact' | 'large' | 'hero'} [props.size]
 * @param {'left' | 'center'} [props.align]
 * @param {'h1' | 'h2'} [props.as]
 * @param {string} [props.className] — on <header>
 * @param {string} [props.titleClassName] — extra classes on the heading
 * @param {string} [props.subtitleWrapperClassName] — override default subtitle wrapper classes
 * @param {string} [props.accentClassName] — extra classes on the orange accent bar
 */
export default function PageTitle({
  title,
  subtitle,
  leading,
  size = 'default',
  align = 'left',
  as: HeadingTag = 'h1',
  className = '',
  titleClassName = '',
  subtitleWrapperClassName,
  accentClassName = '',
}) {
  const s = SIZES[size] || SIZES.default;
  const subtitleWrap =
    subtitleWrapperClassName !== undefined
      ? subtitleWrapperClassName
      : s.subtitle;

  const headerAlign =
    align === 'center' ? 'text-center flex flex-col items-center' : '';
  const rowAlign =
    align === 'center'
      ? 'flex flex-col items-center gap-3 sm:flex-row sm:justify-center'
      : 'flex items-center gap-3';

  return (
    <header className={`space-y-1 ${headerAlign} ${className}`.trim()}>
      <div className={rowAlign}>
        {leading}
        <HeadingTag
          className={`relative inline-block ${s.title} ${titleClassName}`.trim()}
        >
          {title}
          <span
            className={`absolute bottom-0 left-0 origin-left ${s.accent} ${accentClassName}`.trim()}
            style={{ backgroundColor: LEADWISE_BRAND_ORANGE }}
            aria-hidden
          />
        </HeadingTag>
      </div>
      {subtitle != null && subtitle !== '' ? (
        <div className={subtitleWrap}>{subtitle}</div>
      ) : null}
    </header>
  );
}
