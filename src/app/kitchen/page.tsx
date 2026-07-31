import { redirect } from "next/navigation";

// The Kitchen branch has no landing page of its own — "/kitchen" just drops
// you at Inventory, the branch's front door.
//
// It used to be a page with two cards, Shopping and Inventory. That page
// earned its keep when Kitchen was the whole app, but it doesn't anymore:
// the numbers on it (to buy, stocked, running low) are the same ones the
// dashboard's Kitchen widget already showed you a tap earlier, and its two
// links duplicate tabs sitting in the bar at the bottom of the very same
// screen. So it made you read the same counts twice on the way to the page
// you actually wanted.
//
// Worth revisiting once Expiring and Cooking are real: a Kitchen overview
// showing what's expiring this week and what's for dinner would be genuinely
// new information, rather than the dashboard's summary a second time.
//
// `redirect` in a Server Component replaces the history entry rather than
// pushing one, so going Back from Inventory lands on the dashboard instead of
// bouncing through here again.
export default function KitchenPage() {
  redirect("/kitchen/inventory");
}
