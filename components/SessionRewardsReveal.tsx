import React, { useState } from 'react';
import { CompanionCardReveal } from './CompanionCardReveal';
import { LootBoxSummary } from './LootBoxSummary';
import type { LootBoxTier } from '@/lib/types';

interface CompanionData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  type: 'character' | 'creature' | 'object';
  description: string;
  imageUrl: string | null;
}

interface LootBoxData {
  id: string;
  tier: LootBoxTier;
  source: 'level_up' | 'bonus_drop' | 'completion';
}

type RevealPhase =
  | { type: 'companions'; index: number }
  | { type: 'lootBoxes' }
  | { type: 'complete' };

interface Props {
  companions: CompanionData[];
  lootBoxes: LootBoxData[];
  onComplete: () => void;
}

export function SessionRewardsReveal({ companions, lootBoxes, onComplete }: Props) {
  const [phase, setPhase] = useState<RevealPhase>(() => {
    if (companions.length > 0) {
      return { type: 'companions', index: 0 };
    } else if (lootBoxes.length > 0) {
      return { type: 'lootBoxes' };
    } else {
      return { type: 'complete' };
    }
  });

  // Handle completion immediately if nothing to reveal
  React.useEffect(() => {
    if (phase.type === 'complete') {
      onComplete();
    }
  }, [phase, onComplete]);

  const handleCompanionComplete = () => {
    if (phase.type !== 'companions') return;

    const nextIndex = phase.index + 1;
    if (nextIndex < companions.length) {
      setPhase({ type: 'companions', index: nextIndex });
    } else if (lootBoxes.length > 0) {
      setPhase({ type: 'lootBoxes' });
    } else {
      setPhase({ type: 'complete' });
    }
  };

  const handleLootBoxContinue = () => {
    setPhase({ type: 'complete' });
  };

  if (phase.type === 'companions') {
    const companion = companions[phase.index];
    const isLast = phase.index === companions.length - 1 && lootBoxes.length === 0;
    return (
      <CompanionCardReveal
        companion={companion}
        onComplete={handleCompanionComplete}
        isLast={isLast}
      />
    );
  }

  if (phase.type === 'lootBoxes') {
    return <LootBoxSummary boxes={lootBoxes} onContinue={handleLootBoxContinue} />;
  }

  // Complete phase - render nothing, effect will call onComplete
  return null;
}
