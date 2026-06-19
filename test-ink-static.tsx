import React, { useState, useEffect } from 'react';
import { render, Box, Text, Static } from 'ink';

function App() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      setItems(prev => [...prev, `Item ${count++}`]);
      if (count > 3) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const staticItems = [{ type: 'header' }, ...items.map(msg => ({ type: 'msg', text: msg }))];

  return (
    <Box flexDirection="column">
      <Static items={staticItems}>
        {(item, index) => {
          if (item.type === 'header') {
            return <Text key="header" color="cyan">=== THIS IS THE HEADER ===</Text>;
          }
          return <Text key={`msg-${index}`}>{item.text}</Text>;
        }}
      </Static>
      <Text color="green">Active bottom area</Text>
    </Box>
  );
}

render(React.createElement(App));
