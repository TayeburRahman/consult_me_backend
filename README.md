# Consult Me Backend

This is the backend service for the **Consult Me** application. It provides a RESTful API and WebSocket endpoints for real-time communication.

## Tech Stack
- **Node.js** with **Express.js**
- **TypeScript**
- **MongoDB** with **Mongoose**
- **Socket.io** (WebSockets)
- **AWS S3** & **Cloudinary** (File storage)
- **Stripe** (Payments)
- **LiveKit** (Audio/Video calls)

## Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance
- Environment variables configured (see `.env.example` or set them up based on the usage)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the app

### Development
To start the application in development mode with auto-reload:
```bash
npm run dev
```

### Production
To build the TypeScript code and start the server:
```bash
npm run build
npm start
```

## Project Structure
- `src/controllers/` - Request handlers
- `src/middleware/` - Express middlewares
- `src/routes/` - API route definitions
- `src/services/` - Business logic and external service integrations
- `src/utils/` - Utility functions
- `src/db.ts` - Database connection setup
- `src/schema.ts` - Mongoose models
- `src/index.ts` - Application entry point

## License
ISC
