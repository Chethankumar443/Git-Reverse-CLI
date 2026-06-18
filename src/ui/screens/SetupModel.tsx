// ─────────────────────────────────────────────────────────────
//  git-reverse — Setup: Model Selection Screen
//  Lists all free-tier models, user selects default
// ─────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { setSelectedModel, markSetupComplete } from '../../config/store.js';
import type { OpenRouterModel } from '../../types/index.js';
import { formatModelId, formatModelProvider, truncate } from '../../utils/format.js';

interface SetupModelProps {
  models: OpenRouterModel[];
  isSettings?: boolean;
  onComplete: (model: OpenRouterModel) => void;
}

export function SetupModel({ models, isSettings = false, onComplete }: SetupModelProps) {
  const [selected, setSelected] = useState<OpenRouterModel | null>(null);

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0)),
    [models],
  );

  const modelMap = useMemo(
    () => new Map(sortedModels.map((m) => [m.id, m])),
    [sortedModels],
  );

  const items = sortedModels.map((m) => ({
    label: formatItem(m),
    value: m.id,
  }));

  const handleSelect = (item: { label: string; value: string }) => {
    const model = modelMap.get(item.value);
    if (!model) return;
    setSelectedModel(item.value);
    if (!isSettings) markSetupComplete();
    setSelected(model);
    setTimeout(() => onComplete(model), 300);
  };

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text color="white" dimColor>
          {isSettings ? 'Change active model — ' : 'Step 3 of 3 — '}
        </Text>
        <Text color="cyan">Select a model</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="white" dimColor>
          {'  '}{models.length} free model{models.length !== 1 ? 's' : ''} available · ↑↓ navigate · Enter select
        </Text>
      </Box>

      {selected ? (
        <Box paddingLeft={2}>
          <Text color="green">✓ </Text>
          <Text color="white">{formatModelId(selected.id)}</Text>
          <Text color="white" dimColor>
            {' '}set as default
          </Text>
        </Box>
      ) : (
        <Box paddingLeft={2} flexDirection="column">
          <Box marginBottom={0}>
            <Text color="white" dimColor>
              {'  PROVIDER/MODEL'.padEnd(36)}CTX
            </Text>
          </Box>
          <SelectInput
            items={items}
            onSelect={handleSelect}
            itemComponent={ModelItem}
          />
        </Box>
      )}
    </Box>
  );
}

function formatItem(m: OpenRouterModel): string {
  const ctx = m.context_length
    ? `${(m.context_length / 1000).toFixed(0)}k`
    : '—';
  const name = `${formatModelProvider(m.id)}/${formatModelId(m.id)}`;
  return `${truncate(name, 34).padEnd(36)}${ctx}`;
}

function ModelItem({
  isSelected,
  label,
}: {
  isSelected?: boolean;
  label: string;
}) {
  return (
    <Box>
      <Text color={isSelected ? 'cyan' : 'white'} dimColor={!isSelected}>
        {isSelected ? '› ' : '  '}
        {label}
      </Text>
    </Box>
  );
}
