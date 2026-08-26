# Synap — Agent Guidelines & Engineering Standards

Welcome to the **Synap** codebase. Synap is a modern, high-performance knowledge management and note-taking platform featuring bi-directional linking, interactive graph visualization, drawing canvases, and flashcards with spaced repetition.

All AI coding assistants and contributors MUST strictly follow these guidelines when reading, designing, and modifying this codebase.

---

## 1. Design System & UI Principles (Geist / Vercel Standards)

Synap strictly adheres to a **minimalist, high-contrast, technical aesthetic** inspired by Vercel / Geist UI.

### 🚫 Strict Prohibition of Emojis
- **NEVER use colorful emojis** (e.g., 🎨, 🚀, 📂, 📝, ⚙️, ❌) in UI components, buttons, tabs, modal headers, dropdowns, or notifications.
- **ALWAYS use clean vector SVG icons** (Lucide-style / Feather-style SVGs with `12px`–`16px` sizing, `strokeWidth={1.5}` or `2`, `stroke="currentColor"`, and monochrome fills).

### 🎨 Color Tokens & Theme System
- Always utilize the built-in CSS custom properties defined in `frontend/src/app/globals.css`:
  - `var(--background)`: Base page background (`#000000` dark / `#ffffff` light).
  - `var(--foreground)`: Primary text & high-contrast elements (`#ffffff` dark / `#000000` light).
  - `var(--accents-1)` through `var(--accents-8)`: Neutral scale for subtle surfaces, hover states, dividers, and secondary text.
  - `var(--radius)`: Standard border radius (`6px`).
- Keep accents subtle and functional. When highlighting or grouping elements (e.g., graph clusters), use curated, desaturated, or precise hex colors rather than loud, distracting palettes.

### 🧩 Components & Styling Conventions
- Utilize the standard Geist utility classes:
  - `.geist-button` / `.geist-button-secondary`: Standard buttons with crisp hover transitions.
  - `.geist-card`: Subtle background, `1px solid var(--accents-2)` border, smooth shadow on hover.
  - `.geist-input`: Transparent/subtle background with `border-[var(--accents-2)]` and focused `border-[var(--accents-5)]`.
- Maintain clean, compact padding and typography with `var(--font-sans)` for UI and `var(--font-mono)` for metrics, timestamps, and IDs.

---

## 2. Frontend Engineering (Next.js & React)

- **Framework**: Next.js App Router with TypeScript and Tailwind CSS v4.
- **Client Components**: Mark interactive components explicitly with `'use client';` at the top.
- **State & Responsiveness**:
  - Provide instant UI feedback (optimistic updates / immediate local state changes).
  - Use debouncing (typically 500ms–800ms) for background synchronization and auto-saving to prevent network overhead.
- **TypeScript Strictness**:
  - Define explicit interfaces/types for props, models, and state.
  - Avoid unchecked type assertions. Keep data structures strongly typed across components.

---

## 3. Backend Engineering (Node.js, Express & Prisma)

- **Architecture**: Layered architecture separated into `routes/`, `controllers/`, `services/`, `middlewares/`, and `config/`.
- **Database & ORM**: PostgreSQL managed via Prisma (`schema.prisma`).
  - When modifying data models, update `backend/prisma/schema.prisma` and run `npm run prisma:generate` (and `prisma db push` / migrations when appropriate).
  - Ensure cascading deletes and referential integrity are properly declared.
- **API Contracts & Error Handling**:
  - Endpoints follow RESTful conventions.
  - Wrap controller handlers in `try/catch` blocks returning structured JSON responses:
    - Success: `res.status(200).json(data)` or `res.status(201).json(created)`.
    - Client error: `res.status(400).json({ error: message })`.
    - Auth error: `res.status(401).json({ error: 'Unauthorized' })`.
    - Server error: `res.status(500).json({ error: message })`.

---

## 4. Verification & Quality Assurance Workflow

Before considering any implementation or refactoring task complete:
1. **Build Verification**:
   - Backend: run `npm run build` in `backend/` to verify TypeScript compilation and Prisma client generation.
   - Frontend: run `npm run build` in `frontend/` to ensure static analysis and type checks pass with zero errors.
2. **Regression Prevention**:
   - Ensure existing features, keyboard shortcuts, and modals remain fully functional.
   - Preserve existing comments and docstrings unless explicitly asked to modify them.
