# AdPilot 🚀

AdPilot is a SaaS-style advertising management platform that helps teams manage campaigns, automation rules, SEO audits, analytics, and integrations in one centralized dashboard.

## 🧱 Tech Stack

Frontend:
- React
- Vite
- Modern UI dashboard design

Backend:
- Node.js
- Express
- Prisma ORM
- PostgreSQL

## 🔐 Authentication

- Role-based access (Admin / Manager)
- Secure password hashing (bcrypt)
- Team-based architecture

## 📊 Core Features

- Campaign Management
- Dashboard Overview
- Advanced Analytics
- SEO Intelligence (Audit Queue System)
- Automation Rules Engine (Phase 3)
- Integration Hub (Meta / Google / Slack - UI Ready)
- Team Management

## 🗂 Architecture

- Modular route-controller-service structure
- Prisma schema-based database modeling
- Seeded demo data
- Environment-based configuration

## ⚙ Setup Instructions

1. Clone the repository:

git clone <your-repo-url>

2. Install dependencies:

npm install

3. Setup environment variables:

Create .env file and configure:

DATABASE_URL=
JWT_SECRET=
PORT=3000

4. Run migrations:

npx prisma migrate dev

5. Seed database:

node seed.js

6. Start backend:

npm run dev

7. Start frontend:

cd client
npm install
npm run dev

## 🧪 Demo Credentials

Admin:
admin@adpilot.com
password123

Manager:
manager@adpilot.com
password123

## 📈 Roadmap

Phase 3:
- Background workers
- SEO processing engine
- Automation execution logic

Phase 4:
- AI Studio
- Research Hub
- Real integration sync engine

---

Built as a scalable SaaS MVP architecture.
