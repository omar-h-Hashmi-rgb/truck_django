# FMCSA ELD Trip Planner — Deployment Guide

## Architecture

```
Vercel (React)  ──API──>  Render (Django)  ──DB──>  Supabase (PostgreSQL)
```

## Step 1: Supabase (Database)

Already configured. Your database is live at:
- Project: `yukzatofpqysqycjvcer`
- Region: `ap-northeast-1`
- Connection: `postgresql://postgres.yukzatofpqysqycjvcer:...@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`

## Step 2: Render (Backend)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo (or use manual deploy)
3. Settings:
   - **Root Directory:** `backend`
   - **Environment:** Python 3
   - **Build Command:** `./build.sh`
   - **Start Command:** `gunicorn core.wsgi:application`
   - **Instance Type:** Free
4. Add Environment Variables:
   ```
   DATABASE_URL = postgresql://postgres.yukzatofpqysqycjvcer:...@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   SECRET_KEY = <generate-a-random-secret-key>
   DEBUG = False
   ALLOWED_HOSTS = *
   ```
5. Deploy → Wait for build → Copy the URL (e.g. `https://your-api.onrender.com`)

## Step 3: Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
4. Add Environment Variable:
   ```
   VITE_API_BASE_URL = https://your-api.onrender.com
   ```
5. Deploy → Get your live URL

## Step 4: Update CORS (if needed)

If your frontend URL differs from the backend, update `ALLOWED_HOSTS` in Render:
```
ALLOWED_HOSTS = your-api.onrender.com,your-frontend.vercel.app
```

## Local Development

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # Edit with your secrets
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

## File Structure

```
/
├── backend/
│   ├── build.sh              # Render build script
│   ├── render.yaml           # Render service config
│   ├── Procfile              # Process file
│   ├── requirements.txt
│   ├── .env.example
│   ├── core/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── trips/
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       └── services/
│           ├── routing.py    # Nominatim + OSRM
│           └── hos_engine.py # FMCSA HOS state machine
├── frontend/
│   ├── vercel.json           # Vercel config
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── TripForm.jsx
│       │   ├── RouteMap.jsx
│       │   ├── DailyLogSheet.jsx
│       │   ├── TripTimeline.jsx
│       │   └── SavedTripsModal.jsx
│       └── services/
│           └── api.js
└── README.md
```
