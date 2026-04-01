// src/components/ui/MetricTile.jsx
import { isValidElement } from "react";
import { clsx } from "clsx";
import {
  BrandAccentCard,
  BrandAccentIconFrame,
} from "@/components/ui/BrandAccentCard";

/**
 * Branded stat tile: Leadwise accent shell + optional icon.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} props.value
 * @param {'blue' | 'green' | 'orange' | 'purple' | 'emerald' | 'slate' | 'error'} [props.variant]
 * @param {import('react').ComponentType<{ className?: string }>} [props.icon]
 * @param {'row' | 'stack'} [props.layout] — row: title/value left, icon right; stack: centered vertical
 * @param {import('react').ReactNode} [props.footer] — extra line under value (row layout only)
 * @param {string} [props.paddingClassName]
 */
export default function MetricTile({
  title,
  value,
  variant = "blue",
  icon: Icon,
  layout = "row",
  footer = null,
  className = "",
  paddingClassName = "p-6",
  onClick,
  ...rest
}) {
  const interactive =
    typeof onClick === "function"
      ? {
          onClick,
          role: "button",
          tabIndex: 0,
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick(event);
            }
          },
        }
      : {};

  if (layout === "stack") {
    return (
      <BrandAccentCard
        variant={variant}
        className={className}
        paddingClassName={paddingClassName}
        {...interactive}
        {...rest}
      >
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          {Icon ? (
            <BrandAccentIconFrame variant={variant} iconClassName="h-5 w-5">
              <Icon />
            </BrandAccentIconFrame>
          ) : null}
          {isValidElement(value) ? (
            <div className="min-w-0 text-text-dark">{value}</div>
          ) : (
            <p className="text-2xl font-bold text-text-dark">{value}</p>
          )}
          <p className="text-sm text-text-medium">{title}</p>
        </div>
      </BrandAccentCard>
    );
  }

  return (
    <BrandAccentCard
      variant={variant}
      className={className}
      paddingClassName={paddingClassName}
      {...interactive}
      {...rest}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-light">{title}</p>
          {isValidElement(value) ? (
            <div className="min-w-0 text-text-dark">{value}</div>
          ) : (
            <div className="text-2xl font-bold text-text-dark">{value}</div>
          )}
          {footer ? (
            <div className="mt-1 text-sm text-text-light">{footer}</div>
          ) : null}
        </div>
        {Icon ? (
          <BrandAccentIconFrame variant={variant}>
            <Icon />
          </BrandAccentIconFrame>
        ) : null}
      </div>
    </BrandAccentCard>
  );
}
