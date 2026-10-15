"use client";
import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Moon,
  Sun,
  Leaf,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ProfileSchema,
  newProfile,
  type Profile,
  type ProductData,
} from "./model";
import { Confirm } from "./forms";
const widgetNames = {
  courses: "Course cards",
  distribution: "Grade distribution",
  upcoming: "Upcoming assignments",
  activity: "Categories & recent changes",
};
export function Appearance({
  profile,
  semester,
  onSave,
  onClose,
}: {
  profile: Profile;
  semester: string;
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(profile),
    [error, setError] = useState("");
  const [start, setStart] = useState(profile.periods[semester]?.start ?? ""),
    [end, setEnd] = useState(profile.periods[semester]?.end ?? "");
  const prefs = draft.preferences,
    settings = draft.state.settings;
  const preference = (part: Partial<Profile["preferences"]>) =>
    setDraft({ ...draft, preferences: { ...prefs, ...part } });
  const setting = (part: Partial<Profile["state"]["settings"]>) =>
    setDraft({
      ...draft,
      state: { ...draft.state, settings: { ...settings, ...part } },
    });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="product-appearance">
        <DialogTitle>Make room for your style.</DialogTitle>
        <DialogDescription>
          Appearance and dashboard settings are saved for this student profile.
          Semester dates apply to {semester}.
        </DialogDescription>
        <div className="product-preset-grid">
          <button
            aria-label="Daylight preset"
            onClick={() =>
              preference({ appearance: "light", accent: "#93536f" })
            }
          >
            <Sun size={20} />
            <strong>Daylight</strong>
            <small>Soft paper, warm plum</small>
          </button>
          <button
            aria-label="Midnight preset"
            onClick={() =>
              preference({ appearance: "dark", accent: "#c693ac" })
            }
          >
            <Moon size={20} />
            <strong>Midnight</strong>
            <small>Ink, with a little warmth</small>
          </button>
          <button
            aria-label="Sage preset"
            onClick={() =>
              preference({ appearance: "light", accent: "#45735c" })
            }
          >
            <Leaf size={20} />
            <strong>Sage</strong>
            <small>A quieter kind of green</small>
          </button>
        </div>
        <div className="form-grid">
          <label>
            Color mode
            <select
              aria-label="Color mode"
              value={prefs.appearance}
              onChange={(e) =>
                preference({
                  appearance: e.target.value as typeof prefs.appearance,
                })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label>
            Accent color
            <div className="product-color-input">
              <input
                aria-label="Choose accent color"
                type="color"
                value={
                  /^#[0-9a-f]{6}$/i.test(prefs.accent)
                    ? prefs.accent
                    : "#93536f"
                }
                onChange={(e) => preference({ accent: e.target.value })}
              />
              <input
                aria-label="Accent hex"
                value={prefs.accent}
                onChange={(e) => preference({ accent: e.target.value })}
              />
            </div>
          </label>
          <label>
            Interface density
            <select
              aria-label="Interface density"
              value={prefs.density}
              onChange={(e) =>
                preference({ density: e.target.value as typeof prefs.density })
              }
            >
              <option value="spacious">Spacious</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            Animation intensity
            <select
              aria-label="Animation intensity"
              value={prefs.motion}
              onChange={(e) =>
                preference({ motion: e.target.value as typeof prefs.motion })
              }
            >
              <option value="full">Full (200 ms)</option>
              <option value="subtle">Subtle (140 ms)</option>
              <option value="none">None</option>
            </select>
          </label>
          <label>
            Navigation style
            <select
              aria-label="Navigation style"
              value={prefs.sidebar}
              onChange={(e) =>
                preference({ sidebar: e.target.value as typeof prefs.sidebar })
              }
            >
              <option value="compact">Icon rail</option>
              <option value="expanded">Expanded labels</option>
            </select>
          </label>
          <label>
            Dashboard layout
            <select
              aria-label="Dashboard layout"
              value={prefs.layout}
              onChange={(e) =>
                preference({ layout: e.target.value as typeof prefs.layout })
              }
            >
              <option value="balanced">Editorial / balanced</option>
              <option value="wide">Wide workspace</option>
            </select>
          </label>
          <label>
            Chart style
            <select
              aria-label="Chart style"
              value={prefs.chart}
              onChange={(e) =>
                preference({ chart: e.target.value as typeof prefs.chart })
              }
            >
              <option value="bars">Bars</option>
              <option value="dots">Dots</option>
            </select>
          </label>
          <label>
            Student display name
            <input
              maxLength={50}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Semester start
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Semester end
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <section className="product-widget-settings">
          <h3>Your dashboard, in your order.</h3>
          <p className="helper">
            Move widgets here or drag their handles on the overview. The course
            spotlight always stays at the top.
          </p>
          {settings.order.map((w, i) => (
            <div key={w}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.widgets.includes(w)}
                  onChange={(e) =>
                    setting({
                      widgets: e.target.checked
                        ? [...settings.widgets, w]
                        : settings.widgets.filter((x) => x !== w),
                    })
                  }
                />
                {widgetNames[w]}
              </label>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  aria-label={`Move ${widgetNames[w]} up`}
                  onClick={() => {
                    const order = [...settings.order];
                    [order[i - 1], order[i]] = [order[i], order[i - 1]];
                    setting({ order });
                  }}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === settings.order.length - 1}
                  aria-label={`Move ${widgetNames[w]} down`}
                  onClick={() => {
                    const order = [...settings.order];
                    [order[i], order[i + 1]] = [order[i + 1], order[i]];
                    setting({ order });
                  }}
                >
                  <ArrowDown size={16} />
                </Button>
              </div>
            </div>
          ))}
        </section>
        <p className="helper">
          Text accents are automatically adjusted for contrast. Device
          reduced-motion preferences are always respected.
        </p>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if ((start && !end) || (!start && end)) {
                setError("Enter both semester dates, or leave both blank.");
                return;
              }
              const periods = { ...draft.periods };
              if (start && end) periods[semester] = { start, end };
              else delete periods[semester];
              const parsed = ProfileSchema.safeParse({
                ...draft,
                periods,
                name: draft.name.trim(),
                state: {
                  ...draft.state,
                  settings: {
                    ...settings,
                    name: draft.name.trim(),
                    motion: prefs.motion,
                    layout: prefs.layout,
                    density:
                      prefs.density === "compact" ? "compact" : "comfortable",
                  },
                },
              });
              if (!parsed.success) {
                setError(parsed.error.issues[0].message);
                return;
              }
              onSave(parsed.data);
              onClose();
            }}
          >
            Save preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function Profiles({
  data,
  onChange,
  onClose,
}: {
  data: ProductData;
  onChange: (d: ProductData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogTitle>Every student. Their own space.</DialogTitle>
          <DialogDescription>
            Profiles have separate grades, scenarios, settings, and planning
            records on this device.
          </DialogDescription>
          <div className="product-profile-list">
            {data.profiles.map((p) => (
              <div key={p.id}>
                <button
                  aria-pressed={data.activeProfileId === p.id}
                  onClick={() => {
                    onChange({ ...data, activeProfileId: p.id });
                    onClose();
                  }}
                >
                  <span className="product-profile-avatar">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.hacLive ? "HAC student" : "Manual / imported"} ·{" "}
                      {p.state.courses.length} courses
                    </small>
                  </span>
                  {data.activeProfileId === p.id && (
                    <span className="pill">Active</span>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={data.profiles.length === 1}
                  aria-label={`Delete profile ${p.name}`}
                  onClick={() => setDeleting(p.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <form
            className="product-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || data.profiles.length >= 25) return;
              const p = newProfile(name.trim());
              onChange({
                ...data,
                profiles: [...data.profiles, p],
                activeProfileId: p.id,
              });
              onClose();
            }}
          >
            <label>
              New student name
              <input
                maxLength={50}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <Button
              type="submit"
              disabled={!name.trim() || data.profiles.length >= 25}
            >
              <Plus size={16} />
              Create profile
            </Button>
          </form>
          <p className="helper">
            Maximum 25 profiles. Use Appearance to rename the active student.
            Export a full backup before deleting a profile.
          </p>
        </DialogContent>
      </Dialog>
      {deleting && (
        <Confirm
          title="Delete this student profile?"
          description="This removes this profile’s grades, settings, scenarios and academic records. Other profiles and the preserved legacy database are not affected. Export a full backup first if needed."
          action="Delete profile"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const profiles = data.profiles.filter((p) => p.id !== deleting);
            onChange({
              ...data,
              profiles,
              activeProfileId:
                data.activeProfileId === deleting
                  ? profiles[0].id
                  : data.activeProfileId,
            });
          }}
        />
      )}
    </>
  );
}
