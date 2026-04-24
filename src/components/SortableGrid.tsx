import React, { useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  runOnJS,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const NUM_COLUMNS = 2;
const GAP = 12;
const PADDING = 16;

function slotPos(idx: number, itemW: number, itemH: number) {
  'worklet';
  const col = idx % NUM_COLUMNS;
  const row = Math.floor(idx / NUM_COLUMNS);
  return {
    x: col * (itemW + GAP),
    y: row * (itemH + GAP),
  };
}

function slotFromPos(x: number, y: number, itemW: number, itemH: number, count: number) {
  'worklet';
  const col = Math.round(x / (itemW + GAP));
  const row = Math.round(y / (itemH + GAP));
  const clampedCol = Math.max(0, Math.min(NUM_COLUMNS - 1, col));
  const maxRow = Math.floor((count - 1) / NUM_COLUMNS);
  const clampedRow = Math.max(0, Math.min(maxRow, row));
  const idx = clampedRow * NUM_COLUMNS + clampedCol;
  return Math.max(0, Math.min(count - 1, idx));
}

type SortableItemProps = {
  id: string;
  itemWidth: number;
  itemHeight: number;
  totalCount: number;
  positions: SharedValue<Record<string, number>>;
  onSwapEnd: () => void;
  wobble: boolean;
  children: React.ReactNode;
};

function SortableItem({
  id,
  itemWidth,
  itemHeight,
  totalCount,
  positions,
  onSwapEnd,
  wobble,
  children,
}: SortableItemProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const wobbleProgress = useSharedValue(0);

  // Slot pozisyonuna senkron olmak (swap sonrası kart kendi slot'una animate)
  useDerivedValue(() => {
    if (isDragging.value) return;
    const idx = positions.value[id];
    if (idx === undefined) return;
    const pos = slotPos(idx, itemWidth, itemHeight);
    translateX.value = withSpring(pos.x, { damping: 20, stiffness: 220 });
    translateY.value = withSpring(pos.y, { damping: 20, stiffness: 220 });
  });

  // iPhone-tarzı hafif titreşim
  useEffect(() => {
    if (wobble) {
      const delay = Math.random() * 80;
      wobbleProgress.value = withRepeat(
        withTiming(1, { duration: 140 + delay }),
        -1,
        true,
      );
    } else {
      wobbleProgress.value = withTiming(0, { duration: 120 });
    }
  }, [wobble, wobbleProgress]);

  const pan = Gesture.Pan()
    .enabled(wobble)
    .onStart(() => {
      isDragging.value = true;
      scale.value = withSpring(1.1, { damping: 15 });
      zIndex.value = 999;
    })
    .onUpdate((e) => {
      const myIdx = positions.value[id];
      if (myIdx === undefined) return;
      const start = slotPos(myIdx, itemWidth, itemHeight);
      translateX.value = start.x + e.translationX;
      translateY.value = start.y + e.translationY;
    })
    .onEnd(() => {
      const finalX = translateX.value;
      const finalY = translateY.value;
      const hedefIdx = slotFromPos(finalX, finalY, itemWidth, itemHeight, totalCount);
      const myIdx = positions.value[id];

      if (myIdx !== undefined && hedefIdx !== myIdx) {
        const yeni: Record<string, number> = { ...positions.value };
        const keys = Object.keys(yeni);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (k === id) {
            yeni[k] = hedefIdx;
          } else if (myIdx < hedefIdx) {
            if (yeni[k] > myIdx && yeni[k] <= hedefIdx) yeni[k] -= 1;
          } else {
            if (yeni[k] >= hedefIdx && yeni[k] < myIdx) yeni[k] += 1;
          }
        }
        positions.value = yeni;
      }

      const yeniIdx = positions.value[id];
      if (yeniIdx !== undefined) {
        const yeniPos = slotPos(yeniIdx, itemWidth, itemHeight);
        translateX.value = withSpring(yeniPos.x, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(yeniPos.y, { damping: 18, stiffness: 220 });
      }
      scale.value = withSpring(1);
      zIndex.value = 0;
      isDragging.value = false;
      runOnJS(onSwapEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = (wobbleProgress.value - 0.5) * 2.4; // -1.2deg..+1.2deg
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: itemWidth,
      height: itemHeight,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotate}deg` },
      ],
      zIndex: zIndex.value,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  itemHeight: number;
  onOrderChange: (newData: T[]) => void;
  editing: boolean;
};

export default function SortableGrid<T>({
  data,
  keyExtractor,
  renderItem,
  itemHeight,
  onOrderChange,
  editing,
}: Props<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = useMemo(
    () => (windowWidth - 2 * PADDING - GAP) / NUM_COLUMNS,
    [windowWidth],
  );

  const rowCount = Math.max(1, Math.ceil(data.length / NUM_COLUMNS));
  const containerHeight = rowCount * itemHeight + (rowCount - 1) * GAP;

  const positions = useSharedValue<Record<string, number>>({});

  useEffect(() => {
    const p: Record<string, number> = {};
    data.forEach((item, i) => {
      p[keyExtractor(item)] = i;
    });
    positions.value = p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.map(keyExtractor).join('|')]);

  const notifyOrderChange = () => {
    const p = positions.value;
    const sorted = [...data].sort(
      (a, b) => (p[keyExtractor(a)] ?? 0) - (p[keyExtractor(b)] ?? 0),
    );
    onOrderChange(sorted);
  };

  return (
    <View style={{ height: containerHeight, paddingHorizontal: PADDING }}>
      {data.map((item) => {
        const id = keyExtractor(item);
        return (
          <SortableItem
            key={id}
            id={id}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
            totalCount={data.length}
            positions={positions}
            onSwapEnd={notifyOrderChange}
            wobble={editing}
          >
            {renderItem(item)}
          </SortableItem>
        );
      })}
    </View>
  );
}
