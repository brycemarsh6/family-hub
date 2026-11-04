"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { VisionCard } from "./VisionCard";
import { VisionSheet } from "./VisionSheet";
import { VISION_HORIZONS, type LifeArea, type VisionHorizon } from "@/lib/goalVocabulary";
import { promptAt } from "@/lib/goalPrompts";
import { boardHeading } from "@/lib/visions";
import type { VisionBoardData } from "@/lib/visionsRead";
import { saveVision } from "@/app/actions/visions";

const CHIP = "flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors";
const CHIP_ON = "border-accent bg-accent text-accent-fg";
const CHIP_OFF = "border-line bg-surface text-muted";

type Change = { area: LifeArea; text: string };

function applyChange(cards: VisionBoardData["cards"], change: Change): VisionBoardData["cards"] {
  return cards.map((card) =>
    card.area === change.area ? { ...card, text: change.text === "" ? null : change.text } : card,
  );
}

/**
 * Plans & Goals' Vision tab: which board and horizon (links, so each is a real
 * URL), the board's five cards, and the edit sheet. Which prompt an empty card
 * shows is `promptSeed` (made on the server, so server and client agree) plus
 * the card's place plus the taps on "Another prompt".
 */
export function VisionBoard({
  data,
  viewerId,
  horizon,
  todayYear,
  promptSeed,
}: {
  data: VisionBoardData;
  viewerId: string;
  horizon: VisionHorizon;
  todayYear: number;
  promptSeed: number;
}) {
  const [cards, applyOptimistic] = useOptimistic(data.cards, applyChange);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Partial<Record<LifeArea, number>>>({});
  const [open, setOpen] = useState<LifeArea | null>(null);

  const together = data.board === "together";
  const boardParam = (key: string) => (key === viewerId ? "mine" : key);
  const href = (board: string, years: number) => `/plans?view=vision&board=${board}&years=${years}`;

  function promptFor(area: LifeArea, index: number) {
    return promptAt(area, promptSeed + index + (steps[area] ?? 0));
  }

  function anotherPrompt(area: LifeArea) {
    setSteps((current) => ({ ...current, [area]: (current[area] ?? 0) + 1 }));
  }

  function save(area: LifeArea, text: string) {
    const trimmed = text.trim();
    setError(null);
    setOpen(null);
    startTransition(async () => {
      applyOptimistic({ area, text: trimmed });
      try {
        const result = await saveVision({ board: together ? "together" : "mine", area, horizon, text: trimmed });
        if (result.error) setError(result.error);
      } catch {
        // The call never reached the server (network down): say so here instead of the error page.
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  const openIndex = open === null ? -1 : cards.findIndex((card) => card.area === open);
  const openCard = openIndex >= 0 ? cards[openIndex] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {data.boards.map((board) => {
          const current = board.key === data.board;
          return (
            <Link
              key={board.key}
              href={href(boardParam(board.key), horizon)}
              aria-current={current ? "page" : undefined}
              className={`${CHIP} ${current ? CHIP_ON : CHIP_OFF}`}
            >
              {board.label}
            </Link>
          );
        })}
        {VISION_HORIZONS.map((years) => {
          const current = years === horizon;
          return (
            <Link
              key={years}
              href={href(boardParam(data.board), years)}
              aria-current={current ? "page" : undefined}
              className={`${CHIP} ${current ? CHIP_ON : CHIP_OFF}`}
            >
              {years} yr
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 font-accent text-xl italic">{boardHeading(data.ownerName, todayYear, horizon)}</h2>

      {error && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, index) => (
          <VisionCard
            key={card.area}
            area={card.area}
            text={card.text}
            goalCount={card.goalCount}
            prompt={promptFor(card.area, index)}
            canEdit={data.canEdit}
            wide={index === cards.length - 1 && cards.length % 2 === 1}
            onOpen={() => setOpen(card.area)}
            onAnotherPrompt={() => anotherPrompt(card.area)}
          />
        ))}
      </div>

      {data.canEdit && <p className="mt-3 text-center text-sm text-muted">Tap a card to edit it</p>}

      {openCard && (
        <VisionSheet
          key={openCard.area}
          area={openCard.area}
          horizon={horizon}
          together={together}
          initialText={openCard.text ?? ""}
          prompt={promptFor(openCard.area, openIndex)}
          pending={pending}
          onAnotherPrompt={() => anotherPrompt(openCard.area)}
          onSave={(text) => save(openCard.area, text)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
