# 💊 Medicine Billing Application – Backend

## 📌 Project Overview
This is a **Node.js + TypeScript backend** for a Medicine / Medical Store Billing Application.  
The backend handles **authentication, product management, company management, billing, and file uploads**.

---

## 🛠️ Tech Stack
- Node.js
- TypeScript
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Multer (File Upload)
- Winston Logger

---

## 🚀 How to Run the Project

### 1️⃣ Install Dependencies
```bash
npm install
npm run build
npm start
npm run dev

🔐 Authentication Flow

User Register / Login

JWT Token is generated

Client sends token in header:

Authorization: Bearer <token>

Auth middleware verifies token

5Access to protected routes
