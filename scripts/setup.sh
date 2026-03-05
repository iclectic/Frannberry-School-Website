#!/usr/bin/env bash
set -euo pipefail

echo "🏫 Frannberry School – Local Setup"
echo "═══════════════════════════════════"

# 1. Copy .env files if they don't exist
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env from .env.example"
else
  echo "ℹ️  backend/.env already exists"
fi

if [ ! -f frontend/.env.local ]; then
  echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1' > frontend/.env.local
  echo 'NEXT_PUBLIC_WS_URL=http://localhost:4000' >> frontend/.env.local
  echo "✅ Created frontend/.env.local"
else
  echo "ℹ️  frontend/.env.local already exists"
fi

# 2. Start Docker services
echo ""
echo "🐳 Starting Docker services (Postgres, MinIO, Redis)..."
docker compose up -d

echo "⏳ Waiting for Postgres to be ready..."
until docker exec frannberry_db pg_isready -U frannberry -d frannberry_school > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres is ready"

# 3. Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# 4. Generate Prisma client & run migrations
echo ""
echo "🗄️  Running Prisma migrations..."
npx prisma generate
npx prisma migrate dev --name init
echo "✅ Database migrated"

# 5. Seed the database
echo ""
echo "🌱 Seeding the database..."
npx ts-node prisma/seed.ts
echo "✅ Database seeded"

cd ..

# 6. Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "═══════════════════════════════════════════"
echo "  🎉 Setup complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "  To start the backend:"
echo "    cd backend && npm run start:dev"
echo ""
echo "  To start the frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  API docs:  http://localhost:4000/api/docs"
echo "  Frontend:  http://localhost:3000"
echo "  MinIO:     http://localhost:9001"
echo "═══════════════════════════════════════════"
