"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { REWARD_EMOJI_GROUPS, isQuickPick, lastGrapheme, toRewardEmoji } from "@/lib/rewards/rewardEmoji";
import { ANY_EMOJI_HINT, ANY_EMOJI_LABEL, REWARD_NOT_EMOJI_REFUSAL, REWARD_NO_PICTURE_LABEL, REWARD_PICTURE_LABEL } from "@/lib/rewardVocabulary";

const TILE = "flex h-12 min-w-12 items-center justify-center rounded-xl transition-colors";
const PICKED = "border-2 border-accent bg-accent-soft";
const NOT_PICKED = "border border-line bg-surface";

/**
 * The reward picture grid: No picture, the quick picks in groups, then "Any
 * emoji", which opens a text box so the device's emoji keyboard can pick any
 * emoji. The picked tile is outlined in the accent. The caller owns the state;
 * `null` is No picture.
 */
export function RewardEmojiPicker({ value, onChange }: { value: string | null; onChange: (next: string | null) => void }) {
  const [anyOpen, setAnyOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);

  const inList = value !== null && isQuickPick(value);

  function handleTyped(text: string) {
    const last = lastGrapheme(text);
    if (last === "") {
      setTyped("");
      setTypedError(null);
      return;
    }
    const emoji = toRewardEmoji(last);
    if (emoji === null) {
      setTyped(last);
      setTypedError(REWARD_NOT_EMOJI_REFUSAL);
      return;
    }
    setTyped("");
    setTypedError(null);
    onChange(emoji);
  }

  return (
    <div role="group" aria-label={REWARD_PICTURE_LABEL} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`${TILE} px-3 text-sm font-medium text-fg ${value === null ? PICKED : NOT_PICKED}`}
        >
          {REWARD_NO_PICTURE_LABEL}
        </button>
      </div>

      {REWARD_EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-muted">{group.label}</span>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const selected = value === item.emoji;
              return (
                <button
                  key={item.emoji}
                  type="button"
                  aria-pressed={selected}
                  aria-label={item.name}
                  onClick={() => onChange(item.emoji)}
                  className={`${TILE} w-12 text-[1.75rem] leading-none ${selected ? PICKED : NOT_PICKED}`}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {value !== null && !inList && (
          <button type="button" aria-pressed="true" aria-label={value} onClick={() => onChange(null)} className={`${TILE} w-12 text-[1.75rem] leading-none ${PICKED}`}>
            {value}
          </button>
        )}
        <button
          type="button"
          aria-pressed={anyOpen}
          onClick={() => setAnyOpen((open) => !open)}
          className={`${TILE} gap-2 px-3 text-sm font-medium text-fg ${anyOpen ? PICKED : NOT_PICKED}`}
        >
          <Smile aria-hidden="true" size={20} className="shrink-0 text-muted" />
          {ANY_EMOJI_LABEL}
        </button>
      </div>

      {anyOpen && (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={typed}
            onChange={(event) => handleTyped(event.target.value)}
            autoFocus
            enterKeyHint="done"
            autoComplete="off"
            aria-label={ANY_EMOJI_LABEL}
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-[1.75rem] text-fg"
          />
          <p className="text-[0.8125rem] text-muted">{ANY_EMOJI_HINT}</p>
          {typedError && (
            <p role="alert" className="text-sm font-medium text-warn">
              {typedError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
