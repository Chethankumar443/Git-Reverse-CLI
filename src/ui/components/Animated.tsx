import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

export function BlinkingCursor({ color = 'cyan' }: { color?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(v => !v);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{visible ? '▋' : ' '}</Text>;
}


