import { Host, Slider } from '@expo/ui/swift-ui';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN = 0;
const MAX = 10;

export default function SliderBugScreen() {
  const [value, setValue] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const append = (line: string) =>
    setLog((prev) => [line, ...prev].slice(0, 8));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>@expo/ui SwiftUI Slider</Text>
      <Text style={styles.subtitle}>
        Programmatic value updates stop applying after the first drag.
      </Text>

      <Text style={styles.value}>JS state: {value.toFixed(2)}</Text>

      <Host style={styles.host}>
        <Slider
          value={value}
          min={MIN}
          max={MAX}
          step={0.01}
          onValueChange={setValue}
          onEditingChanged={(isEditing) =>
            append(`onEditingChanged: ${isEditing}`)
          }
        />
      </Host>

      {/* Both buttons change the slider purely through the `value` prop. */}
      <View style={styles.row}>
        <Button title="Set 2.5" onPress={() => setValue(2.5)} />
        <Button title="Set 7.5" onPress={() => setValue(7.5)} />
        <Button title="Reset 0" onPress={() => setValue(0)} />
      </View>

      <Text style={styles.steps}>
        1. Tap “Set 7.5” — the thumb moves. Prop updates work.{'\n'}
        2. Drag the slider anywhere, then release.{'\n'}
        3. Tap “Set 2.5” — JS state updates, the thumb does not move again.
      </Text>

      <Text style={styles.logTitle}>onEditingChanged events</Text>
      {log.map((line, i) => (
        <Text key={`${line}-${i}`} style={styles.logLine}>
          {line}
        </Text>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, opacity: 0.6 },
  value: { fontSize: 32, fontVariant: ['tabular-nums'] },
  host: { height: 40 },
  row: { flexDirection: 'row', gap: 16 },
  steps: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  logTitle: { fontSize: 12, fontWeight: '600', marginTop: 8, opacity: 0.6 },
  logLine: { fontSize: 12, fontVariant: ['tabular-nums'], opacity: 0.6 },
});
