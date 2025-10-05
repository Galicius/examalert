# Driving Exam Slot Finder 🚗

A Next.js application for monitoring and tracking available driving and theory exam slots in Slovenia. The system displays data from an external scraper API and provides real-time notifications when new slots matching user preferences become available.

## Features

✅ **Real-time Slot Monitoring**: Displays exam slots from external scraper API
✅ **Advanced Filtering**: Filter by region (območje), town, exam type, translator requirement, and categories
✅ **Dark/Light Mode**: Toggle between dark and light themes
✅ **Bilingual**: Slovenian (primary) and English language support
✅ **Email Notifications**: Subscribe to get notified when matching slots appear
✅ **Clean UI**: Minimalist design without images, focused on functionality

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) - for subscriptions and questions
- **Email**: Resend API
- **External Scraper API**: https://cppapp-v25wkpukcq-ew.a.run.app/slots_all

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- Supabase account with PostgreSQL database
- Resend API key for email notifications
- cron-job.org account (free) for scheduling

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres

# Email
RESEND_API_KEY=re_YOUR_API_KEY

# Scraper Security
SCRAPE_SECRET=scrape_secret_8k9mP2nQ5xL7vR3wT6jF

# Public URL (for production)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

### Installation

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build
yarn start
```

### Database Setup

The database schema is automatically created on first run. The following tables are created:

1. **slots** - Stores exam slot information
2. **scrape_meta** - Tracks last scrape time
3. **subscriptions** - Stores user email subscriptions with filters

## API Endpoints

### Public Endpoints

- `GET /api/healthz` - Health check
- `GET /api/slots` - Get available slots from external scraper API
- `POST /api/subscribe` - Subscribe to email notifications
- `GET /api/unsubscribe?token=XXX` - Unsubscribe from notifications
- `GET /api/questions` - Get exam questions
- `POST /api/questions` - Submit new exam question
- `POST /api/questions/:id/vote` - Vote on a question (like/dislike)

## Deployment

### Deploy to Vercel

1. **Fork/Clone** this repository
2. **Connect to Vercel**: Import your repository in Vercel dashboard
3. **Set Environment Variables**: Add all env variables in Vercel project settings
4. **Deploy**: Vercel will automatically build and deploy

**Note**: The application now uses an external scraper API, so no internal scraping setup is required.

## Usage

### For Users

1. Visit the website
2. Use filters to find desired exam slots:
   - Select exam type (driving/theory)
   - Choose region (Območje 1-5)
   - Filter by town
   - Enter license categories (B, A, C, etc.)
   - Toggle translator requirement
3. Click "Subscribe to notifications" to get email alerts
4. Receive emails when new matching slots appear

### Testing the API

```bash
# Get available slots
curl https://your-app.vercel.app/api/slots

# Or test the external scraper API directly
curl "https://cppapp-v25wkpukcq-ew.a.run.app/slots_all?include_fields=obmocje,town,exam_type,places_left,tolmac,created_at,updated_at,date_str,time_str,location,categories"
```

## Database Connection Issue

**Current Status**: The application is configured to use Supabase PostgreSQL, but there's a DNS resolution issue in the development environment. The app currently returns mock data for testing the frontend.

**For Production**: Ensure your Supabase database URL is correct and accessible from your deployment environment (Vercel).

**To Test Database Locally**: 
```bash
# Test connection
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); pool.query('SELECT NOW()', (err, res) => { console.log(err || res.rows); pool.end(); });"
```

## Configuration

### External Scraper API

The application fetches data from: `https://cppapp-v25wkpukcq-ew.a.run.app/slots_all`

Available query parameters:
- `include_fields`: Comma-separated list of fields to include in the response

### Email Notifications

Emails are sent via Resend API with the following triggers:
- New subscription confirmation
- New slot matching user filters

Users can unsubscribe via link in any email.

## Project Structure

```
/app
├── app/
│   ├── page.js           # Main frontend (slot finder)
│   ├── questions/        # Exam questions page
│   ├── layout.js         # Root layout
│   ├── globals.css       # Global styles
│   └── api/
│       └── [[...path]]/route.js  # API routes
├── lib/
│   ├── db.js             # Database utilities
│   └── utils.js          # Utility functions
├── components/ui/        # shadcn components
├── hooks/                # React hooks
├── .env                  # Environment variables
└── package.json          # Dependencies
```

## Security

- Scraper endpoint protected with secret token
- Unsubscribe tokens are unique per subscription
- SQL injection protection via parameterized queries
- Rate limiting recommended for production

## Troubleshooting

### Database Connection Fails
- Verify Supabase URL is correct
- Check if database is accessible from your deployment environment
- Ensure SSL is properly configured

### Emails Not Sending
- Verify Resend API key is valid
- Check Resend dashboard for errors
- Ensure "from" email is configured in Resend

### Scraping Not Working
- Check cron-job.org logs
- Verify secret token matches
- Check application logs in Vercel

## License

MIT License - feel free to use for your own projects

## Support

For issues related to:
- **e-uprava website changes**: Update scraper selectors in `lib/scraper.js`
- **Database issues**: Check Supabase dashboard
- **Email delivery**: Check Resend dashboard
- **Scheduling**: Check cron-job.org logs

---

**Note**: This application scrapes publicly available data from e-uprava.gov.si. Please respect their terms of service and implement appropriate rate limiting.
