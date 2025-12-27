# 🥦 SabziMATE - Your Daily Fresh Vegetable Partner

![SabziMATE Banner](https://img.shields.io/badge/SabziMATE-Hyperlocal%20AI%20Delivery-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Full%20Stack-blue)
![PWA](https://img.shields.io/badge/PWA-Installable-orange)
![AI Powered](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-purple)

**Revolutionizing vegetable delivery with AI-powered hyperlocal logistics.** SabziMATE bridges the gap between local vegetable vendors and households through intelligent routing, voice-ordering, and real-time tracking.

## 🌟 Why SabziMATE?

Traditional vegetable delivery apps follow the "always available" model. **SabziMATE flips this** with our unique **"Will you buy today?"** approach. Customers confirm daily availability, creating a heatmap that helps drivers optimize routes and reduce waste.

### 🎯 The Problem We Solve
- **For Customers:** Inconsistent vegetable quality, unpredictable delivery times, no real-time tracking
- **For Vendors:** Route inefficiency, inventory wastage, cash handling issues
- **For Local Economy:** Middlemen taking large margins, lack of digital presence for local vendors

## 🚀 Live Demo

| Portal | Demo Link | Test Credentials |
|--------|-----------|------------------|
| 👤 **Customer App** | https://sabjimate.vercel.app/ | `phone: Use your mobile number` / `otp: Get otp in browser` |
| 🚚 **Driver Portal** | https://sabjimate.vercel.app/driver | `phone: Create driver from admin` / `password: ` |
| 🛡️ **Admin Dashboard** | https://sabjimate.vercel.app/admin | `phone: 1111111111` / `password: 123456` |


## 📱 Key Features

### 🛒 **Customer Experience**
| Feature | Description | Tech Used |
|---------|-------------|-----------|
| 🎤 **Voice-to-Order AI** | Speak orders in Hindi/English ("Aloo 1kg, Tamatar 500g") | Google Gemini, Web Audio API |
| 🗺️ **Live Truck Tracking** | Real-time location with ETA on interactive maps | WebSockets, Leaflet, Redis Geospatial |
| 👨‍🍳 **RasoiMATE Chatbot** | AI chef suggests recipes based on your cart | Gemini 2.5 Flash, Context-aware prompts |
| ⚡ **Urgent Orders** | 90-minute delivery via 3rd party logistics | Razorpay, Web Push |
| 📱 **PWA Offline Mode** | Installable app with offline wishlist building | Service Workers, IndexedDB |

### 🚚 **Driver Empowerment**
| Feature | Description | Tech Used |
|---------|-------------|-----------|
| 🧭 **Smart Route Optimization** | Heatmap visualization of confirmed customers | Leaflet Routing Machine, PostgreSQL GIS |
| 📍 **Live Location Broadcast** | Real-time GPS streaming to customers | WebSockets, Redis Pub/Sub |
| 📴 **Offline Sales Recording** | Continue sales without internet | IndexedDB, Background Sync API |
| 🔐 **Secure OTP Access** | One-time password for customer profile access | Speakeasy, Twilio SMS |
| 💰 **Digital Payments** | Cashless transactions with instant settlement | Razorpay, Webhook verification |

### 🛡️ **Admin Intelligence**
| Feature | Description | Tech Used |
|---------|-------------|-----------|
| 📊 **AI Business Analytics** | Revenue forecasting & churn prediction | Gemini Analytics, Recharts |
| 🎯 **Dynamic Pricing Engine** | Zone-based pricing with AI suggestions | PostgreSQL, Custom algorithms |
| 📢 **Broadcast Notifications** | Targeted push notifications to user segments | Web Push, VAPID |
| 🚛 **Command Center** | Live view of all active trucks and orders | WebSockets, Dashboard UI |
| 📦 **Inventory Management** | AI-powered stock prediction and ordering | Prisma, Cron jobs |

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Frontend (Vite + React)"
        C[Customer PWA]
        D[Driver Portal]
        A[Admin Dashboard]
    end
    
    subgraph "Backend (Node.js + Express)"
        API[Express API Server]
        WS[WebSocket Server]
        AI[AI Service Layer]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Cache[(Redis)]
        FS[File Storage]
    end
    
    subgraph "External Services"
        GEM[Google Gemini AI]
        PAY[Razorpay]
        SMS[Twilio]
        MAP[Google Maps]
    end
    
    C --> API
    D --> API
    A --> API
    D --> WS
    WS --> C
    
    API --> DB
    API --> Cache
    WS --> Cache
    
    AI --> GEM
    API --> PAY
    API --> SMS
    AI --> MAP
```

## 🛠️ Tech Stack

### **Frontend (Monorepo)**
- **Framework:** React 19 + Vite (Build Tool)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + PostCSS
- **State Management:** Zustand (with persistence)
- **Maps:** Leaflet + OpenStreetMap
- **PWA:** Service Workers, Web Push, Manifest
- **Charts:** Recharts
- **Testing:** Vitest + Cypress

### **Backend**
- **Runtime:** Node.js 20+
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL (via vercel)
- **ORM:** Prisma
- **Caching:** Redis (IORedis)
- **Real-time:** WebSockets (ws library)
- **Authentication:** JWT, Passport.js, OAuth 2.0

### **AI & Third-Party**
- **AI Model:** Google Gemini 2.5 Flash
- **Payments:** Razorpay
- **SMS:** Twilio
- **Email:** Resend
- **Storage:** Cloudflare R2

## 🧠 AI Integration Deep Dive

### **1. Audio Order Parsing Pipeline**
```javascript
// Example flow: Hindi audio → Structured JSON
Input: "Do kilo aloo aur aadha kilo tamatar de dena"
Process: Audio → Transcription → NER → Standardization
Output: { items: [{name: "Potato", quantity: "2kg"}, {name: "Tomato", quantity: "500g"}] }
```

### **2. RasoiMATE Recipe Engine**
```python
# Context-aware recipe generation
Context: User has [Potato, Tomato, Onion, Spices]
Dietary: Vegetarian, No garlic
Cuisine: North Indian
Output: 3 recipe suggestions with cooking time, difficulty, and nutrition info
```

### **3. Predictive Analytics**
- **Revenue Forecasting:** LSTM-based weekly predictions
- **Churn Detection:** Identify lapsing customers
- **Inventory Optimization:** AI suggests stock levels per zone

## 📁 Project Structure

```
sabzimate-monorepo/
├── packages/
│   ├── client/                 # Customer PWA (Port 3000)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── maps/           # Leaflet map components
│   │   │   ├── voice/          # Voice recording UI
│   │   │   ├── cart/           # Shopping cart components
│   │   │   └── recipes/        # Recipe chatbot UI
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand state stores
│   │   ├── utils/              # Helper functions
│   │   └── service-worker/     # PWA offline logic
│   │
│   ├── driver/                 # Driver Portal (Port 3001)
│   │   ├── components/
│   │   │   ├── route-map/      # Interactive route planner
│   │   │   ├── offline-sales/  # Offline sales interface
│   │   │   └── navigation/     # Driver navigation
│   │   └── db/                 # IndexedDB schemas
│   │
│   ├── admin/                  # Admin Dashboard (Port 3002)
│   │   ├── components/
│   │   │   ├── analytics/      # Data visualization
│   │   │   ├── inventory/      # Stock management
│   │   │   └── users/          # User management
│   │   └── hooks/              # Admin-specific hooks
│   │
│   ├── common/                 # Shared code
│   │   ├── types/              # TypeScript definitions
│   │   ├── constants/          # App constants
│   │   ├── api/                # API client wrappers
│   │   └── utils/              # Shared utilities
│   │
│   └── server/                 # Backend API (Port 3003)
│       ├── src/
│       │   ├── routes/         # REST API endpoints
│       │   │   ├── auth/       # Authentication routes
│       │   │   ├── ai/         # AI processing endpoints
│       │   │   ├── orders/     # Order management
│       │   │   └── admin/      # Admin-only endpoints
│       │   ├── services/       # Business logic
│       │   │   ├── gemini/     # AI service wrapper
│       │   │   ├── payment/    # Payment processing
│       │   │   └── notification/ # Push/SMS services
│       │   ├── middleware/     # Custom middleware
│       │   ├── prisma/         # Database schema & migrations
│       │   ├── websocket/      # Real-time communication
│       │   └── utils/          # Server utilities
│       └── tests/              # API tests
│
├── public/                     # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── service-worker.js       # Service worker
│   └── icons/                  # App icons
│
├── index.html                  # Customer app entry
├── driver.html                 # Driver portal entry
├── admin.html                  # Admin dashboard entry
└── vercel.json                 # Deployment configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 15+
- Redis 7+
- Google Gemini API key
- Twilio account (for SMS)

### Local Development Setup

1. **Clone the repository**
```bash
git https://github.com/HarshSharma20050924/SabjiMate.git
cd sabzimate
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Database setup**
```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

5. **Generate VAPID keys for push notifications**
```bash
npm run generate-keys
```

6. **Start development servers**
```bash
# Start all services (API + Frontends)
npm run dev

# Or run individually
npm run dev:client    # Customer app
npm run dev:driver    # Driver portal
npm run dev:admin     # Admin dashboard
npm run dev:server    # Backend API
```

7. **Access the applications**
- Customer App: http://localhost:3000
- Driver Portal: http://localhost:3001
- Admin Dashboard: http://localhost:3002
- API Server: http://localhost:3003

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# ========================
# SERVER CONFIGURATION
# ========================
PORT=3003
NODE_ENV=development
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002

# ========================
# DATABASE
# ========================
DATABASE_URL="postgresql://user:password@localhost:5432/sabzimate?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/sabzimate"
REDIS_URL="redis://localhost:6379"

# ========================
# SECURITY & AUTHENTICATION
# ========================
ACCESS_TOKEN_SECRET="your-access-token-secret-min-32-chars"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-min-32-chars"
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# ========================
# GOOGLE AI (GEMINI)
# ========================
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-2.0-flash-exp"

# ========================
# PAYMENT GATEWAY
# ========================
RAZORPAY_KEY_ID="rzp_test_xxxx"
RAZORPAY_KEY_SECRET="xxxx"
RAZORPAY_WEBHOOK_SECRET="xxxx"

# ========================
# SMS SERVICE (TWILIO)
# ========================
TWILIO_ACCOUNT_SID="ACxxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_PHONE_NUMBER="+1234567890"
FORCE_DEV_OTP=true  # Logs OTP to console instead of sending SMS

# ========================
# PUSH NOTIFICATIONS
# ========================
VAPID_PUBLIC_KEY="BPxxxx"
VAPID_PRIVATE_KEY="xxxx"
VAPID_CONTACT_EMAIL="admin@sabzimate.com"

# ========================
# DEFAULT ADMIN ACCOUNT
# ========================
DEFAULT_ADMIN_PHONE="9876543210"
DEFAULT_ADMIN_PASSWORD="ChangeMe123!"
DEFAULT_ADMIN_NAME="System Administrator"

# ========================
# GOOGLE OAUTH (Optional)
# ========================
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxx"
GOOGLE_CALLBACK_URL="http://localhost:3003/auth/google/callback"
```

## 📦 Deployment

### Option 1: Vercel (Frontend) + Render (Backend)
```bash
# Frontend deployment to Vercel
vercel --prod

# Backend deployment to Render
# Connect GitHub repo and set build command:
npm install && npm run build --prefix packages/server
```

### Option 2: Docker Deployment
```dockerfile
# Build all services
docker-compose up --build

# Or deploy individually
docker build -t sabzimate-server ./packages/server
docker build -t sabzimate-client ./packages/client
```

### Option 3: Manual Deployment
```bash
# Build all packages
npm run build

# Start production server
npm run start
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests with Cypress
npm run cypress:open

# Test specific package
npm run test:client
npm run test:server
npm run test:driver
```

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```
3. **Commit your changes**
```bash
git commit -m 'Add some amazing feature'
```
4. **Push to the branch**
```bash
git push origin feature/amazing-feature
```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Update documentation accordingly
- Use conventional commits
- Keep PRs focused and small

## 📄 License

This project is licensed under the [AGPL-3.0 License](https://github.com/HarshSharma20050924/SabjiMate/blob/main/LICENSE) - see the LICENSE file for details.


## 👥 Team

- **Product Lead:** Harsh Sharma
- **Tech Lead:** Harsh Sharma
- **AI/ML Engineer:** Harsh Sharma
- **Frontend Developers:** Harsh Sharma
- **Backend Developers:** Harsh Sharma

## 🙏 Acknowledgments

- Google Gemini API team for AI capabilities
- OpenStreetMap for mapping data
- Vercel & Render for hosting support
- All our beta testers and early adopters

## 📞 Support

For support, email harsh20050924@gmail.com

---

**Built with ❤️ for fresh vegetables everywhere.** 

*"From farm to kitchen, intelligently delivered."*

<p align="center">
  <a href="https://sabjimate.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/HarshSharma20050924/SabjiMate/main/logo.svg" alt="SabziMATE Demo" width="400"/>
  </a>
</p>
<p align="center"><em>Click on the image for the live demo</em></p>


