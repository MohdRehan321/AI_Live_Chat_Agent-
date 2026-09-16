import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: "../.env" });

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1", 
});

const SYSTEM_PROMPT = `You are a customer support assistant for a fictional e-commerce store.

Follow these store policies exactly:
- Shipping usually takes 3-5 business days.
- Returns are accepted within 30 days of delivery.
- Live support hours are 9am-5pm EST.

Be concise, helpful, and friendly. If a question is unrelated to the store, politely steer the user back to store support topics.`;

type ChatHistoryItem = {
  sender: "user" | "ai";
  content: string;
};

export async function generateReply(
  history: ChatHistoryItem[],
): Promise<string> {
  try {
    const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      history.map((entry) =>
        entry.sender === "user"
          ? {
              role: "user",
              content: entry.content,
            }
          : {
              role: "assistant",
              content: entry.content,
            },
      );

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...historyMessages,
    ];

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
    });

    return (
      completion.choices[0]?.message?.content?.trim() ||
      "I'm sorry, but I couldn't generate a reply right now. Please try again in a moment."
    );
  } catch (error) {
    console.error("Failed to generate LLM reply", error);

    return "I'm sorry, but I'm having trouble responding right now. Please try again in a moment.";
  }
}
