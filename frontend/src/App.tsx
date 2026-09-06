import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import "./App.css";

type Sender = "user" | "ai";

type Message = {
  id: string;
  text: string;
  sender: Sender;
  createdAt?: string;
};

type HistoryMessage = {
  id?: string;
  content?: string;
  message?: string;
  text?: string;
  sender: Sender;
  createdAt?: string;
};

type HistoryResponse =
  | HistoryMessage[]
  | {
      messages?: HistoryMessage[];
    };

type ChatResponse = {
  sessionId?: string;
  reply?: string;
  message?: string;
  aiMessage?: string;
  response?: string;
};

const API_BASE_URL = "http://localhost:3000";
const SESSION_STORAGE_KEY = "chat_sessionId";

function normalizeHistory(data: HistoryResponse): Message[] {
  const rawMessages = Array.isArray(data) ? data : data.messages ?? [];

  return rawMessages.map((item, index) => ({
    id: item.id ?? `${item.sender}-${index}-${item.createdAt ?? "message"}`,
    text: item.content ?? item.message ?? item.text ?? "",
    sender: item.sender,
    createdAt: item.createdAt,
  }));
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSessionId) {
      return;
    }

    setSessionId(storedSessionId);

    const loadHistory = async () => {
      try {
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/chat/history/${storedSessionId}`
        );

        if (!response.ok) {
          throw new Error("Unable to load chat history.");
        }

        const data = (await response.json()) as HistoryResponse;
        setMessages(normalizeHistory(data));
      } catch (err) {
        console.error(err);
        setError("We couldn't restore your previous chat. You can start a new one.");
      }
    };

    void loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const optimisticMessage: Message = {
      id: `user-${Date.now()}`,
      text: trimmed,
      sender: "user",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to send message.");
      }

      const data = (await response.json()) as ChatResponse;
      const nextSessionId = data.sessionId ?? sessionId;

      if (nextSessionId) {
        setSessionId(nextSessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
      }

      const replyText =
        data.reply ?? data.message ?? data.aiMessage ?? data.response;

      if (!replyText) {
        throw new Error("The server returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          text: replyText,
          sender: "ai",
        },
      ]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while contacting support. Please try again.");

      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticMessage.id)
      );
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <div className="app-shell">
      <div className="chat-widget">
        <div className="chat-header">
          <div>
            <h1>Customer Support</h1>
            <p>Ask about shipping, returns, or your order.</p>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="chat-body">
          {messages.length === 0 ? (
            <div className="empty-state">
              Start the conversation and our assistant will reply here.
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${
                message.sender === "user" ? "user-row" : "ai-row"
              }`}
            >
              <div
                className={`message-bubble ${
                  message.sender === "user" ? "user-bubble" : "ai-bubble"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="message-row ai-row">
              <div className="message-bubble ai-bubble typing-indicator">
                Support assistant is typing...
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={2}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;