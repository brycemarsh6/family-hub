// The words of the welcome steps, the install help, the "Finish setting up"
// card and the Settings row (family copies PR 7), copied from the approved
// mock. No imports, so any file may take words from it without risking a cycle
// (the same rule as setupVocabulary.ts).

export const WELCOME_WORDS = {
  step1Count: "Step 1 of 2",
  step2Count: "Step 2 of 2",
  step1Title: "Who's in your family?",
  step1Intro:
    "Add the other adults and the kids. Adults can have their own login. Kids can have a login or just a profile.",
  addPerson: "Add a person",
  laterNote: "You can add people later in Settings, Manage family.",
  next: "Next",
  backToFamily: "Your family",
  goToDashboard: "Go to my dashboard",
  roleAdmin: "Admin",
  roleParent: "Parent",
  roleKid: "Kid",
  roleKidProfile: "Kid, profile",
} as const;

export const INSTALL_WORDS = {
  title: "Put Marshee on your phone",
  intro: "Add it to your Home Screen and it opens like an app, full screen.",
  iphone: "iPhone",
  ipad: "iPad",
  chromeNoteIphone: "Using Chrome? Tap Share at the top right instead, then Add to Home Screen.",
  chromeNoteIpad: "Using Chrome? Tap Share at the top right, then Add to Home Screen.",
  everyone: "Everyone else in the family does this on their own phone.",
} as const;

/** The three Safari steps. `bold` is the part to show in bold; `before` and
 * `after` are the plain text around it. A step with an icon names which one. */
export type InstallStepPart = { text: string; bold?: boolean; icon?: "share" | "add" };

export const INSTALL_STEPS: Record<"iphone" | "ipad", readonly (readonly InstallStepPart[])[]> = {
  iphone: [
    [
      { text: "In Safari, tap Share " },
      { text: "", icon: "share" },
      { text: " at the bottom of the screen." },
    ],
    [
      { text: "Scroll down and tap " },
      { text: "Add to Home Screen", bold: true },
      { text: " " },
      { text: "", icon: "add" },
      { text: "." },
    ],
    [{ text: "Tap " }, { text: "Add", bold: true }, { text: ". Marshee is now on your Home Screen." }],
  ],
  ipad: [
    [
      { text: "In Safari, tap Share " },
      { text: "", icon: "share" },
      { text: " at the top right, next to the address." },
    ],
    [
      { text: "Tap " },
      { text: "Add to Home Screen", bold: true },
      { text: " " },
      { text: "", icon: "add" },
      { text: "." },
    ],
    [{ text: "Tap " }, { text: "Add", bold: true }, { text: ". Marshee is now on your Home Screen." }],
  ],
};

export const CHECKLIST_WORDS = {
  title: "Finish setting up",
  optional: "Optional",
  hide: "Hide this",
  allSetTitle: "You're all set",
  allSetBody: "Marshee is ready for your family. The optional steps are still in Settings any time.",
  done: "Done",
  addFamily: "Add your family",
  pickStores: "Pick your stores",
  addPantry: "Add pantry items",
  wallTablet: "Set up a wall tablet",
  linkGoogle: "Link Google Calendar",
} as const;

/** "2 of 5" */
export function checklistCount(done: number, total: number): string {
  return `${done} of ${total}`;
}

export const INSTALL_ROW_WORDS = {
  label: "Install on your phone",
} as const;
