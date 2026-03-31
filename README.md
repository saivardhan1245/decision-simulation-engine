<div align="center">


# 🚀 Starters Path
### *Master the art of the pivot. Navigate the chaos. Build your empire.*

**Starters Path** is an AI-powered social entrepreneurship simulator designed to take students and aspiring founders from a raw idea to a field-ready prototype. By blending solo AI-driven simulations with real-time multiplayer negotiations, it provides a safe yet challenging environment to master the complexities of building a startup.

</div>

---

## 🕹️ Game Modes

### 👤 Solo Mode: The Simulation Quest
Embark on a narrative-driven journey where every choice impacts your startup’s trajectory.
- **Dynamic AI Scenarios**: Powered by **Google Gemini**, the game generates unique decision points based on your startup's stage and performance.
- **Real-Time Feedback**: Multi-stakeholder reactions (Customers, Investors, Team) provide instant insight into your decisions.
- **What-If Analysis**: Explore "Alternative Realities" to see how different choices would have changed your metrics.
- **Executive Reporting**: Receive a comprehensive AI-generated roadmap, strengths/weaknesses analyze, and project scores at the end of every journey.

### 👥 Multiplayer Mode: The Negotiation Arena
Step into a high-stakes negotiation lobby where roles matter.
- **Real-Time Synergy**: Roles include **Founders**, **Customers**, and **Investors**.
- **Live Deal-Making**: Negotiate terms, finalize deals, and manage sessions through a robust **Socket.io** backend.
- **AI Evaluation**: Every session is evaluated by a multi-provider AI engine (Groq, OpenAI, or Gemini) to provide neutral, high-quality session reports.

### 📋 Volunteer Dashboard: Real-Life Validation
Bridge the gap between digital simulation and the physical world.
- **Submit for Testing**: Directly upload your simulation results for field validation.
- **Community Hub**: A dashboard where volunteers can accept "Active Quests" to test prototypes (Hardware, Software, or Service Design) in real-life scenarios.
- **Localized Impact**: Track testing progress and community trust metrics.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) for modern, responsive layouts.
- **Animations**: [Motion (Framer Motion)](https://motion.dev/) for smooth UI transitions and micro-animations.
- **Icons**: [Lucide React](https://lucide.dev/) for sleek, consistent iconography.

### **Backend**
- **Runtime**: [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **API**: [Express](https://expressjs.com/)
- **Real-Time**: [Socket.io](https://socket.io/) for low-latency multiplayer communication.

### **AI Engine**
- **Primary (Solo)**: [Google Gemini API](https://ai.google.dev/)
- **Multi-Provider (Multiplayer/Evaluation)**:
  - [Groq SDK](https://groq.com/) (Fastest performance)
  - [OpenAI API](https://openai.com/) (Reliable fallback)
  - [Gemini SDK](https://ai.google.dev/) (Robust fallback)

---

## 🚀 Getting Started

### **Prerequisites**
- [Node.js](https://nodejs.org/) (LTS version recommended)
- API Keys for **Gemini**, **OpenAI**, or **Groq**.

### **Setup**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bhuvncodes/hiaime.git](https://github.com/saivardhan1245/decision-simulation-engine.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   VITE_GEMINI_API_KEY=your_gemini_key
   GEMINI_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   GROQ_API_KEY=your_groq_key
   ```

4. **Run Locally:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

---

## 📜 License
This project is for educational and simulation purposes. Built with ❤️ for the startup community.
