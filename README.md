# 🌍 TripGenie - AI-Powered Multi-Agent Travel Planner

TripGenie is an intelligent AI travel planning platform that generates personalized travel itineraries using a **multi-agent LLM architecture**, real-time APIs, and modern full-stack technologies.

The system combines specialized AI agents for destination research, itinerary generation, budget planning, logistics, and travel recommendations to create customized travel experiences.

---

## ✨ Features

### 🤖 Multi-Agent AI System
- AI agents specialized for:
  - Destination research
  - Itinerary generation
  - Budget planning
  - Hotel and restaurant recommendations
  - Transportation and logistics planning
  - Travel preference analysis

### 🧠 LLM-Powered Planning
- Uses multiple LLM providers:
  - Claude Sonnet
  - Groq Models
  - Mistral AI
- Intelligent prompt engineering and agent coordination for high-quality travel plans.

### 📍 Real-Time Travel Information
- Google Places integration for:
  - Hotels
  - Restaurants
  - Tourist attractions
  - Place images and ratings
- Weather forecasting integration
- Web search capabilities for up-to-date travel information.

### 💰 Smart Budget Management
- Automatic budget estimation.
- Category-wise expense breakdown.
- Interactive budget visualization.

### 🌐 Modern Full-Stack Web Application
- Responsive React-based frontend.
- Interactive itinerary timeline.
- Dynamic loading states showing AI agent progress.
- Trip saving and history management.
- Mobile-friendly UI.

### 🔐 Authentication & Security
- User signup and login.
- JWT-based authentication.
- Secure password hashing using bcrypt.

---

# 🏗️ System Architecture

```
                         User
                           |
                           ▼
                  React Frontend
                           |
                           ▼
                    FastAPI Backend
                           |
          --------------------------------
          |              |               |
          ▼              ▼               ▼
    Multi-Agent      MongoDB        External APIs
      System                           |
          |                             |
  ------------------                    |
  |        |       |                    |
  ▼        ▼       ▼                    ▼
Research  Budget  Planner      Google Places API
 Agent    Agent    Agent        Weather API
                                  Web Search
```

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Framer Motion
- Axios
- Recharts

### Backend
- FastAPI
- Python
- Uvicorn
- Pydantic

### AI & LLM
- LangChain
- Claude Sonnet
- Groq
- Mistral AI
- Multi-Agent Architecture

### Database
- MongoDB
- Motor (Async MongoDB Driver)

### Authentication & Security
- JWT Authentication
- bcrypt
- python-jose
- Passlib

### External APIs
- Google Places API
- Weather API
- Web Search APIs

---

## 📸 Screenshots

Add screenshots of:
- Landing page
- Trip planning interface
- AI agent progress
- Generated itinerary
- Budget analytics dashboard

---

## 🚀 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/TripGenie.git
cd TripGenie
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate environment

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate


# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

### 3. Environment Variables

Create `.env` file:

```env
MONGODB_URL=your_mongodb_url

OPENAI_API_KEY=your_api_key
GROQ_API_KEY=your_groq_api_key
MISTRAL_API_KEY=your_mistral_api_key

GOOGLE_PLACES_API_KEY=your_google_places_key

WEATHER_API_KEY=your_weather_api_key

JWT_SECRET_KEY=your_secret_key
```

### 4. Start Backend

```bash
uvicorn app.main:app --reload
```

### 5. Frontend Setup

```bash
cd frontend

npm install

npm start
```

---

## 📂 Project Structure

```
TripGenie/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── services/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── core/
│
├── README.md
└── requirements.txt
```

---

## 🎯 Future Improvements

- RAG-based travel knowledge retrieval.
- Voice-based AI travel assistant.
- Flight and train booking integration.
- Multi-language support.
- AI-based cost optimization.
- Real-time collaboration for group trips.

---

## 👨‍💻 Author

**Kunal Upadhyay**

GitHub: https://github.com/Kunal2028

---

## ⭐ If you found this project useful, consider giving it a star!
