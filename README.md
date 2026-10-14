# KindCode — planer zadań

Aplikacja do zarządzania projektami w stylu Monday.com. Workspace'y z zapraszaniem członków, tablice z konfigurowalnymi kolumnami, grupy i elementy z przypisaniami, komentarze, powiadomienia oraz dziennik pracy AI (wpisy przez API z kluczem). Zbudowana w Next.js 16 (App Router, React 19) z bazą PostgreSQL przez Prisma, uwierzytelnianiem NextAuth i drag-and-drop opartym o dnd-kit. Testy end-to-end w Playwright.

## Uruchomienie

Wymagania: Node.js, baza PostgreSQL.

```bash
npm install
cp .env.example .env   # uzupełnij DATABASE_URL i sekrety NextAuth
npx prisma migrate dev
npm run dev
```

Aplikacja działa pod adresem http://localhost:3000. Testy: `npm test`. Build produkcyjny: `npm run build && npm start`.
