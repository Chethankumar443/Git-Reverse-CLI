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
  models: OpenRouterModel[]
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
    <Box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" width="100%">
      <Box flexDirection="column" alignItems="center">
        {/* Step progress badges — only show during first-time setup */}
      {!isSettings && (
        <Box marginBottom={1} flexDirection="row" alignItems="center">
          <Text color="white" dimColor>1 </Text>
          <Text color="white" dimColor> NAME  </Text>
          <Text color="white" dimColor>──  </Text>
          <Text color="white" dimColor>2 </Text>
          <Text color="white" dimColor> API KEY  </Text>
          <Text color="white" dimColor>──  </Text>
          <Text color="black" backgroundColor="cyan"> 3 </Text>
          <Text color="cyan" dimColor> MODEL</Text>
        </Box>
      )}

      {/* Header */}
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text color="black" backgroundColor="cyan">
          {isSettings ? ' CHANGE MODEL ' : ' SELECT MODEL '}
        </Text>
        <Text color="cyan" dimColor>  {models.length} free model{models.length !== 1 ? 's' : ''} available</Text>
      </Box>

      {/* Navigation hints */}
      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text color="white" dimColor>  </Text>
        <Text color="black" backgroundColor="white"> ↑↓ </Text>
        <Text color="white" dimColor> navigate  </Text>
        <Text color="black" backgroundColor="white"> Enter </Text>
        <Text color="white" dimColor> select</Text>
      </Box>

      {selected ? (
        <Box flexDirection="row" alignItems="center" paddingLeft={2}>
          <Text color="black" backgroundColor="green"> ✓ SELECTED </Text>
          <Text color="white" dimColor>  </Text>
          <Text color="white">{formatModelId(selected.id)}</Text>
          <Text color="white" dimColor>  set as default</Text>
        </Box>
      ) : (
        <Box flexDirection="column" alignItems="center">
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
      <Text color={isSelected ? 'cyan' : 'white'} dimColor={!isSelected} bold={isSelected}>
        {isSelected ? '› ' : '  '}
        {label}
      </Text>
    </Box>
  );
}
