import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitManager } from "@/components/HabitManager";
import { ReportPersonChips } from "@/components/ReportPersonChips";
import { firstNameOf } from "@/lib/choreChart";
import { requireVerifiedUser } from "@/lib/dal";
import { canReorderListOf } from "@/lib/habits/access";
import { loadHabitRoster, loadManageLists } from "@/lib/habitsRead";
import { manageHref, managePersonChips, personParam, resolveManagePerson } from "@/lib/habitsManage";
import { MANAGE_LABELS } from "@/lib/habitVocabulary";
import { loadHouseholdPersonRole } from "@/lib/householdPeople";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function ManageHabitsPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const { person } = await searchParams;
  const viewer = { userId: user.userId, role: user.role };
  const people = await loadHabitRoster();
  // Whose list: the one asked for when this login may open it, else your own (mission 86).
  const subjectId = resolveManagePerson(viewer, person, people);
  const own = subjectId === user.userId;
  const [{ manage, archived }, subjectRole] = await Promise.all([
    loadManageLists(viewer, subjectId),
    own ? Promise.resolve(user.role) : loadHouseholdPersonRole(subjectId),
  ]);
  const canReorder = subjectRole !== null && canReorderListOf(viewer, subjectId, subjectRole);
  const chips = managePersonChips(viewer, people, subjectId);
  const subject = people.find((entry) => entry.id === subjectId);

  return (
    // Wide page: lifts the 768px cap on a landscape iPad (STRUCTURE.md "Wide pages", mission-53).
    <div data-page-width="wide" className="py-2">
      <BackLink href="/habits" label="Habits & Chores" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage</h1>
      <p className="mt-1 mb-3 text-sm text-muted">{canReorder ? MANAGE_LABELS.subtitleReorder : MANAGE_LABELS.subtitleTap}</p>
      {chips && (
        <ReportPersonChips
          ariaLabel={MANAGE_LABELS.personAria}
          chips={chips.map((chip) => ({ id: chip.id, name: chip.name, selected: chip.selected, href: manageHref(personParam(chip.id, user.userId)) }))}
        />
      )}
      <HabitManager
        // A new person is a new list: the optimistic state starts over.
        key={subjectId}
        active={manage}
        archived={archived}
        personParam={personParam(subjectId, user.userId)}
        canReorder={canReorder}
        subjectName={subject ? firstNameOf(subject.displayName) : ""}
        own={own}
      />
    </div>
  );
}
