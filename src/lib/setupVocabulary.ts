// The words of first-run setup and the recovery code (family copies PR 6),
// copied from the approved mock. No imports, so any file may take words from
// it without risking a cycle (the same rule as rewardVocabulary.ts).

export const SETUP_WORDS = {
  checking: "Checking your link…",
  badLinkTitle: "This setup link doesn't work",
  badLinkBody: "Ask the person who sent it for a new link.",
  limited: "Too many tries. Wait about 15 minutes, then open your link again.",
  step1Title: "Welcome to Marshee",
  step1Intro: "Let's set up your family's home base. It takes about a minute.",
  familyLabel: "What's your family called?",
  familyPlaceholder: "The Smiths",
  next: "Next",
  backToFamily: "Family name",
  step2Title: "Your login",
  nameLabel: "Your name",
  namePlaceholder: "Jane",
  passwordLabel: "Password",
  passwordAgainLabel: "Password again",
  create: "Create my family",
  creating: "Creating…",
  codeTitle: "Save your recovery code",
  codeIntro:
    "If an admin ever forgets their password, this code lets them set a new one from the sign-in screen.",
  codeWarning: "Write it down or save it in your notes. It won't be shown again.",
  continue: "Continue",
} as const;

/** "You'll be the first admin for The Smiths. You can add everyone else after this." */
export function setupStep2Intro(familyName: string): string {
  return `You'll be the first admin for ${familyName}. You can add everyone else after this.`;
}

export const RECOVERY_WORDS = {
  emptyLogin: "This Marshee isn't set up yet. Open the setup link you were sent to create your family.",
  forgot: "Forgot password?",
  backToPassword: "Password",
  resetTitle: "Set a new password",
  resetIntro: "Enter your family's recovery code. Capitals and dashes don't matter.",
  codeLabel: "Recovery code",
  codePlaceholder: "XXXX-XXXX-XXXX-XXXX",
  newPasswordLabel: "New password",
  newPasswordAgainLabel: "New password again",
  setPassword: "Set password",
  setting: "Setting…",
  newCodeTitle: "Your new recovery code",
  newCodeIntro:
    "Your password is changed. The old code no longer works, so save this one instead.",
  newCodeWarning: "It won't be shown again.",
  continue: "Continue",
  notAdminTitle: "Forgot your password?",
  notAdminBody: "Ask an admin to set a new password for you in Settings, Manage family.",
} as const;

export const REVEAL_WORDS = {
  copy: "Copy code",
  copied: "Copied",
  copyFailed: "Couldn't copy. Your browser blocked clipboard access.",
  saved: "I saved my code",
} as const;

export const CODE_CARD_WORDS = {
  title: "Recovery code",
  saved: "Saved",
  none: "No code yet",
  help: "If an admin forgets their password, this code sets a new one from the sign-in screen.",
  helpReplace: "Making a new code stops the old one working.",
  makeNew: "Make a new code",
  make: "Make a code",
  making: "Making…",
  revealTitle: "Your new recovery code",
  revealIntro: "The old code no longer works.",
  done: "Done",
} as const;
