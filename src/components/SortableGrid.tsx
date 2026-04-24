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
import { Config } from '../constants/Config';

const NUM_COLUMNS = Config.IS_PRO ? 3 : 2;
const GAP = 12;
const PADDING = 16;
const LONG_PRESS_MS = 400;

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
  children: React.ReactNode;
};

function SortableItem({
  id,
  itemWidth,
  itemHeight,
  totalCount,
  positions,
  onSwapEnd,
  children,
}: SortableItemProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const zIndex = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const positioned = useSharedValue(false);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const wobbleProgress = useSharedValue(0);

  // Slot pozisyonuna senkron (ilk atama anlık, sonrası spring)
  useDerivedValue(() => {
    if (isDragging.value) return;
    const idx = positions.value[id];
    if (idx === undefined) return;
    const pos = slotPos(idx, itemWidth, itemHeight);
    if (!positioned.value) {
      translateX.value = pos.x;
      translateY.value = pos.y;
      positioned.value = true;
    } else {
      translateX.value = withSpring(pos.x, { damping: 20, stiffness: 220 });
      translateY.value = withSpring(pos.y, { damping: 20, stiffness: 220 });
    }
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      isDragging.value = true;
      const myIdx = positions.value[id];
      if (myIdx !== undefined) {
        const start = slotPos(myIdx, itemWidth, itemHeight);
        startX.value = start.x;
        startY.value = start.y;
      }
      zIndex.value = 999;
      wobbleProgress.value = withRepeat(
        withTiming(1, { duration: 160 }),
        -1,
        true,
      );
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      const hedefIdx = slotFromPos(
        translateX.value,
        translateY.value,
        itemWidth,
        itemHeight,
        totalCount,
      );
      const myIdx = positions.value[id];

      // Swap: me <-> hedefteki kart (diğerleri dokunulmaz)
      if (myIdx !== undefined && hedefIdx !== myIdx) {
        const yeni: Record<string, number> = { ...positions.value };
        const keys = Object.keys(yeni);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (yeni[k] === hedefIdx && k !== id) {
            yeni[k] = myIdx;
            break;
          }
        }
        yeni[id] = hedefIdx;
        positions.value = yeni;
      }

      const yeniIdx = positions.value[id];
      if (yeniIdx !== undefined) {
        const yeniPos = slotPos(yeniIdx, itemWidth, itemHeight);
        translateX.value = withSpring(yeniPos.x, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(yeniPos.y, { damping: 18, stiffness: 220 });
      }
      zIndex.value = 0;
      isDragging.value = false;
      wobbleProgress.value = withTiming(0, { duration: 120 });
      runOnJS(onSwapEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Yalnız sürüklenen kart titresin, başlangıçta ve bitişte rotate 0
    const rotate = Math.sin(wobbleProgress.value * Math.PI * 2) * 1.5;
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: itemWidth,
      height: itemHeight,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
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
};

export default function SortableGrid<T>({
  data,
  keyExtractor,
  renderItem,
  itemHeight,
  onOrderChange,
}: Props<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = useMemo(
    () => (windowWidth - 2 * PADDING - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
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
    <View style={{ paddingHorizontal: PADDING }}>
      <View style={{ height: containerHeight, position: 'relative' }}>
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
            >
              {renderItem(item)}
            </SortableItem>
          );
        })}
      </View>
    </View>
  );
}
