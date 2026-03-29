import { useTheme } from '@/hooks/useTheme';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PageTitle from '@/components/layout/PageTitle';

export default function ThemeDemo() {
  const { theme, isDark, isLight, isCustom } = useTheme();

  const colorPalette = [
    { name: 'Primary', classes: ['bg-primary', 'text-background-white'] },
    { name: 'Primary Dark', classes: ['bg-primary-dark', 'text-background-white'] },
    { name: 'Primary Light', classes: ['bg-primary-light', 'text-text-dark'] },
    { name: 'Success', classes: ['bg-success', 'text-background-white'] },
    { name: 'Warning', classes: ['bg-warning', 'text-background-white'] },
    { name: 'Error', classes: ['bg-error', 'text-background-white'] },
    { name: 'Background White', classes: ['bg-background-white', 'text-text-dark', 'border', 'border-border'] },
    { name: 'Background Light', classes: ['bg-background-light', 'text-text-dark'] },
    { name: 'Background Medium', classes: ['bg-background-medium', 'text-text-dark'] },
    { name: 'Background Dark', classes: ['bg-background-dark', 'text-text-dark'] },
  ];

  const textColors = [
    { name: 'Text Dark', classes: ['text-text-dark'] },
    { name: 'Text Medium', classes: ['text-text-medium'] },
    { name: 'Text Light', classes: ['text-text-light'] },
    { name: 'Text Muted', classes: ['text-text-muted'] },
  ];

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <PageTitle
            size="large"
            align="center"
            title="Theme System Demo"
            subtitle="Explore the different themes available in Leadwise Academy"
            subtitleWrapperClassName="text-xl text-text-light mb-8"
          />
          
          {/* Theme Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <ThemeSwitcher />
            <ThemeToggle />
          </div>
          
          {/* Current Theme Info */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-background-white border border-border rounded-lg">
            <span className="text-text-light">Current Theme:</span>
            <span className="font-semibold text-text-dark capitalize">{theme}</span>
            {isDark && <span className="text-xs text-text-muted">(Dark Mode)</span>}
            {isLight && <span className="text-xs text-text-muted">(Light Mode)</span>}
            {isCustom && <span className="text-xs text-text-muted">(Custom Theme)</span>}
          </div>
        </div>

        {/* Color Palette */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {colorPalette.map((color, index) => (
              <div key={index} className="text-center">
                <div className={`w-20 h-20 mx-auto rounded-lg ${color.classes.join(' ')} flex items-center justify-center text-sm font-medium mb-2`}>
                  {color.name}
                </div>
                <div className="text-xs text-text-light">{color.name}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Text Colors */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Text Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {textColors.map((textColor, index) => (
              <div key={index} className="text-center">
                <div className={`text-lg font-medium ${textColor.classes.join(' ')} mb-2`}>
                  {textColor.name}
                </div>
                <div className={`text-sm ${textColor.classes.join(' ')}`}>
                  Sample text in this color
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Component Examples */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Component Examples</h2>
          <div className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-3">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Default Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button size="sm">Small Button</Button>
                <Button size="lg">Large Button</Button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-3">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="font-semibold text-text-dark mb-2">Sample Card</h4>
                  <p className="text-text-light text-sm">This is a sample card component with theme-aware styling.</p>
                </Card>
                <Card className="p-4 bg-primary-light">
                  <h4 className="font-semibold text-primary-dark mb-2">Primary Card</h4>
                  <p className="text-primary-dark text-sm">Card with primary light background.</p>
                </Card>
                <Card className="p-4 bg-success-light">
                  <h4 className="font-semibold text-success-dark mb-2">Success Card</h4>
                  <p className="text-success-dark text-sm">Card with success light background.</p>
                </Card>
              </div>
            </div>

            {/* Form Elements */}
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-3">Form Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Input Field</label>
                  <input
                    type="text"
                    placeholder="Enter text here..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background-white text-text-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Select Dropdown</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background-white text-text-dark">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Theme Information */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Theme Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-3">Available Themes</h3>
              <ul className="space-y-2 text-text-light">
                <li><strong className="text-text-dark">Light:</strong> Clean and bright design</li>
                <li><strong className="text-text-dark">Dark:</strong> Easy on the eyes, modern look</li>
                <li><strong className="text-text-dark">Corporate:</strong> Professional blue theme</li>
                <li><strong className="text-text-dark">Nature:</strong> Green and fresh design</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-3">Features</h3>
              <ul className="space-y-2 text-text-light">
                <li>• Automatic system theme detection</li>
                <li>• Smooth transitions between themes</li>
                <li>• Persistent theme selection</li>
                <li>• CSS custom properties for dynamic theming</li>
                <li>• Tailwind CSS integration</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
