# XIPE Frontend

Next.js React frontend for the XIPE (Cross Impact Performance Emissions) model.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set the API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Run development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with AppProvider
│   ├── page.tsx           # Home/Introduction page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── layout/           # Layout components (Sidebar, etc.)
│   ├── tables/           # Table components
│   ├── charts/           # Chart components
│   └── forms/            # Form components
├── lib/                  # Utilities and API
│   ├── api/              # API client functions
│   └── types.ts          # TypeScript types
├── context/              # React Context
│   └── AppContext.tsx    # Global state management
└── hooks/                # Custom React hooks
```

## Features

- **TypeScript** for type safety
- **Tailwind CSS** for styling (dark theme)
- **React Context** for state management
- **Axios** for API calls
- **React Hook Form** + **Zod** for form validation
- **Recharts** for data visualization

## Development

- Run `npm run dev` to start development server
- Run `npm run build` to build for production
- Run `npm run lint` to check code quality

## API Integration

The frontend connects to the FastAPI backend. Make sure the backend is running on `http://localhost:8000` (or update `.env.local`).
