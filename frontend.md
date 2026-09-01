# Frontend Architecture & Setup Guide

This document outlines the standard folder structure and steps to recreate the `frontend` directory from scratch for CONCURIS.

## 1. Create a Fresh Next.js App
Run the following command in the `ShareIITK` folder to initialize a new Next.js project with Tailwind CSS and TypeScript:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

*(Note: Select "Yes" to all default prompts, including using the App Router and Turbopack if asked).*

## 2. Install Additional Dependencies
Navigate into the newly created folder and install the required UI and utility libraries:

```bash
cd frontend
npm install axios @supabase/supabase-js lucide-react clsx tailwind-merge



 i will provide u wth full logo circuar logo and name logo use wisely
 the app should not look ai generated
 theme should be roughly like this
 A professional product mockup of a high-resolution mobile tablet  displaying the clean 'CONCURIS Site Management' web dashboard interface. The interface uses a clean off-white (#F8FAFC) background for data cards and a light slate grey (#F1F5F9) body background. The main navigation sidebar and top bar are deep navy blue (#1E293B). All primary CTAs (Call to Actions) and 'pending' status indicators (e.g., pending goods dispatch) are highlighted in safety amber orange (#EA580C). Positive metrics, completed labor shifts, and successful deliveries are marked with steel emerald green (#059669). Dividing lines are slate gray (#E2E8F0). The screen clearly features a 'Map View' showing construction sites near Kanpur, an 'Equipment Summary' panel with a truck and crane graphic (matching image_9.png branding), a detailed 'Workforce Roster', and a 'Goods Log'. The text is crisp and dark grey. Soft, neutral studio light illuminates the scene, which is set on a subtle textured concrete surface.
## 3. Folder Structure Overview

Your `frontend` folder should be organized as follows:

```
frontend/
├── public/                     # Static assets (logos, icons, images)
│   ├── main circular logo.png
│   └── ...
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Grouped routes for authentication
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/          # Protected dashboard routes
│   │   │   ├── page.tsx
│   │   │   ├── projects/
│   │   │   ├── requirements/
│   │   │   ├── materials/
│   │   │   └── deliveries/
│   │   ├── chat/               # AI Chatbot route
│   │   ├── verify/             # Quotation Verification route
│   │   ├── globals.css         # Main Tailwind CSS file and theme configuration
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main Landing Page (Hero, Features)
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Atomic UI elements (Buttons, Inputs, Cards)
│   │   └── layout/             # Complex layout components (Sidebar, Navbar)
│   ├── lib/                    # Utilities and API clients
│   │   ├── api.ts              # Axios configuration and API wrappers
│   │   └── utils.ts            # Helper functions (e.g., classNames merger)
│   └── types/                  # Global TypeScript interfaces
├── .env.local                  # Environment variables (API URL, keys)
├── next.config.ts              # Next.js configuration
├── package.json
└── tailwind.config.ts          # Tailwind configuration (if using v3)
```


## 5. Start the Development Server
```bash
npm run dev
```
