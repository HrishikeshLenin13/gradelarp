"use client";
import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "email" | "textarea" | "select";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  wide?: boolean;
}
export function EntityEditor<T extends object>({
  title,
  description,
  initial,
  schema,
  fields,
  onSave,
  onClose,
}: {
  title: string;
  description: string;
  initial: T;
  schema: z.ZodType<T>;
  fields: Field[];
  onSave: (value: T) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({
      ...initial,
    } as Record<string, unknown>),
    [error, setError] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const result = schema.safeParse(values);
            if (!result.success) {
              setError(result.error.issues[0].message);
              return;
            }
            onSave(result.data);
          }}
        >
          <div className="form-grid product-form">
            {fields.map((f) => (
              <label key={f.key} className={f.wide ? "span-2" : ""}>
                {f.label}
                {f.type === "select" ? (
                  <select
                    aria-label={f.label}
                    required={f.required}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]:
                          typeof values[f.key] === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    aria-label={f.label}
                    maxLength={2000}
                    rows={3}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    aria-label={f.label}
                    required={f.required}
                    type={f.type ?? "text"}
                    min={f.min}
                    max={f.max}
                    step={f.step ?? "any"}
                    maxLength={f.type === "text" || !f.type ? 160 : undefined}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]:
                          f.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save {title.toLowerCase().replace(/^(add|edit) /, "")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Confirm({
  title,
  description,
  action = "Delete",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  action?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent role="alertdialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="dialog-footer">
          <Button variant="outline" autoFocus onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {action}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
