"use client";

import { useActionState } from "react";
import type { RecipeFormState } from "@/app/actions/recipes";

const EMPTY: RecipeFormState = {};

export type RecipeFormDefaults = {
  id?: string;
  title: string;
  ingredients: string;
  steps: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  sourceUrl: string;
  notes: string;
};

const BLANK: RecipeFormDefaults = {
  title: "",
  ingredients: "",
  steps: "",
  servings: "",
  prepTime: "",
  cookTime: "",
  sourceUrl: "",
  notes: "",
};

/**
 * The one form used by both New and Edit — every import path (typed, pasted,
 * photo, link) lands here too, pre-filled, per the Recipes plan in CLAUDE.md.
 * Real keyboard typing throughout, not steppers: recipes are laptop/phone
 * entry, not the wet-hands-on-the-wall-tablet case the QuantityStepper rule
 * is about.
 */
export function RecipeForm({
  action,
  defaultValues = BLANK,
  submitLabel,
}: {
  action: (
    state: RecipeFormState,
    formData: FormData,
  ) => Promise<RecipeFormState>;
  defaultValues?: RecipeFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaultValues.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <Field label="Title">
        <input
          name="title"
          type="text"
          defaultValue={defaultValues.title}
          autoComplete="off"
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </Field>

      <Field label="Ingredients" hint="One per line">
        <textarea
          name="ingredients"
          defaultValue={defaultValues.ingredients}
          rows={8}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none"
        />
      </Field>

      <Field label="Steps" hint="One per line">
        <textarea
          name="steps"
          defaultValue={defaultValues.steps}
          rows={8}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none"
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Servings" className="min-w-0 flex-1">
          <input
            name="servings"
            type="text"
            defaultValue={defaultValues.servings}
            placeholder="6-8"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
          />
        </Field>
        <Field label="Prep time" className="min-w-0 flex-1">
          <input
            name="prepTime"
            type="text"
            defaultValue={defaultValues.prepTime}
            placeholder="15 min"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
          />
        </Field>
        <Field label="Cook time" className="min-w-0 flex-1">
          <input
            name="cookTime"
            type="text"
            defaultValue={defaultValues.cookTime}
            placeholder="45 min"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
          />
        </Field>
      </div>

      <Field label="Source link" hint="Optional">
        <input
          name="sourceUrl"
          type="url"
          defaultValue={defaultValues.sourceUrl}
          placeholder="https://…"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
        />
      </Field>

      <Field label="Notes" hint="Optional">
        <textarea
          name="notes"
          defaultValue={defaultValues.notes}
          rows={3}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none"
        />
      </Field>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm text-muted ${className ?? ""}`}>
      <span className="mb-1 flex items-baseline justify-between">
        <span>{label}</span>
        {hint && <span className="text-xs">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
