# 📄 SharyX OCR — AI Document Intelligence & Summarization Platform

[![Live App](https://img.shields.io/badge/Live_Demo-sharyxocr.vercel.app-blue?style=for-the-badge&logo=vercel)](https://sharyxocr.vercel.app)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://sharyxocr.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![React](https://img.shields.io/badge/React_19-Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)

**SharyX OCR** is an enterprise-grade AI document intelligence platform that extracts text, analyzes structured data, summarizes complex files, performs banking analytics, and generates interactive presentations from raw documents (PDF, Word, Excel, scanned images, and more).

---

## 🚀 Key Features

- **📑 Multi-Format Document OCR & Ingestion**: Extract clean text and tables from PDFs, DOCX, XLSX, Scanned Invoices, and Images using Tesseract OCR and intelligent parsers.
- **🤖 Multi-LLM Intelligence**: Powered by OpenAI (GPT-4o), Anthropic Claude, Google Gemini, Groq, and Cohere for summarization and insights.
- **📊 Table & Data Extraction**: Detect and reconstruct tables into structured formats with one-click export to CSV, Excel, or PDF.
- **🏦 Banking & Financial Statement Analytics**: Specialized analytics engine for bank statements, profit & loss reports, ledger sheets, and categorization.
- **🎨 AI Presentation Generator**: Transform reports and document findings directly into structured, professional PowerPoint (`.pptx`) slide decks.
- **💬 Interactive Document Chat**: Ask questions directly to your uploaded documents with source-grounded responses.
- **🔐 Authentication & Access Control**: Secure login with Google OAuth 2.0 and session management.
- **💳 Tiered Billing & Usage Quotas**: Integrated subscription and token tracking powered by Cashfree.

---

## 🏗️ Repository Architecture (Monorepo)

```text
SharyX-OCR/
├── frontend/             # React 19 + Vite + TailwindCSS (Deployed on Vercel)
│   ├── src/
│   │   ├── components/   # UI components, dashboard cards, viewers
│   │   ├── pages/        # Dashboard, Banking, Presentations, History, Pricing
│   │   ├── services/     # API connectors & utilities
│   │   └── context/      # Auth & notification state providers
│   ├── package.json
│   └── vite.config.js
├── backend/              # Node.js + Express + MongoDB (Deployed on Render)
│   ├── controllers/      # Summarization, Banking, Presentation, Tables
│   ├── services/         # OCR, Gemini, Claude, Groq, PPTX generation pipelines
│   ├── models/           # Mongoose schemas (Users, Documents, Presentations)
│   ├── routes/           # REST API endpoints
│   ├── server.js         # Express server entry point
│   └── package.json
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: TailwindCSS, Framer Motion
- **Visuals & Charts**: Recharts, Lucide Icons
- **Document Viewers**: React-PDF, jsPDF, Mammoth, SheetJS (XLSX)

### Backend
- **Runtime & API**: Node.js, Express.js
- **Database**: MongoDB with Mongoose & connect-mongo
- **AI / LLMs**: OpenAI, Anthropic, Cohere, Groq, Google Generative AI
- **OCR & Media**: Tesseract.js, Sharp, PDF-Poppler, PptxGenJS
- **Payments & Auth**: Cashfree PG, Passport.js (Google OAuth)

---

## ⚙️ Getting Started Locally

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or MongoDB Atlas URI
- Git

### 1. Clone the repository
```bash
git clone https://github.com/Logeshwaran-117/SharyX-OCR.git
cd SharyX-OCR
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
CLIENT_URL=http://localhost:5173

# AI Keys (provide active keys)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Run backend in development mode:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` (or `.env.local`) file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000
```

Run frontend in development mode:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Deployment Configuration

| Service | Platform | Root Directory | Build Command | Start Command |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | `frontend` | `npm run build` | *Automatic (Vite)* |
| **Backend** | [Render](https://render.com) | `backend` | `npm install` | `node server.js` |

---

## 📄 License
This project is licensed under the ISC License.
