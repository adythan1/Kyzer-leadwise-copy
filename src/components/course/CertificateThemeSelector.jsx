// src/components/course/CertificateThemeSelector.jsx
import { useState } from 'react';
import { Check, Palette, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { CERTIFICATE_THEMES } from '@/utils/certificateUtils';

export default function CertificateThemeSelector({ 
  selectedTheme = 'gallery', 
  onThemeChange, 
  onPreview,
  disabled = false 
}) {
  const [previewTheme, setPreviewTheme] = useState(null);

  const handleThemeSelect = (themeKey) => {
    if (!disabled) {
      onThemeChange(themeKey);
    }
  };

  const handlePreview = (themeKey) => {
    setPreviewTheme(themeKey);
    onPreview?.(themeKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-primary-default" />
        <h3 className="text-lg font-semibold text-text-dark">Certificate Theme</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(CERTIFICATE_THEMES)
          .sort(([a], [b]) => {
            if (a === 'gallery') return -1;
            if (b === 'gallery') return 1;
            return a.localeCompare(b);
          })
          .map(([themeKey, theme]) => (
          <Card 
            key={themeKey}
            className={`p-4 cursor-pointer transition-all duration-200 ${
              selectedTheme === themeKey 
                ? 'ring-2 ring-primary-default bg-primary-light' 
                : 'hover:shadow-md hover:border-primary-light'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleThemeSelect(themeKey)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-text-dark">{theme.name}</h4>
                <p className="text-sm text-text-light">{theme.description}</p>
              </div>
              {selectedTheme === themeKey && (
                <Check className="w-5 h-5 text-primary-default" />
              )}
            </div>

            {/* Theme Preview */}
            <div className="space-y-2 mb-4">
              <div 
                className="h-20 rounded border-2 border-gray-200 flex items-center justify-center"
                style={{ 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.decorations.border.color,
                  borderWidth: theme.decorations.border.width
                }}
              >
                <div className="text-center">
                  <div 
                    className="font-bold text-lg"
                    style={{ 
                      fontFamily: theme.fonts.title.family,
                      fontSize: theme.fonts.title.size,
                      color: theme.fonts.title.color
                    }}
                  >
                    Sample Certificate
                  </div>
                  <div 
                    className="text-sm mt-1"
                    style={{ 
                      fontFamily: theme.fonts.body.family,
                      fontSize: theme.fonts.body.size,
                      color: theme.fonts.body.color
                    }}
                  >
                    John Doe
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Details */}
            <div className="space-y-2 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Primary Font:</span>
                <span className="font-mono">{theme.fonts.title.family.split(',')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span>Accent Color:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                  <span>{theme.colors.accent}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(themeKey);
                }}
                disabled={disabled}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Theme Details */}
      {selectedTheme && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-semibold text-text-dark mb-2">
            Selected: {CERTIFICATE_THEMES[selectedTheme].name}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Title Font:</span>
              <div className="font-medium">{CERTIFICATE_THEMES[selectedTheme].fonts.title.family.split(',')[0]}</div>
            </div>
            <div>
              <span className="text-text-muted">Body Font:</span>
              <div className="font-medium">{CERTIFICATE_THEMES[selectedTheme].fonts.body.family.split(',')[0]}</div>
            </div>
            <div>
              <span className="text-text-muted">Primary Color:</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: CERTIFICATE_THEMES[selectedTheme].colors.primary }}
                />
                <span className="font-mono text-xs">{CERTIFICATE_THEMES[selectedTheme].colors.primary}</span>
              </div>
            </div>
            <div>
              <span className="text-text-muted">Accent Color:</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: CERTIFICATE_THEMES[selectedTheme].colors.accent }}
                />
                <span className="font-mono text-xs">{CERTIFICATE_THEMES[selectedTheme].colors.accent}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
