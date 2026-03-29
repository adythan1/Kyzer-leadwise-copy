// src/pages/dashboard/Settings.jsx
import { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Globe,
  Palette,
  Monitor,
  Moon,
  Sun,
  Volume2,
  Download,
  Trash2,
} from "lucide-react";
import PageTitle from "@/components/layout/PageTitle";

export default function Settings() {
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const settingsGroups = [
    {
      title: "Appearance",
      icon: Palette,
      settings: [
        {
          id: "theme",
          label: "Theme",
          description: "Choose your preferred color scheme",
          type: "select",
          value: theme,
          options: [
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ],
          onChange: setTheme,
        },
      ],
    },
    {
      title: "Accessibility",
      icon: Globe,
      settings: [
        {
          id: "language",
          label: "Language",
          description: "Select your preferred language",
          type: "select",
          value: language,
          options: [
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
            { value: "fr", label: "Français" },
            { value: "de", label: "Deutsch" },
          ],
          onChange: setLanguage,
        },
        {
          id: "sounds",
          label: "Sound Effects",
          description: "Enable notification and interaction sounds",
          type: "toggle",
          value: soundEnabled,
          onChange: setSoundEnabled,
        },
      ],
    },
    {
      title: "Learning Preferences",
      icon: User,
      settings: [
        {
          id: "autoplay",
          label: "Auto-play videos",
          description: "Automatically start videos when opening lessons",
          type: "toggle",
          value: true,
          onChange: () => {},
        },
        {
          id: "subtitles",
          label: "Show subtitles",
          description: "Display captions for video content by default",
          type: "toggle",
          value: false,
          onChange: () => {},
        },
        {
          id: "speed",
          label: "Default playback speed",
          description: "Set your preferred video playback speed",
          type: "select",
          value: "1",
          options: [
            { value: "0.5", label: "0.5x" },
            { value: "0.75", label: "0.75x" },
            { value: "1", label: "1x (Normal)" },
            { value: "1.25", label: "1.25x" },
            { value: "1.5", label: "1.5x" },
            { value: "2", label: "2x" },
          ],
          onChange: () => {},
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      settings: [
        {
          id: "desktop-notifications",
          label: "Desktop notifications",
          description: "Show notifications on your desktop",
          type: "toggle",
          value: true,
          onChange: () => {},
        },
        {
          id: "email-digest",
          label: "Weekly email digest",
          description: "Receive a summary of your learning progress",
          type: "toggle",
          value: true,
          onChange: () => {},
        },
        {
          id: "deadline-reminders",
          label: "Deadline reminders",
          description: "Get notified about upcoming assignment deadlines",
          type: "toggle",
          value: true,
          onChange: () => {},
        },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Shield,
      settings: [
        {
          id: "analytics",
          label: "Usage analytics",
          description: "Help improve our platform by sharing usage data",
          type: "toggle",
          value: true,
          onChange: () => {},
        },
        {
          id: "profile-visibility",
          label: "Profile visibility",
          description: "Who can see your learning progress",
          type: "select",
          value: "organization",
          options: [
            { value: "public", label: "Public" },
            { value: "organization", label: "Organization only" },
            { value: "private", label: "Private" },
          ],
          onChange: () => {},
        },
      ],
    },
  ];

  const dangerZoneActions = [
    {
      title: "Export Data",
      description: "Download a copy of all your learning data",
      action: "Export",
      icon: Download,
      variant: "secondary",
    },
    {
      title: "Delete Account",
      description: "Permanently delete your account and all associated data",
      action: "Delete",
      icon: Trash2,
      variant: "danger",
    },
  ];

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <PageTitle
            leading={<SettingsIcon className="w-6 h-6 shrink-0 text-primary" aria-hidden />}
            title="Settings"
            subtitle="Customize your learning experience and manage your preferences"
          />
        </div>

        {/* Settings Groups */}
        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <div
              key={group.title}
              className="bg-white rounded-xl border border-background-dark p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <group.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text-dark">
                  {group.title}
                </h2>
              </div>

              <div className="space-y-6">
                {group.settings.map((setting) => (
                  <div
                    key={setting.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-text-dark mb-1">
                        {setting.label}
                      </label>
                      <p className="text-sm text-text-light">
                        {setting.description}
                      </p>
                    </div>

                    <div className="ml-6">
                      {setting.type === "toggle" && (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setting.value}
                            onChange={(e) => setting.onChange(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      )}

                      {setting.type === "select" && (
                        <select
                          value={setting.value}
                          onChange={(e) => setting.onChange(e.target.value)}
                          className="w-48 px-3 py-2 border border-background-dark rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          {setting.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-6">
              Danger Zone
            </h2>

            <div className="space-y-4">
              {dangerZoneActions.map((action) => (
                <div
                  key={action.title}
                  className="flex items-center justify-between p-4 border border-background-dark rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <action.icon
                      className={`w-5 h-5 ${
                        action.variant === "danger"
                          ? "text-red-600"
                          : "text-text-light"
                      }`}
                    />
                    <div>
                      <h3 className="font-medium text-text-dark">
                        {action.title}
                      </h3>
                      <p className="text-sm text-text-light">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      action.variant === "danger"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border border-primary text-primary hover:bg-primary-light"
                    }`}
                  >
                    {action.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save Changes Footer */}
        <div className="mt-8 flex justify-end">
          <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}
