<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Rentify Development Rules

- Work only inside the existing repository structure.
- Do not create duplicate app folders.
- Use Next.js App Router conventions.
- Use Supabase for backend/database/auth/storage.
- Preserve existing functionality unless explicitly refactoring.
- Run build checks before completing tasks.
- Include migration files for all database changes.
- After completing a requested feature:
  - stage changes
  - commit changes
  - push to GitHub
- Use clean professional commit messages.
- Never expose secrets or modify .env.local.
- Reuse shared UI/components whenever possible.
- Maintain responsive mobile-first layouts.
- Avoid breaking realtime subscriptions.
