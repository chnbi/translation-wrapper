# Translation Wrapper for Content Handover

A centralized platform designed to streamline the multilingual content handover process between marketing and development teams for the Yes website.

## Features

- **Multi-source Content Ingestion**: Upload text and images
- **OCR Processing**: Extract text from visual assets using Google Cloud Vision
- **AI-Assisted Translation**: Automated translation using Google Gemini API
- **Dynamic Glossary System**: Enforce brand terminology consistency
- **Review Dashboard**: Side-by-side review and approval workflow
- **Structured Export**: Generate Excel/JSON files for WPML import

## Tech Stack

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Zustand for state management
- React Query for data fetching
- Lucide React for icons

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- Google Cloud Vision API (OCR)
- Google Gemini API (Translation)
- ExcelJS for export generation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Google Cloud Platform account
- Google Gemini API key

### Installation

1. **Clone and install dependencies:**

```bash
cd translation-wrapper
npm run install:all
```

2. **Configure environment variables:**

Create `.env` files in both backend and frontend directories:

**Backend `.env`:**
```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/translation-wrapper
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
GCP_PROJECT_ID=your_gcp_project_id
JWT_SECRET=your_jwt_secret
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3000/api
```

3. **Start the application:**

```bash
# Development mode (runs both frontend and backend)
npm run dev

# Production mode
npm run build
npm start
```

4. **Access the application:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## Project Structure

```
translation-wrapper/
├── frontend/          # React frontend application
├── backend/           # Express backend API
├── shared/            # Shared utilities and types
└── docs/              # Documentation
```

## Usage

1. **Create a Project**: Start by creating a new translation project
2. **Upload Content**: Upload text or images (PNG, JPG)
3. **Review OCR**: If images uploaded, review and edit extracted text
4. **Generate Translations**: AI generates initial translations using glossary
5. **Review & Approve**: Review translations side-by-side with source
6. **Export**: Download Excel file for WPML import

## API Endpoints

See [API Documentation](./docs/API.md) for detailed endpoint information.

## Development

```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Run tests
npm test

# Lint code
npm run lint
```

## Deployment

See [Deployment Guide](./docs/DEPLOYMENT.md) for production deployment instructions.
