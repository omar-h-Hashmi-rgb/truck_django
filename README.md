# FMCSA ELD & HOS Trip Planner

Full-stack web application for commercial truck route planning and Hours of Service (HOS) ELD log sheet generation.

## Project Structure

```
/
├── backend/          # Django + DRF + Supabase
│   ├── core/         # Django project settings
│   ├── trips/        # Trips app (models, views, urls)
│   ├── manage.py
│   └── requirements.txt
└── frontend/         # React + Vite + Tailwind
    ├── src/
    │   ├── components/
    │   └── services/
    ├── package.json
    └── vite.config.js
```

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # Edit with your secrets
python manage.py migrate
python manage.py runserver
```

Backend runs at: http://127.0.0.1:8000

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at: http://localhost:5173

## API Endpoints

| Method | Endpoint               | Description             |
|--------|------------------------|-------------------------|
| GET    | /api/health/           | Health check            |
| POST   | /api/trips/plan/       | Plan a new trip         |
| GET    | /api/trips/            | List saved trips        |
| GET    | /api/trips/:id/        | Get trip details        |

### POST /api/trips/plan/ Request Body

```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Houston, TX",
  "dropoff_location": "Chicago, IL",
  "current_cycle_hours": 0
}
```

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode (True/False)
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `ALLOWED_HOSTS` - Allowed hostnames

### Frontend (.env)
- `VITE_API_BASE_URL` - Backend API URL (default: http://127.0.0.1:8000)
