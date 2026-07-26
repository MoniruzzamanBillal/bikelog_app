# 19: AI Integration (Spending Insight, Mileage Insight, Bike Chat)

Status: ⛔ Not started

## Goal

Consume the three AI endpoints already shipped on `bikelog_server` (spec 16): a spending-insight card, a mileage-insight card, and a full chat screen scoped to one bike. This is v2 scope, client for a feature already built and shipped on `bikelog_client-web-` (its spec 14), ported to this app's own conventions rather than copied verbatim.

## Context

**Backend contract** (already live on the shared `bikelog_server`; re-confirmed via direct `curl` this session — register → login → create bike → create a fuel log → both insight endpoints → a two-turn chat call → a rejected `role: "system"` message):

- `GET /bikes/:bikeId/ai/spending-insight` → `{ insight: string, generated: boolean, cached: boolean }`
- `GET /bikes/:bikeId/ai/mileage-insight` → `{ insight: string, generated: boolean, cached: boolean }`
- `POST /bikes/:bikeId/ai/chat`, body `{ messages: {role: "user"|"assistant", content: string}[] }` → `{ reply: string }`

**Key behaviors**:

- Chat is **stateless server-side** — the client owns and resends the full conversation history on every call; the backend never persists messages.
- The backend rejects any client-supplied `role: "system"` message with a 400 — this app's UI only ever sends `"user"`/`"assistant"`, so it can never trigger that path, but don't accidentally allow a system-role message to be constructed client-side.
- Insight endpoints regenerate automatically server-side when the underlying log count changes; a plain re-fetch (e.g. revisiting the screen) picks up a fresh insight when warranted and returns the cached one (`cached: true`) otherwise — no manual "regenerate" button needed in this pass.
- No new backend work — all three routes are already deployed and were exercised live against the actual `bikelog_server` this session, not just documented from the web app's spec.

## Design

### Files to create/modify

| Path                                                 | Action | Notes                                                                                                     |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `types/spending.types.ts`                            | Modify | Add `TSpendingInsight`.                                                                                   |
| `types/mileage.types.ts`                             | Modify | Add `TMileageInsight`.                                                                                    |
| `types/ai-assistant.types.ts`                        | Create | `TChatMessage`, `TBikeChatResponse` — new file, matches this app's flat `types/<domain>.types.ts` layout. |
| `components/main/Spending/AiSpendingInsightCard.tsx` | Create | Card, rendered above `Spending.tsx`'s tab bar.                                                            |
| `components/main/Mileage/AiMileageInsightCard.tsx`   | Create | Card, rendered above `Mileage.tsx`'s tab bar.                                                             |
| `components/main/Spending/Spending.tsx`              | Modify | Render `AiSpendingInsightCard` above `styles.tabBar`.                                                     |
| `components/main/Mileage/Mileage.tsx`                | Modify | Render `AiMileageInsightCard` above `styles.tabBar`.                                                      |
| `components/main/AiAssistant/AiAssistant.tsx`        | Create | Chat screen.                                                                                              |
| `app/bikes/[bikeId]/assistant.tsx`                   | Create | One-liner route wrapper.                                                                                  |
| `components/main/Bike/BikeDetailPage.tsx`            | Modify | `TILES` gains a 7th entry pointing at `assistant`.                                                        |

### AiSpendingInsightCard / AiMileageInsightCard

Same shape, same card idiom as every other summary card in this app:

```tsx
export function AiSpendingInsightCard({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TSpendingInsight>(
    ["ai", "spending-insight", bikeId],
    `/bikes/${bikeId}/ai/spending-insight`,
    { enabled: !!bikeId },
  );

  const insight = data?.data;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>AI Insight</Text>
      <Text style={styles.body}>
        {isLoading
          ? "Thinking..."
          : (insight?.insight ?? "No insight available yet.")}
      </Text>
    </View>
  );
}
```

`AiMileageInsightCard` is identical apart from the query key/endpoint (`["ai", "mileage-insight", bikeId]`, `.../ai/mileage-insight`) and its `TMileageInsight` type.

Both rendered as the first child inside `Spending.tsx`/`Mileage.tsx`, above `styles.tabBar`:

```tsx
<View style={styles.container}>
  <Text style={styles.title}>Spending</Text>
  <AiSpendingInsightCard bikeId={bikeId} />
  <View style={styles.tabBar}>...</View>
  ...
</View>
```

### AiAssistant.tsx — chat screen

```tsx
export function AiAssistant() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [prevBikeId, setPrevBikeId] = useState(bikeId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const chatMutation = usePost();

  // Defensive reset if this screen is ever reused across bikes without remounting
  // (render-time comparison, not an effect — avoids an extra render + effect-timing edge cases).
  if (bikeId !== prevBikeId) {
    setPrevBikeId(bikeId);
    setMessages([]);
  }

  const handleSend = async () => {
    const content = input.trim();
    if (!content || chatMutation.isPending) return;

    const userMessage: TChatMessage = { role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        url: `/bikes/${bikeId}/ai/chat`,
        payload: { messages: history },
      });
      const reply = (response.data as TBikeChatResponse).reply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to get AI reply",
        position: "top",
      });
      // Deliberately no assistant message appended — the optimistic user
      // message above stays visible, matching the web app's error handling.
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Assistant</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !chatMutation.isPending && (
          <Text style={styles.emptyText}>
            Ask anything about this bike&apos;s fuel, mileage, or maintenance.
          </Text>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              message.role === "user"
                ? styles.bubbleUser
                : styles.bubbleAssistant,
            ]}
          >
            <Text
              style={
                message.role === "user"
                  ? styles.bubbleTextUser
                  : styles.bubbleText
              }
            >
              {message.content}
            </Text>
          </View>
        ))}

        {chatMutation.isPending && (
          <View
            style={[
              styles.bubble,
              styles.bubbleAssistant,
              styles.bubbleThinking,
            ]}
          >
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.bubbleText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
          numberOfLines={2}
          editable={!chatMutation.isPending}
          textColor={COLORS.text}
          style={styles.input}
        />
        <IconButton
          icon="send"
          mode="contained"
          disabled={chatMutation.isPending || !input.trim()}
          onPress={handleSend}
        />
      </View>
    </View>
  );
}
```

Styling: `styles.bubble` base (`maxWidth: "80%", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 8`), `styles.bubbleUser` (`alignSelf: "flex-end", backgroundColor: COLORS.primary`), `styles.bubbleAssistant` (`alignSelf: "flex-start", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border`), `styles.bubbleTextUser` (`color: COLORS.white`), `styles.bubbleText` (`color: COLORS.text`). Input field reuses the exact borderless/underline idiom from `BikeIssueFormModal.tsx`'s `description` field (`styles.field`/`styles.input`).

### app/bikes/[bikeId]/assistant.tsx

```tsx
import { AiAssistant } from "@/components/main/AiAssistant/AiAssistant";

export default function AssistantScreen() {
  return <AiAssistant />;
}
```

### BikeDetailPage.tsx — new tile

```tsx
const TILES: TTile[] = [
  { label: "Fuel Logs", icon: "gas-station", segment: "fuel-logs" },
  { label: "Mileage", icon: "speedometer", segment: "mileage" },
  { label: "Maintenance", icon: "wrench", segment: "maintenance-logs" },
  { label: "Spending", icon: "cash-multiple", segment: "spending" },
  { label: "Issues", icon: "alert-circle-outline", segment: "issues" },
  { label: "Accessories", icon: "shopping-outline", segment: "accessories" },
  { label: "AI Assistant", icon: "robot-outline", segment: "assistant" },
];
```

(`"robot-outline"` confirmed present in the installed `@expo/vector-icons` `MaterialCommunityIcons` glyph map.)

## Implementation

1. Add `TSpendingInsight` to `types/spending.types.ts`, `TMileageInsight` to `types/mileage.types.ts`, and create `types/ai-assistant.types.ts` (`TChatMessage`, `TBikeChatResponse`).
2. Create `AiSpendingInsightCard.tsx` / `AiMileageInsightCard.tsx`; render each above the relevant screen's tab bar.
3. Create `components/main/AiAssistant/AiAssistant.tsx` per Design above.
4. Create `app/bikes/[bikeId]/assistant.tsx`.
5. Add the 7th tile to `BikeDetailPage.tsx`'s `TILES`.
6. Confirm `app/bikes/_layout.tsx`'s existing `AuthGuard` actually covers the new `assistant` route — don't just assume it because it sits under `app/bikes/[bikeId]/`; verify by checking the route tree the same way the layout already covers `fuel-logs.tsx`/`spending.tsx`/etc.
7. Run `expo lint` and `npx tsc --noEmit`; fix anything either flags.
8. Update `progress-tracker.md` (Current Phase, Spec Implementation Status table, Recent Activity, Known Gaps if anything new surfaces) and flip this spec's own `Status:` line and `00-build-plan.md`'s row to `✅ Complete`.

## Dependencies

Spec 08 (Mileage) and Spec 11 (Spending Summary) must already exist (the two insight cards render inside those screens). Spec 06 (Bike hub) must already exist (the new nav tile + the `assistant` route sit under the same `app/bikes/[bikeId]/` stack it established). No dependency on Spec 18 — this spec's chat/insight features are independent of the trend charts, though both are being planned together.

## Verify

- [ ] **Spending insight card loads and shows a real insight**: `AiSpendingInsightCard` fetches `.../ai/spending-insight`, shows `"Thinking..."` while loading, then the returned `insight` text. _(Will need the "code-verified only, no device/simulator" caveat this project applies everywhere per `progress-tracker.md`'s Known Gaps, unless a device/simulator is available at implementation time.)_
- [ ] **Mileage insight card loads and shows a real insight**: same pattern, `.../ai/mileage-insight`.
- [ ] **Insight cards don't re-trigger generation on every visit**: confirmed at the API level this session (`cached: true` on a same-bike repeat call) — the RN card itself does nothing special to cause a re-generation, it's a plain `useFetchData` GET.
- [ ] **Sending a chat message appends it immediately, shows a thinking state, then appends the real reply**: `AiAssistant.tsx`'s `handleSend` — optimistic user-message append before the `mutateAsync` call, `chatMutation.isPending` drives the thinking bubble, `reply` appended as an assistant message on success.
- [ ] **Conversation history is resent correctly across multiple turns in the same session**: `history` passed to `mutateAsync`'s payload is `[...messages, userMessage]`, not just the new message.
- [ ] **Conversation resets when navigating to a different bike's assistant screen**: the `prevBikeId` render-time comparison in `AiAssistant.tsx`.
- [ ] **A failed chat call surfaces an error toast and does not fabricate a reply**: `catch` block only calls `Toast.show`, never appends a synthetic assistant message; the optimistically-appended user message stays visible.
- [ ] **Usable on a phone-sized screen**: message bubbles wrap (`maxWidth: "80%"`), input row doesn't overflow (`IconButton` beside a `multiline` `TextInput`).
- [ ] **New `assistant` route is gated by the existing `AuthGuard`**: confirmed by inspection of `app/bikes/_layout.tsx`, not assumed.
- [ ] **`expo lint` is clean**: 0 errors, 0 warnings. `npx tsc --noEmit` also passes clean.
