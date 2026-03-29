// src/components/course/CertificateColorCustomizer.jsx
import Button from '@/components/ui/Button';
import {
  getCertificateThemeColorSlots,
  sanitizeHexColor,
} from '@/utils/certificateUtils';

/**
 * Per-template certificate color overrides (stored as theme_colors on the template).
 * @param {Object} props
 * @param {string} props.themeKey
 * @param {Record<string, string>} props.value
 * @param {(next: Record<string, string>) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function CertificateColorCustomizer({ themeKey, value, onChange, disabled = false }) {
  const slots = getCertificateThemeColorSlots(themeKey);

  const handleColorInput = (key, hex) => {
    const next = { ...value };
    const clean = sanitizeHexColor(hex, null);
    if (clean) next[key] = clean;
    else delete next[key];
    onChange(next);
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-light">
          Optional. Leave default to use the theme&apos;s built-in palette.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || Object.keys(value || {}).length === 0}
          onClick={handleReset}
        >
          Reset colors
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((slot) => {
          const current = value?.[slot.key];
          const display = current && sanitizeHexColor(current, null) ? current : slot.defaultColor;
          return (
            <div key={slot.key} className="flex items-center gap-3">
              <label className="flex flex-1 flex-col gap-1 min-w-0">
                <span className="text-xs font-medium text-text-dark">{slot.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={display.length === 9 ? display.slice(0, 7) : display}
                    disabled={disabled}
                    onChange={(e) => handleColorInput(slot.key, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5 disabled:opacity-50"
                    aria-label={`${slot.label} color picker`}
                  />
                  <input
                    type="text"
                    value={current || ''}
                    disabled={disabled}
                    onChange={(e) => handleColorInput(slot.key, e.target.value)}
                    placeholder={slot.defaultColor}
                    className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1.5 text-xs font-mono text-text-dark focus:border-primary-default focus:ring-1 focus:ring-primary-default"
                    spellCheck={false}
                  />
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
