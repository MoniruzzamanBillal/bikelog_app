import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Markdown from "react-native-markdown-display";
import {
  ActivityIndicator,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import Toast from "react-native-toast-message";
import { usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBikeChatResponse, TChatMessage } from "@/types/ai-assistant.types";

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
            {message.role === "user" ? (
              <Text style={styles.bubbleTextUser}>{message.content}</Text>
            ) : (
              <Markdown style={markdownStyles}>{message.content}</Markdown>
            )}
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

      <KeyboardStickyView style={styles.inputRow}>
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
      </KeyboardStickyView>
    </View>
  );
}

// ! react-native-markdown-display style object — keyed to its own expected shape, not RN
// ! StyleSheet.create, since it maps element names (paragraph/strong/bullet_list/etc.) to
// ! styles internally. Only the assistant bubble uses this (see the role check above), so
// ! text color is fixed to COLORS.text (styles.bubbleText's own color) rather than needing
// ! a second user-bubble variant. Headings are capped well under styles.title's 22px so they
// ! don't look oversized inside a small chat bubble.
const markdownStyles = {
  body: {
    color: COLORS.text,
    fontSize: 14,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
  heading1: { fontSize: 16, fontWeight: "700" as const, color: COLORS.text },
  heading2: { fontSize: 15, fontWeight: "700" as const, color: COLORS.text },
  heading3: { fontSize: 14, fontWeight: "700" as const, color: COLORS.text },
  heading4: { fontSize: 14, fontWeight: "600" as const, color: COLORS.text },
  heading5: { fontSize: 13, fontWeight: "600" as const, color: COLORS.text },
  heading6: { fontSize: 12, fontWeight: "600" as const, color: COLORS.text },
  strong: {
    fontWeight: "700" as const,
  },
  bullet_list: {
    marginBottom: 6,
  },
  ordered_list: {
    marginBottom: 6,
  },
  list_item: {
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 12,
    color: COLORS.text,
  },
  code_block: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  fence: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: "underline" as const,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  messages: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 40,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleThinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bubbleTextUser: {
    color: COLORS.white,
  },
  bubbleText: {
    color: COLORS.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
});
