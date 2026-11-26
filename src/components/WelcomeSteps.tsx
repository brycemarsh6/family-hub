"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { CreatePersonSheet } from "@/components/CreatePersonSheet";
import { InstallHelp } from "@/components/InstallHelp";
import { MarsheeIcon } from "@/components/MarsheeIcon";
import { ROLE_LABELS } from "@/lib/constants";
import type { PersonInfo } from "@/lib/personInfo";
import { INSTALL_WORDS, WELCOME_WORDS } from "@/lib/welcomeVocabulary";

const PRIMARY =
  "flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80";

function Dots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden="true">
      {[1, 2].map((n) => (
        <span key={n} className={`h-2 w-2 rounded-full ${n === step ? "bg-accent" : "bg-line"}`} />
      ))}
    </div>
  );
}

function roleWords(person: PersonInfo): string {
  const label = ROLE_LABELS[person.role];
  return person.role === "kid" && !person.hasAccount ? `${label}, ${WELCOME_WORDS.profileSuffix}` : label;
}

/**
 * The two welcome steps a new family's admin sees after setup. Step 1 lists
 * the household and adds people through the same sheet as Manage family
 * (add only; renaming and removing stay there). Step 2 is the install help.
 * Local state mirrors each add, so the list grows instantly.
 */
export function WelcomeSteps({ initialPeople }: { initialPeople: PersonInfo[] }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [people, setPeople] = useState(initialPeople);
  const [addOpen, setAddOpen] = useState(false);

  if (step === 2) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="-ml-1 flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted transition-colors active:text-fg"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          {WELCOME_WORDS.backToFamily}
        </button>
        <Dots step={2} />
        <p className="mt-1 text-center text-sm text-muted">{WELCOME_WORDS.step2Count}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{INSTALL_WORDS.title}</h1>
        <InstallHelp />
        <Link href="/" className={`${PRIMARY} mt-5`}>
          {WELCOME_WORDS.goToDashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <MarsheeIcon className="mx-auto mb-2 h-14 w-14" />
      <Dots step={1} />
      <p className="mt-1 text-center text-sm text-muted">{WELCOME_WORDS.step1Count}</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{WELCOME_WORDS.step1Title}</h1>
      <p className="mt-1 text-base text-muted">{WELCOME_WORDS.step1Intro}</p>

      <ul className="mt-3 flex flex-col gap-2">
        {people.map((person) => (
          <li
            key={person.id}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4"
          >
            <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={40} />
            <span className="min-w-0 flex-1 truncate text-base font-semibold">{person.displayName}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                person.role === "kid" && !person.hasAccount ? "bg-surface-2 text-muted" : "bg-accent-soft"
              }`}
            >
              {roleWords(person)}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
      >
        <Plus aria-hidden="true" size={20} />
        {WELCOME_WORDS.addPerson}
      </button>
      <p className="mt-3 text-sm text-muted">{WELCOME_WORDS.laterNote}</p>
      <button type="button" onClick={() => setStep(2)} className={`${PRIMARY} mt-4`}>
        {WELCOME_WORDS.next}
      </button>

      {addOpen && (
        <CreatePersonSheet
          onCreated={(person) => {
            setPeople((prev) => [...prev, person]);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
