# @expo/ui SwiftUI `Slider` ignores `value` prop updates after the first drag

Minimal reproduction for a bug in `@expo/ui`'s SwiftUI `Slider` on iOS: once the
user has dragged the thumb, the component permanently stops applying
programmatic updates to the `value` prop. JS state keeps changing, the thumb
never moves again.

- Affected: `@expo/ui` `57.0.9` and `57.0.11` (`ios/SliderView.swift` is
  byte-identical in both)
- Platform: iOS only. The Jetpack Compose implementation does not share the bug.
- Repro screen: [`src/app/index.tsx`](src/app/index.tsx)

## Run it

```bash
npm install
npx expo run:ios
```

## Steps

1. Tap **Set 7.5** — the thumb moves. Prop-driven updates work before any drag.
2. Drag the slider anywhere and release.
3. Tap **Set 2.5** — the `JS state:` readout updates, but the thumb stays put.

Every later prop update is ignored too. The on-screen `onEditingChanged` log
shows what the native side reported during the drag.

**Expected:** the thumb follows the `value` prop, as it does before step 2.
**Actual:** after one drag, `value` is write-once-ignored forever.

## Cause

`ios/SliderView.swift` only applies an external value inside an `onChange`
handler that bails out while a drag is in progress:

```swift
@State var isEditing: Bool = false

.onChange(of: props.value) { newValue in
  guard !isEditing else { return }   // <- drops the update
  value = clamp(newValue ?? 0.0)
}
```

Two things combine to make this permanent:

1. **The drop is never retried.** `onChange(of:)` only fires on a transition, so
   a value discarded by the guard is simply lost — there is no replay when the
   drag ends. The SwiftUI `@State` and the JS prop are then out of sync with
   nothing to reconcile them.
2. **`isEditing` latches.** It is written from `handleEditingChanged`, a closure
   built inside the `sliderContent` `@ViewBuilder` that captures `self` — a
   `View` struct copy. The body re-evaluates every frame during a drag, so the
   `false` write can land on storage that is no longer live. JS still receives
   the `onEditingChanged(false)` event (it is dispatched on the next line), which
   is why the log looks correct while the Swift flag stays `true`.

The guard itself is load-bearing — it is what stops the thumb snapping back
mid-drag when JS echoes a stale value — so removing it regresses that fix.

## Suggested fix

Move the drag flag onto a reference type so the write cannot be lost, and treat
the guard as an echo filter rather than a hard gate, so a value the view did not
itself emit is always applied:

```swift
final class SliderSyncState: ObservableObject {
  var isEditing: Bool = false
  var echoes: Set<Float> = []
}

@StateObject var sync = SliderSyncState()

.onChange(of: props.value) { newValue in
  let incoming = clamp(newValue ?? 0.0)
  if sync.isEditing {
    if sync.echoes.contains(incoming) { return }  // our own value, coming back
    sync.isEditing = false                        // external update: un-wedge
    sync.echoes.removeAll()
  }
  value = incoming
}
.onChange(of: value) { newValue in
  if props.value != newValue {
    if sync.isEditing { sync.echoes.insert(newValue) }
    props.onValueChanged(["value": newValue])
  }
}
```

with `handleEditingChanged` writing `sync.isEditing` and clearing `sync.echoes`.
