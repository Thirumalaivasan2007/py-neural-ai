# Nexora AI Full-Stack Application

Welcome to Nexora AI! This is a complete full-stack web application featuring user authentication, conversation persistence, and real-time AI responses using Node.js, Express, MongoDB, and React with TailwindCSS.

## Project Structure
```
c:\project ai\
│
├── backend/            # Express.js REST API
│   ├── config/         # Database configuration
│   ├── controllers/    # Route controllers (auth & chat)
│   ├── middleware/     # JWT Protection logic
│   ├── models/         # Mongoose DB Schemas
│   ├── routes/         # Express endpoint configurations
│   ├── server.js       # Main server entrypoint
│   └── package.json    # Backend dependencies
│
├── frontend/           # React + Vite Client
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── context/    # React Context (Auth)
│   │   ├── pages/      # Login, Register, Dashboard views
│   │   ├── services/   # Axios API integrations
│   │   ├── App.jsx     # App configuration
│   │   └── index.css   # Main Tailwind stylesheet
│   └── package.json    # Frontend dependencies
```

## Setup Instructions

**Prerequisites:** Ensure you have Node.js and MongoDB installed on your system.
Your MongoDB URI defaults to `mongodb://127.0.0.1:27017/nexora`. Ensure MongoDB is running.

### 1. Setup Backend
1. Open up a terminal / command prompt.
2. Navigate to the `backend` directory:
   `cd backend`
3. Install dependencies:
   `npm install`
4. Start the backend development server:
   `npm run dev` or `npm start`
*(The backend server will run on http://localhost:5000)*

### 2. Setup Frontend
1. Open up a separate terminal.
2. Navigate to the `frontend` directory:
   `cd frontend`
3. Install dependencies:
   `npm install`
4. Start the frontend development server:
   `npm run dev`
*(The frontend application will be hosted on http://localhost:3000 or the next available port)*

## Features working in this app:
1. **User Authentication:** Sign up, Sign in with encrypted sessions.
2. **Protected Routes:** Unauthorized users are redirected to login.
3. **Chat AI Interface:** Ask questions through the interactive interface.
4. **History Tracking:** Conversations stick to your account.
5. **Aesthetic UI:** A carefully curated slate/teal dark theme powered by Tailwind with modern fluid animations.

