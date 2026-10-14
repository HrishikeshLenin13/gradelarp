"use client";
import { useState } from "react";
import {
  Moon,
  Sun,
  Check,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  SettingsSchema,
  widgets,
  type Settings,
  type Widget,
} from "@/lib/model";
const names: Record<Widget, string> = {
  courses: "Your courses",
  distribution: "Grade distribution",
  upcoming: "Coming up",
  activity: "Recent assignments",
};
export function SettingsDialog({
  initial,
  onChange,
  onClose,
}: {
  initial: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState("");
  const patch = (part: Partial<Settings>) =>
    setSettings({ ...settings, ...part });
  function move(index: number, delta: number) {
    const order = [...settings.order];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    patch({ order });
  }
  function save() {
    const parsed = SettingsSchema.safeParse(settings);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onChange(parsed.data);
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <div className="dialog-heading">
          <SlidersHorizontal className="accent-text" size={25} />
          <div>
            <DialogTitle>A space that feels like you.</DialogTitle>
            <DialogDescription>
              Personalize your dashboard. Everything stays on this device.
            </DialogDescription>
          </div>
        </div>
        <div className="settings-content">
          <div className="setting-section">
            <h4>Appearance</h4>
            <div className="theme-options">
              {(["dark", "light"] as const).map((theme) => (
                <button
                  key={theme}
                  className={`theme-preview ${theme} ${settings.theme === theme ? "selected" : ""}`}
                  onClick={() => patch({ theme })}
                  aria-pressed={settings.theme === theme}
                >
                  <div className="mini-window">
                    <i />
                    <div>
                      <b />
                      <b />
                      <b />
                    </div>
                  </div>
                  <span>
                    {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}{" "}
                    {theme === "dark" ? "Obsidian" : "Daylight"}
                    {settings.theme === theme && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            <label className="tiny-label">ACCENT COLOR</label>
            <div className="accent-options">
              {(["lavender", "mint", "blue", "rose"] as const).map((accent) => (
                <button
                  key={accent}
                  aria-label={`${accent} accent`}
                  aria-pressed={settings.accent === accent}
                  style={{
                    background: {
                      lavender: "#b1a1f7",
                      mint: "#80c8b0",
                      blue: "#8bb8ed",
                      rose: "#e6a1bc",
                    }[accent],
                  }}
                  onClick={() => patch({ accent })}
                >
                  {settings.accent === accent && <Check size={18} />}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                Density
                <select
                  aria-label="Density"
                  value={settings.density}
                  onChange={(e) =>
                    patch({ density: e.target.value as Settings["density"] })
                  }
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label>
                Layout
                <select
                  value={settings.layout}
                  onChange={(e) =>
                    patch({ layout: e.target.value as Settings["layout"] })
                  }
                >
                  <option value="balanced">Balanced columns</option>
                  <option value="wide">Full-width widgets</option>
                </select>
              </label>
              <label className="span-2">
                Animation intensity
                <select
                  aria-label="Animation intensity"
                  value={settings.motion}
                  onChange={(e) =>
                    patch({ motion: e.target.value as Settings["motion"] })
                  }
                >
                  <option value="full">Expressive</option>
                  <option value="subtle">Subtle</option>
                  <option value="none">Off</option>
                </select>
              </label>
            </div>
          </div>
          <div className="setting-section">
            <h4>
              Dashboard widgets{" "}
              <small>Drag on the dashboard, or reorder here.</small>
            </h4>
            {settings.order.map((widget, i) => (
              <div className="widget-setting" key={widget}>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.widgets.includes(widget)}
                    onChange={(e) =>
                      patch({
                        widgets: e.target.checked
                          ? [...settings.widgets, widget]
                          : settings.widgets.filter((w) => w !== widget),
                      })
                    }
                  />
                  {names[widget]}
                </label>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${names[widget]} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${names[widget]} down`}
                    disabled={i === widgets.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="setting-section">
            <h4>A little about you</h4>
            <div className="form-grid">
              <label className="span-2">
                Your first name
                <input
                  value={settings.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label>
                Semester starts
                <input
                  type="date"
                  value={settings.semesterStart}
                  onChange={(e) => patch({ semesterStart: e.target.value })}
                />
              </label>
              <label>
                Semester ends
                <input
                  type="date"
                  value={settings.semesterEnd}
                  onChange={(e) => patch({ semesterEnd: e.target.value })}
                />
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <span className="helper">Your preferences, remembered.</span>
          <Button onClick={save}>
            Save preferences
            <Check size={15} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
