"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { VisionCard } from "./VisionCard";
import { VisionSheet } from "./VisionSheet";
import { TOGETHER_BOARD, VISION_HORIZONS, type LifeArea, type VisionHorizon } from "@/lib/goalVocabulary";
import { promptAt } from "@/lib/goalPrompts";
import { boardHeading, boardHint } from "@/lib/visions";
import type { VisionBoardData } from "@/lib/visionsRead";
import { saveVision } from "@/app/actions/visions";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

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
 * URL), the board's cards, and the edit sheet. Which prompt an empty card
 * shows is `promptSeed` (made on the server, so server and client agree) plus
 * the card's place plus the taps on "Another prompt".
 */
export function VisionBoard({
  data,
  horizon,
  todayYear,
  promptSeed: initialSeed,
}: {
  data: VisionBoardData;
  horizon: VisionHorizon;
  todayYear: number;
  promptSeed: number;
}) {
  // Locked once: the server makes a new seed on every re-render (after a save), which would restart the order.
  const [promptSeed] = useState(initialSeed);
  const [cards, applyOptimistic] = useOptimistic(data.cards, applyChange);
  const { run, error, setError, pending } = useOptimisticRun(applyOptimistic);
  const [steps, setSteps] = useState<Partial<Record<LifeArea, number>>>({});
  const [open, setOpen] = useState<LifeArea | null>(null);

  const hint = boardHint(data.canEdit, data.ownerName);
  const together = data.saveAs === "together";
  const currentParam = data.boards.find((board) => board.key === data.board)?.param ?? TOGETHER_BOARD;
  const href = (board: string, years: number) => `/plans?view=vision&board=${board}&years=${years}`;

  function promptFor(area: LifeArea, index: number) {
    return promptAt(area, horizon, promptSeed + index + (steps[area] ?? 0));
  }

  function anotherPrompt(area: LifeArea) {
    setSteps((current) => ({ ...current, [area]: (current[area] ?? 0) + 1 }));
  }

  // Clearing waits for the server (the sheet stays open and says "Clearing…"); a save shows at once,
  // but the sheet stays open until it lands, so a failed save keeps the draft and shows the error there.
  // A save in flight can't be abandoned (close waits), and a landed save closes only its own sheet.
  function save(area: LifeArea, text: string) {
    const trimmed = text.trim();
    if (data.saveAs === null) return;
    const board = data.saveAs;
    run(
      trimmed !== "" ? { area, text: trimmed } : null,
      () => saveVision({ board, area, horizon, text: trimmed }),
      () => setOpen((current) => (current === area ? null : current)),
    );
  }

  function close() {
    if (pending) return;
    setOpen(null);
    setError(null);
  }

  const openIndex = open === null ? -1 : cards.findIndex((card) => card.area === open);
  const openCard = openIndex >= 0 ? cards[openIndex] : null;

  return (
    <div>
      <div role="group" aria-label="Whose board" className="mb-4 flex flex-wrap gap-2">
        {data.boards.map((board) => {
          const current = board.key === data.board;
          return (
            <Link
              key={board.key}
              href={href(board.param, horizon)}
              aria-current={current ? "page" : undefined}
              className={`${CHIP} ${current ? CHIP_ON : CHIP_OFF}`}
            >
              {board.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        {/* The span carries the font: globals.css sets h2's face outside Tailwind's layers, so a class on the h2 loses. */}
        <h2 className="text-2xl font-medium">
          <span className="font-accent italic">{boardHeading(data.ownerName, todayYear, horizon)}</span>
        </h2>
        <div role="group" aria-label="How far ahead" className="flex shrink-0 rounded-xl bg-surface-2 p-1">
          {VISION_HORIZONS.map((years) => {
            const current = years === horizon;
            return (
              <Link
                key={years}
                href={href(currentParam, years)}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-semibold ${
                  current ? "bg-surface text-fg" : "text-muted-strong"
                }`}
              >
                {years} yr
              </Link>
            );
          })}
        </div>
      </div>

      {error && !openCard && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      <div className="@container">
      <div className="grid grid-cols-2 gap-3 @min-[64rem]:grid-cols-3">
        {cards.map((card, index) => (
          <VisionCard
            key={card.area}
            area={card.area}
            text={card.text}
            goalCount={card.goalCount}
            prompt={promptFor(card.area, index)}
            ownerName={data.ownerName}
            canEdit={data.canEdit}
            wide={index === cards.length - 1 && cards.length % 2 === 1}
            onOpen={() => {
              setError(null);
              setOpen(card.area);
            }}
            onAnotherPrompt={() => anotherPrompt(card.area)}
          />
        ))}
      </div>
      </div>

      {hint && <p className="mt-3 text-center text-sm text-muted">{hint}</p>}

      {openCard && (
        <VisionSheet
          key={openCard.area}
          area={openCard.area}
          horizon={horizon}
          together={together}
          initialText={openCard.text ?? ""}
          prompt={promptFor(openCard.area, openIndex)}
          pending={pending}
          error={error}
          onAnotherPrompt={() => anotherPrompt(openCard.area)}
          onSave={(text) => save(openCard.area, text)}
          onClose={close}
        />
      )}
    </div>
  );
}
