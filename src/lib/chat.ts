import type { InferChatMessages } from "@tanstack/ai-react";
import {
	createChatClientOptions,
	fetchServerSentEvents,
	useChat,
} from "@tanstack/ai-react";

const chatOptions = createChatClientOptions({
	connection: fetchServerSentEvents("/api/chat"),
});

export type ChatMessages = InferChatMessages<typeof chatOptions>;

export const useAppChat = () => useChat(chatOptions);
