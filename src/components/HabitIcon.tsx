import { createElement } from "react";
import {
  AlarmClock, Apple, Bed, Bike, BookOpen, Brain, Briefcase, Brush, Car, Church, CigaretteOff,
  Coffee, CookingPot, Droplets, Dumbbell, Flower2, Footprints, GlassWater, GraduationCap,
  HandHeart, Heart, House, Leaf, Moon, Music, PawPrint, PenLine, Phone, Pill, PiggyBank,
  Salad, ShoppingCart, Shirt, Smile, Sparkles, SprayCan, Sun, Target, Timer, Trash2, Utensils,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import type { HabitIcon as HabitIconName, HabitKind } from "@/lib/habitVocabulary";

// The name-to-component map for every name in HABIT_ICONS. vocabulary keeps
// icons as plain strings (so server code can import it); this is where they
// become pictures. A Record over the allow-list means adding a name there
// without drawing it here fails the type check.
const ICONS: Record<HabitIconName, LucideIcon> = {
  Dumbbell, Bike, Footprints, Droplets, Apple, Pill, Bed, Sun, Moon, BookOpen, PenLine, Brain,
  Music, Heart, Smile, Phone, Leaf, Flower2, PawPrint, Brush, SprayCan, Shirt, WashingMachine,
  Trash2, CookingPot, Car, Salad, Coffee, GlassWater, Utensils, CigaretteOff, AlarmClock, Timer,
  Church, HandHeart, Sparkles, PiggyBank, Briefcase, GraduationCap, ShoppingCart,
};

/** A habit's icon: its picked Lucide icon, or the kind's default (a target for habits, a house for chores). */
export function HabitIcon({
  name,
  kind,
  size = 22,
}: {
  name: string | null;
  kind: HabitKind;
  size?: number;
}) {
  const picked = name !== null && Object.hasOwn(ICONS, name) ? ICONS[name as HabitIconName] : null;
  return createElement(picked ?? (kind === "chore" ? House : Target), { "aria-hidden": true, size });
}
