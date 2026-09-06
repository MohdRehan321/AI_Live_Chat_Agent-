# AI Customer Support Agent

A full-stack, AI-powered customer support chat widget. This application provides real-time, domain-specific support for an e-commerce platform, featuring optimistic UI updates, conversational memory, and robust error handling.

## 🌐 Live Demo & Deployment

* **Frontend (Vercel):** [https://ai-live-chat-agent-g9kr.vercel.app/]
* **Backend (Render):** [https://ai-live-chat-agent-imth.onrender.com]
* **Note:** *The Render backend utilizes a free-tier instance, which spins down after periods of inactivity. The very first message sent may take up to 30-50 seconds to receive a reply while the server cold-starts.*

## 🏗 Architecture Overview

The project follows a decoupled client-server architecture:
* **Frontend:** React (Vite) with strict TypeScript typing. Utilizes persistent `localStorage` for session management and implements optimistic UI updates for zero-latency perceived message delivery.
* **Backend:** Node.js / Express server acting as an orchestration layer.
* **Database:** SQLite managed via Prisma ORM for type-safe relational data modeling.
* **AI Integration:** OpenAI SDK configured to route through Groq's high-speed inference engine for low-latency responses, constrained by a strict system prompt.

## 🚀 Running Locally

### Prerequisites
* Node.js (v24+)
* Groq API Key

### 1. Backend Setup
Navigate to the backend directory and configure the environment:
\`\`\`bash
cd backend
npm install
\`\`\`

Create a `.env` file in the `backend` directory:
\`\`\`env
GROQ_API_KEY="your_groq_api_key"
DATABASE_URL="file:./dev.db"
PORT=3000
\`\`\`

Initialize the database and start the server:
\`\`\`bash
npx prisma db push
npx prisma generate
npm run dev
\`\`\`

### 2. Frontend Setup
In a new terminal, navigate to the frontend directory:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
The chat widget will be available at `http://localhost:5173`.

## 🧠 LLM Strategy & Prompt Engineering

The AI is powered by the `openai/gpt-oss-20b` model via Groq, chosen for its fast inference capabilities. 
* **Context Window:** The backend fetches the 10 most recent messages of a given session ID to maintain conversational memory without overloading the context window or spiking token costs.
* **System Prompting:** The model is bounded by a strict system prompt instructing it to adhere strictly to the fictional store's shipping (3-5 days), returns (30 days), and operating hours (9am-5pm EST). It is explicitly instructed to gracefully deflect non-support queries.

## ⚖️ Trade-offs & Production Roadmap

Given more time, I would implement the following upgrades to prepare this architecture for a production environment:

1. **Database Migration:** Swap SQLite for PostgreSQL (e.g., Supabase or AWS RDS). SQLite is excellent for local development, but concurrent writes in a highly trafficked support environment require a dedicated relational database.
2. **Rate Limiting:** Implement Redis-based rate limiting (e.g., `express-rate-limit`) on the `/chat/message` route to prevent API abuse and protect LLM billing quotas.
3. **Real-Time Streaming:** Migrate the standard REST POST request to Server-Sent Events (SSE) or WebSockets to stream the LLM response chunk-by-chunk, reducing perceived latency for the end user.
4. **Resiliency:** The app currently handles upstream API failures by catching the error and serving a graceful fallback message to the UI. For production, I would add automatic retry logic with exponential backoff for transient network failures.
