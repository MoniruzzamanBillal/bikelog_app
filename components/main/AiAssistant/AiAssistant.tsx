import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
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
