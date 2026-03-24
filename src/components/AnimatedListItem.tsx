import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
}

export default function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      {children}
    </Animated.View>
  );
}
