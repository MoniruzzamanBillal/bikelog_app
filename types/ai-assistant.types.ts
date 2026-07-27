export type TChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TBikeChatResponse = {
  reply: string;
};
