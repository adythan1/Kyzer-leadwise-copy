// src/components/ui/BrandAccentCard.jsx
import { cloneElement, isValidElement } from "react";
import { clsx } from "clsx";

/**
 * Semantic accent keys for metrics and dashboard tiles.
 * Bar + icon tints come from themes.css (--color-primary, --color-success, …) so they track light / dark / corporate / nature themes.
 */
export const DASHBOARD_ACCENT_VARIANTS = {
  blue: {
    bar: "bg-metric-accent-primary-bar",
    iconBg: "bg-metric-accent-primary-icon",
    iconText: "text-metric-accent-primary-icon",
  },
  green: {
    bar: "bg-metric-accent-success-bar",
    iconBg: "bg-metric-accent-success-icon",
    iconText: "text-metric-accent-success-icon",
  },
  orange: {
    bar: "bg-metric-accent-warning-bar",
    iconBg: "bg-metric-accent-warning-icon",
    iconText: "text-metric-accent-warning-icon",
  },
  purple: {
    bar: "bg-metric-accent-primary-alt-bar",
    iconBg: "bg-metric-accent-primary-alt-icon",
    iconText: "text-metric-accent-primary-alt-icon",
  },
  emerald: {
    bar: "bg-metric-accent-success-deep-bar",
    iconBg: "bg-metric-accent-success-deep-icon",
    iconText: "text-metric-accent-success-deep-icon",
  },
  slate: {
    bar: "bg-metric-accent-neutral-bar",
    iconBg: "bg-metric-accent-neutral-icon",
    iconText: "text-metric-accent-neutral-icon",
  },
  error: {
    bar: "bg-metric-accent-error-bar",
    iconBg: "bg-metric-accent-error-icon",
    iconText: "text-metric-accent-error-icon",
  },
};

export function getDashboardAccent(variant) {
  return DASHBOARD_ACCENT_VARIANTS[variant] || DASHBOARD_ACCENT_VARIANTS.blue;
}

function BrandTopHairline() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-90"
      style={{
        background:
          "linear-gradient(90deg, transparent 5%, var(--color-primary) 50%, transparent 95%)",
      }}
      aria-hidden
    />
  );
}

/**
 * Leadwise-branded panel: orange top hairline + left accent bar + padded content.
 *
 * @param {object} props
 * @param {'blue' | 'green' | 'orange' | 'purple'} [props.variant]
 * @param {boolean} [props.showBrandTopBar]
 * @param {boolean} [props.showLeftBar]
 * @param {string} [props.paddingClassName]
 */
export function BrandAccentCard({
  variant = "blue",
  className = "",
  children,
  showBrandTopBar = true,
  showLeftBar = true,
  paddingClassName = "p-6",
  ...rootProps
}) {
  const accent = getDashboardAccent(variant);

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-border bg-background-white shadow-sm",
        paddingClassName,
        className,
      )}
      {...rootProps}
    >
      {showBrandTopBar ? <BrandTopHairline /> : null}
      {showLeftBar ? (
        <span
          className={clsx(
            "absolute bottom-6 left-0 top-6 w-1 rounded-r-full",
            accent.bar,
          )}
          aria-hidden
        />
      ) : null}
      <div className="relative pl-3">{children}</div>
    </div>
  );
}

/**
 * Icon container matching {@link BrandAccentCard} variant (background + merges icon text color).
 *
 * @param {object} props
 * @param {'blue' | 'green' | 'orange' | 'purple'} [props.variant]
 * @param {string} [props.iconClassName] — size/size classes for the icon (e.g. h-6 w-6)
 */
export function BrandAccentIconFrame({
  variant = "blue",
  className = "",
  iconClassName = "h-6 w-6",
  children,
}) {
  const accent = getDashboardAccent(variant);

  return (
    <div
      className={clsx(
        "shrink-0 rounded-lg p-3 ring-1 ring-black/[0.04]",
        accent.iconBg,
        className,
      )}
    >
      {isValidElement(children)
        ? cloneElement(children, {
            className: clsx(iconClassName, accent.iconText, children.props.className),
          })
        : children}
    </div>
  );
}

export default BrandAccentCard;
