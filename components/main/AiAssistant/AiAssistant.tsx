import { useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { ScreenHeader } from "@/components/main/shared";
import { useFetchData, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import { TBike } from "@/types/bike.types";
import { TBikeChatResponse, TChatMessage } from "@/types/ai-assistant.types";

export function AiAssistant() {
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
    <View style={styles.screen}>
      <ScreenHeader title="AI Assistant" backLabel={bike?.nickname ?? "Back"} />

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.groundedPillWrap}>
          <Text style={styles.groundedPill}>
            Grounded in your bike manual &amp; logs
          </Text>
        </View>

        {messages.length === 0 && !chatMutation.isPending && (
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <Text style={styles.bubbleSender}>bikeLog AI</Text>
            <Text style={styles.bubbleText}>
              Ask anything about this bike&apos;s fuel, mileage, or maintenance.
            </Text>
          </View>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              message.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            {message.role === "user" ? (
              <Text style={styles.bubbleTextUser}>{message.content}</Text>
            ) : (
              <>
                <Text style={styles.bubbleSender}>bikeLog AI</Text>
                <Markdown style={markdownStyles}>{message.content}</Markdown>
              </>
            )}
          </View>
        ))}

        {chatMutation.isPending && (
          <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleThinking]}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.bubbleText}>AI is thinking…</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardStickyView style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your bike…"
          placeholderTextColor={COLORS.placeholder}
          multiline
          numberOfLines={2}
          editable={!chatMutation.isPending}
          textColor={COLORS.text}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={chatMutation.isPending || !input.trim()}
          style={[
            styles.sendButton,
            (chatMutation.isPending || !input.trim()) && styles.sendButtonDisabled,
          ]}
        >
          <MaterialCommunityIcons name="send" size={16} color={COLORS.white} />
        </TouchableOpacity>
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
    fontSize: 13,
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
    fontWeight: "700" as const,
    color: COLORS.text,
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
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 12,
    color: COLORS.text,
  },
  code_block: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  fence: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
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
    padding: 16,
    gap: 10,
  },
  groundedPillWrap: {
    alignItems: "center",
    marginBottom: 4,
  },
  groundedPill: {
    fontSize: 11,
    color: COLORS.placeholder,
    backgroundColor: "rgba(30,32,48,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 3,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderBottomLeftRadius: 3,
  },
  bubbleThinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  bubbleTextUser: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.white,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    maxHeight: 90,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
