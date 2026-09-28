import { useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { Panel, ScreenHeader } from "@/components/main/shared";
import { useFetchData, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBike } from "@/types/bike.types";
import { TBikeChatResponse, TChatMessage } from "@/types/ai-assistant.types";

const STARTER_PROMPTS = [
  "When is my next oil change due?",
  "Why did my mileage change recently?",
  "How much did I spend on fuel this year?",
  "What tyre pressure does the manual recommend?",
];

export function AiAssistant() {
  const insets = useSafeAreaInsets();
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [prevBikeId, setPrevBikeId] = useState(bikeId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const chatMutation = usePost();

  // Defensive reset if this screen is ever reused across bikes without remounting
  // (render-time comparison, not an effect — avoids an extra render + effect-timing edge cases).
  if (bikeId !== prevBikeId) {
    setPrevBikeId(bikeId);
    setMessages([]);
  }

  const handleSend = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || chatMutation?.isPending) return;

    const userMessage: TChatMessage = { role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        url: `/bikes/${bikeId}/ai/chat`,
        payload: { messages: history },
      });
      const reply = (response?.data as TBikeChatResponse).reply;
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
    <View style={styles.screen}>
      <ScreenHeader
        title="AI Assistant"
        subtitle={bike?.nickname}
        backLabel={bike?.nickname ?? "Back"}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      >
        {messages?.length === 0 && !chatMutation?.isPending && (
          <View style={styles.emptyState}>
            <View style={styles.emptyChip}>
              <MaterialCommunityIcons
                name="robot-outline"
                size={20}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>
              Ask about {bike?.nickname ?? "this bike"}
            </Text>
            <Text style={styles.emptyLede}>
              Answers use this bike&apos;s fuel, mileage, maintenance and
              spending.
            </Text>

            <View style={styles.starterList}>
              {STARTER_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  onPress={() => handleSend(prompt)}
                  style={styles.starterChip}
                  activeOpacity={0.8}
                >
                  <Text style={styles.starterChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
            {message?.role === "user" ? (
              <Text style={styles.bubbleTextUser}>{message?.content}</Text>
            ) : (
              <Markdown style={markdownStyles}>{message?.content}</Markdown>
            )}
          </View>
        ))}

        {chatMutation?.isPending && (
          <View
            style={[styles.bubble, styles.bubbleAssistant, styles.bubbleThinking]}
          >
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.bubbleText}>AI is thinking…</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardStickyView
        style={styles.composerWrap}
        offset={{ closed: 0, opened: insets.bottom }}
      >
        <Panel glow={messages.length === 0} style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your bike…"
            placeholderTextColor={COLORS.placeholder}
            multiline
            numberOfLines={2}
            editable={!chatMutation.isPending}
            textColor={COLORS.text}
            cursorColor={COLORS.accent}
            selectionColor={COLORS.accent}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            underlineStyle={{ display: "none" }}
            style={styles.input}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={chatMutation.isPending || !input.trim()}
            style={[
              styles.sendButton,
              (chatMutation.isPending || !input.trim()) &&
                styles.sendButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="send"
              size={16}
              color={COLORS.accent}
            />
          </TouchableOpacity>
        </Panel>
      </KeyboardStickyView>
    </View>
  );
}

// ! react-native-markdown-display style object — keyed to its own expected shape, not RN
// ! StyleSheet.create, since it maps element names (paragraph/strong/bullet_list/etc.) to
// ! styles internally. Only the assistant bubble uses this (see the role check above), so
// ! text color is fixed to COLORS.text (styles.bubbleText's own color) rather than needing
// ! a second user-bubble variant. Headings are capped well under a chat bubble's usual size
// ! so they don't look oversized inside a small chat bubble.
const markdownStyles = {
  body: {
    color: COLORS.text,
    fontSize: 13.5,
    lineHeight: 21,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
  heading1: { fontSize: 15, fontWeight: "700" as const, color: COLORS.text },
  heading2: { fontSize: 14, fontWeight: "700" as const, color: COLORS.text },
  heading3: { fontSize: 13, fontWeight: "700" as const, color: COLORS.text },
  heading4: { fontSize: 13, fontWeight: "600" as const, color: COLORS.text },
  heading5: { fontSize: 12, fontWeight: "600" as const, color: COLORS.text },
  heading6: { fontSize: 12, fontWeight: "600" as const, color: COLORS.text },
  strong: {
    fontWeight: "600" as const,
    color: COLORS.text,
  },
  bullet_list: {
    marginBottom: 6,
    paddingLeft: 18,
  },
  ordered_list: {
    marginBottom: 6,
    paddingLeft: 18,
  },
  list_item: {
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.edge,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 12,
    color: COLORS.text,
  },
  code_block: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.edge,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  fence: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.edge,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  link: {
    color: COLORS.accent,
    textDecorationLine: "underline" as const,
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  emptyState: {
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 8,
  },
  emptyChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 2,
  },
  emptyLede: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textLight,
  },
  starterList: {
    marginTop: 8,
    gap: 8,
    alignSelf: "stretch",
  },
  starterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  starterChipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  bubble: {
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  bubbleUser: {
    maxWidth: "80%",
    alignSelf: "flex-end",
    backgroundColor: COLORS.surface3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 12,
  },
  bubbleAssistant: {
    maxWidth: "86%",
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
  },
  bubbleThinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bubbleTextUser: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORS.accentForeground,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORS.text,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: COLORS.background,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    borderRadius: 12,
    padding: 6,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    maxHeight: 90,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
