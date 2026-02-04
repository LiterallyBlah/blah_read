import React, { useState } from 'react';
import { CompanionCardReveal } from './CompanionCardReveal';
import { LootBoxSummary } from './LootBoxSummary';
import { ConsumableSummary } from './ConsumableSummary';
import { MilestonesSummary } from './MilestonesSummary';
import type { LootBoxTier } from '@/lib/types';
import type { AchievedMilestone } from '@/lib/lootBox';
import type { ConsumableEffectType, ConsumableTier } from '@/lib/consumables';

interface CompanionData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  type: 'character' | 'creature' | 'object';
  description: string;
  imageUrl: string | null;
  source?: 'reading_time' | 'bonus_drop';
}

interface LootBoxData {
  id: string;
  tier: LootBoxTier;
  source: 'level_up' | 'bonus_drop' | 'completion' | 'achievement' | 'reading_time';
}

interface ConsumableData {
  id: string;
  name: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  description: string;
  duration: number;
}

type RevealPhase =
  | { type: 'companions'; index: number }
  | { type: 'consumables' }
  | { type: 'milestones' }
  | { type: 'lootBoxes' }
  | { type: 'complete' };

interface Props {
  companions: CompanionData[];
  lootBoxes: LootBoxData[];
  consumables?: ConsumableData[];
  milestones?: AchievedMilestone[];
  onComplete: () => void;
}

export function SessionRewardsReveal({
  companions,
  lootBoxes,
  consumables = [],
  milestones = [],
  onComplete
}: Props) {
  // Determine initial phase - show items in order of excitement:
  // companions (most exciting) -> consumables -> milestones -> loot boxes -> complete
  const [phase, setPhase] = useState<RevealPhase>(() => {
    if (companions.length > 0) {
      return { type: 'companions', index: 0 };
    } else if (consumables.length > 0) {
      return { type: 'consumables' };
    } else if (milestones.length > 0) {
      return { type: 'milestones' };
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

  const getNextPhase = (after: RevealPhase['type']): RevealPhase => {
    if (after === 'companions') {
      if (consumables.length > 0) return { type: 'consumables' };
      if (milestones.length > 0) return { type: 'milestones' };
      if (lootBoxes.length > 0) return { type: 'lootBoxes' };
      return { type: 'complete' };
    }
    if (after === 'consumables') {
      if (milestones.length > 0) return { type: 'milestones' };
      if (lootBoxes.length > 0) return { type: 'lootBoxes' };
      return { type: 'complete' };
    }
    if (after === 'milestones') {
      if (lootBoxes.length > 0) return { type: 'lootBoxes' };
      return { type: 'complete' };
    }
    return { type: 'complete' };
  };

  const handleCompanionComplete = () => {
    if (phase.type !== 'companions') return;

    const nextIndex = phase.index + 1;
    if (nextIndex < companions.length) {
      setPhase({ type: 'companions', index: nextIndex });
    } else {
      setPhase(getNextPhase('companions'));
    }
  };

  const handleConsumablesContinue = () => {
    setPhase(getNextPhase('consumables'));
  };

  const handleMilestonesContinue = () => {
    setPhase(getNextPhase('milestones'));
  };

  const handleLootBoxContinue = () => {
    setPhase({ type: 'complete' });
  };

  if (phase.type === 'companions') {
    const companion = companions[phase.index];
    const isLast = phase.index === companions.length - 1 &&
      consumables.length === 0 &&
      milestones.length === 0 &&
      lootBoxes.length === 0;
    return (
      <CompanionCardReveal
        companion={companion}
        onComplete={handleCompanionComplete}
        isLast={isLast}
      />
    );
  }

  if (phase.type === 'consumables') {
    return <ConsumableSummary consumables={consumables} onContinue={handleConsumablesContinue} />;
  }

  if (phase.type === 'milestones') {
    return <MilestonesSummary milestones={milestones} onContinue={handleMilestonesContinue} />;
  }

  if (phase.type === 'lootBoxes') {
    return <LootBoxSummary boxes={lootBoxes} onContinue={handleLootBoxContinue} />;
  }

  // Complete phase - render nothing, effect will call onComplete
  return null;
}
