"use client";
import { useRef, useState } from "react";
import { Upload, Download, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { csvHeaders, parseCsv, exportCsv, download } from "@/lib/import-export";
import type { Course } from "@/lib/model";
import { uid } from "@/lib/utils";
import {
  newProfile,
  parseProductBackup,
  type Profile,
  type ProductData,
} from "./model";
import { productProvider } from "./storage";
import { Confirm } from "./forms";
export function DataTools({
  data,
  profile,
  onChange,
  onConnection,
  onProfiles,
  onDemo,
  notify,
}: {
  data: ProductData;
  profile: Profile;
  onChange: (d: ProductData) => void;
  onConnection: () => void;
  onProfiles: () => void;
  onDemo: () => void;
  notify: (s: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{
      name: string;
      profiles?: Profile[];
      courses?: Course[];
    } | null>(null),
    [error, setError] = useState(""),
    [destination, setDestination] = useState("new"),
    [clear, setClear] = useState(false);
  async function load(file: File) {
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose a file smaller than 10 MB.");
      const text = await file.text();
      if (
        file.name.toLowerCase().endsWith(".json") ||
        text.trimStart().startsWith("{")
      ) {
        const backup = parseProductBackup(text);
        setPending({ name: file.name, profiles: backup.profiles });
      } else {
        const courses = parseCsv(text);
        if (!courses.length) throw new Error("No assignments found in CSV.");
        setPending({ name: file.name, courses });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import could not be read.");
    }
  }
  function confirmImport() {
    if (!pending) return;
    let next = data;
    if (pending.profiles) {
      const profiles = pending.profiles.map((p) => ({ ...p, id: uid() }));
      next = {
        ...data,
        profiles: [...data.profiles, ...profiles],
        activeProfileId: profiles[0].id,
      };
    } else if (pending.courses) {
      if (destination === "append") {
        next = {
          ...data,
          profiles: data.profiles.map((p) =>
            p.id === profile.id
              ? {
                  ...p,
                  state: {
                    ...p.state,
                    demo: false,
                    courses: [...p.state.courses, ...pending.courses!],
                  },
                }
              : p,
          ),
        };
      } else {
        const p = newProfile(
          profile.name === "Student"
            ? "Imported student"
            : `${profile.name} import`.slice(0, 50),
        );
        p.state.courses = pending.courses;
        next = {
          ...data,
          profiles: [...data.profiles, p],
          activeProfileId: p.id,
        };
      }
    }
    if (next.profiles.length > 25) {
      setError(
        "This import would exceed 25 profiles. Remove unused profiles after backing them up.",
      );
      setPending(null);
      return;
    }
    onChange(next);
    setPending(null);
    notify("Import complete. Existing profiles were preserved.");
  }
  return (
    <div className="product-stack">
      <div className="inline-notice">
        <ShieldCheck size={18} />
        <span>
          Your grades stay in this browser. No cloud uploads, school passwords,
          or live HAC sync.
        </span>
        <span className="pill">Local-first</span>
      </div>
      <div className="two-column">
        <section className="panel product-data-card">
          <Upload size={26} />
          <h2>Bring your grades along.</h2>
          <p>
            Import assignment CSVs or restore a complete JSON backup. Restores
            create new profiles and keep your existing data.
          </p>
          <input
            ref={input}
            style={{ display: "none" }}
            type="file"
            aria-label="Import CSV or backup"
            accept=".csv,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => input.current?.click()}>Choose a file</Button>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                "gradelarp-template.csv",
                csvHeaders.join(",") +
                  "\nBiology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Major grades,60,Unit 1 test,92,100,graded,2026-10-12\nBiology,Ms. Smith,Regular,Fall 2026,0.5,weighted,Daily work,40,Lab notebook,45,50,graded,2026-10-13\n",
                "text/csv",
              )
            }
          >
            Download CSV template
          </Button>
        </section>
        <section className="panel product-data-card">
          <Download size={26} />
          <h2>Always yours to keep.</h2>
          <p>
            A full backup includes every student profile, grade, scenario,
            setting, and academic record. CSV contains assignments only.
          </p>
          <div className="flex">
            <Button
              onClick={() =>
                download(
                  "gradelarp-full-backup.json",
                  JSON.stringify(data, null, 2),
                )
              }
            >
              Full backup
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "gradelarp-grades.csv",
                  exportCsv(profile.state.courses),
                  "text/csv",
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                "gradelarp-profile.json",
                JSON.stringify(
                  { ...data, profiles: [profile], activeProfileId: profile.id },
                  null,
                  2,
                ),
              )
            }
          >
            Export current profile
          </Button>
        </section>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <div className="panel-title">
          <h3>Your local workspace</h3>
          <Button variant="outline" onClick={onProfiles}>
            Manage profiles
          </Button>
        </div>
        <div className="data-summary">
          <div>
            <span>Student profiles</span>
            <strong>{data.profiles.length}</strong>
          </div>
          <div>
            <span>Current courses</span>
            <strong>{profile.state.courses.length}</strong>
          </div>
          <div>
            <span>Saved scenarios</span>
            <strong>{profile.scenarios.length}</strong>
          </div>
          <div>
            <span>Data source</span>
            <strong>{profile.state.demo ? "Demo" : "Manual / imported"}</strong>
          </div>
        </div>
        <p className="helper">
          Browser cleanup, private browsing, or a different localhost port can
          make your data unavailable. Keep a downloaded backup. School-synced
          and manual records remain distinct.
        </p>
        <div className="flex">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const original = await productProvider.preservedLegacy();
                if (!original) {
                  notify("No pre-upgrade gradebook was found on this browser.");
                  return;
                }
                download(
                  "gradelarp-original-gradebook.json",
                  JSON.stringify(original, null, 2),
                );
              } catch {
                notify(
                  "Original backup could not be read. Your current workspace is unchanged.",
                );
              }
            }}
          >
            Export preserved original
          </Button>
        </div>
      </section>
      <section className="panel">
        <h3>School connection</h3>
        <Button variant="outline" onClick={onConnection}>
          Open school connection
        </Button>
        <p className="helper">
          Sign in directly to your district’s HAC portal and sync
          school-reported grades. Your password is not saved.
        </p>
      </section>
      <section className="panel danger-zone">
        <div>
          <h3>Start this profile fresh.</h3>
          <p>
            Other student profiles and the preserved original gradebook remain
            untouched.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setClear(true)}>
          Clear current profile
        </Button>
      </section>
      {pending && (
        <Dialog open onOpenChange={(open) => !open && setPending(null)}>
          <DialogContent>
            <DialogTitle>Review your import</DialogTitle>
            <DialogDescription>
              {pending.name} ·{" "}
              {pending.profiles
                ? `${pending.profiles.length} profiles to restore as new profiles`
                : `${pending.courses?.length} courses`}
            </DialogDescription>
            <div className="product-import-preview">
              {pending.profiles?.map((p) => (
                <p key={p.id}>
                  <strong>{p.name}</strong> · {p.state.courses.length} courses ·{" "}
                  {p.scenarios.length} scenarios
                </p>
              ))}
              {pending.courses?.map((c) => (
                <p key={c.id}>
                  {c.name} · {c.assignments.length} assignments
                </p>
              ))}
            </div>
            {pending.courses && (
              <label>
                Import destination
                <select
                  aria-label="Import destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="new">
                    New separate profile (preserves current)
                  </option>
                  <option value="append" disabled={profile.state.demo}>
                    Append courses to current profile
                  </option>
                </select>
              </label>
            )}
            <p className="helper">
              Existing profiles and courses will not be replaced. Imported
              backups retain all their academic data and settings.
            </p>
            <div className="dialog-footer">
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button onClick={confirmImport}>Confirm import</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {clear && (
        <Confirm
          title="Clear this profile?"
          description="All grades, scenarios, settings, and academic records for this student will be reset. Download a full backup first. Other profiles and the preserved legacy database are kept."
          action="Yes, clear this profile"
          onClose={() => setClear(false)}
          onConfirm={() => {
            const empty = { ...newProfile(profile.name), id: profile.id };
            onChange({
              ...data,
              profiles: data.profiles.map((p) =>
                p.id === profile.id ? empty : p,
              ),
            });
            notify("This profile was reset. Other profiles were preserved.");
          }}
        />
      )}
    </div>
  );
}
