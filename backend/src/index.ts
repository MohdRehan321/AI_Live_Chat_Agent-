import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateReply } from "./llm";
import { PrismaClient } from "@prisma/client";


const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTE 1: Fetch Chat History ---
app.get("/chat/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sender: true,
        content: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Failed to fetch history", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- ROUTE 2: Handle New Messages ---
app.post("/chat/message", async (req, res) => {
  const { message, sessionId } = req.body as {
    message?: unknown;
    sessionId?: unknown;
  };

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Validation failed, message must be a non-empty string" });
  }

  // Allow undefined or null for new chats, but reject other invalid types
  if (sessionId !== undefined && sessionId !== null && typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId must be a string" });
  }

  const trimmedMessage = message.trim();

  try {
    let conversation = null;

    // 1. Try to find the existing conversation
    if (sessionId && typeof sessionId === "string") {
      conversation = await prisma.conversation.findUnique({ where: { id: sessionId } });
    }

    // 2. If no session was provided, OR the database was wiped and it wasn't found, create a new one
    if (!conversation) {
      conversation = await prisma.conversation.create({ data: {} });
    }

    // 1. Save User Message
    await prisma.message.create({
      data: {
        content: trimmedMessage,
        sender: "user", 
        conversationId: conversation.id,
      },
    });

    // 2. Fetch History for LLM
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const messagesForLlm = recentMessages.reverse();

    // 3. Call LLM
    const aiReply = await generateReply(messagesForLlm as any);

    // 4. Save AI Message
    await prisma.message.create({
      data: {
        content: aiReply,
        sender: "ai", 
        conversationId: conversation.id,
      },
    });

    // 5. Final Return
    return res.status(200).json({
      reply: aiReply,
      sessionId: conversation.id,
    });

  } catch (error) {
    console.error("Failed to process chat message", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});