# Running Web MVP

Base inicial del MVP para generación de planes de running personalizados.

## Stack
- Next.js + TypeScript
- PostgreSQL + Prisma
- Despliegue objetivo: Vercel

## Requisitos
- Node.js 18.18+ (recomendado 20+)
- PostgreSQL

## Inicio rápido
1. Instalar dependencias:
   npm install
2. Copiar variables de entorno:
   cp .env.example .env
3. Crear la base de datos y ajustar `DATABASE_URL`.
4. Generar cliente Prisma:
   npm run prisma:generate
5. Ejecutar app:
   npm run dev

## Auth con Supabase (Google)
1. En Supabase, habilitar provider Google en `Authentication > Providers`.
2. En Google Cloud, configurar URI de redirección:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. En Supabase, agregar URLs de redirección de la app:
   - `http://localhost:3000/auth/callback`
   - `https://<tu-dominio>/auth/callback`
4. Completar en `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` sale de `Project Settings > API > Project API keys > anon public`

## Strava
1. Crear una app en `https://www.strava.com/settings/api`.
2. Configurar callback domain para local:
   `localhost`
3. Agregar en `.env`:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `APP_ENCRYPTION_KEY`
   - `STRAVA_WEBHOOK_VERIFY_TOKEN`
4. OAuth callback local:
   `http://localhost:3000/api/strava/callback`
5. Webhook callback para un entorno publico:
   `https://<tu-dominio>/api/strava/webhook`

## Estructura base
- `src/app`: rutas (landing, login, dashboard, workouts, plan)
- `src/lib/training`: lógica inicial del generador
- `src/lib/validations`: schemas Zod
- `src/lib/db`: cliente Prisma
- `src/types`: tipos de dominio
- `prisma/schema.prisma`: modelo de datos inicial
