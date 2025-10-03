# Deployment Guide

## Step-by-Step Deployment to Vercel + cron-job.org

### Part 1: Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Note down the connection string from Settings > Database

2. **Get Connection String**
   - Format: `postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres`
   - Example: `postgresql://postgres:JkKkzJ22Dg5vUTr@db.mhkphxruafrpzdmuhmzw.supabase.co:5432/postgres`

### Part 2: Email Setup (Resend)

1. **Create Resend Account**
   - Go to [https://resend.com](https://resend.com)
   - Sign up for free account (100 emails/day)

2. **Get API Key**
   - Go to API Keys section
   - Create new API key
   - Copy the key (format: `re_XXXXXXXXX`)

3. **Configure Domain (Optional but Recommended)**
   - Add and verify your domain in Resend
   - This allows emails from your domain instead of `notifications@resend.dev`

### Part 3: Deploy to Vercel

1. **Prepare Repository**
   ```bash
   # Push code to GitHub/GitLab
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your repository
   - Configure project settings

3. **Set Environment Variables** in Vercel Dashboard
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
   RESEND_API_KEY=re_YOUR_API_KEY
   SCRAPE_SECRET=scrape_secret_8k9mP2nQ5xL7vR3wT6jF
   NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Note your deployment URL (e.g., `https://your-app.vercel.app`)

5. **Update NEXT_PUBLIC_BASE_URL**
   - After first deployment, update this variable with your actual Vercel URL
   - Redeploy

### Part 4: Setup Scheduled Scraping (cron-job.org)

1. **Create Account**
   - Go to [https://cron-job.org](https://cron-job.org)
   - Sign up for free account
   - Verify email

2. **Create Daytime Cron Job** (Every 20 minutes, 6 AM - 10 PM CET)
   - Click "Create Cron Job"
   - **Title**: `Exam Scraper - Daytime`
   - **URL**: `https://your-app.vercel.app/api/trigger-scrape`
   - **Schedule**:
     - Expression: `*/20 6-21 * * *`
     - Or use pattern: Every 20 minutes between 06:00-22:00
     - Timezone: `Europe/Ljubljana` (CET)
   - **Request Method**: POST
   - **Headers**: Click "Add Custom Header"
     - Name: `X-Secret`
     - Value: `scrape_secret_8k9mP2nQ5xL7vR3wT6jF`
   - **Save Responses**: Yes (for debugging)
   - Click "Create"

3. **Create Nighttime Cron Job** (Every hour, 10 PM - 6 AM CET)
   - Click "Create Cron Job"
   - **Title**: `Exam Scraper - Nighttime`
   - **URL**: `https://your-app.vercel.app/api/trigger-scrape`
   - **Schedule**:
     - Expression: `0 22-23,0-5 * * *`
     - Or: Every hour between 22:00-06:00
     - Timezone: `Europe/Ljubljana` (CET)
   - **Request Method**: POST
   - **Headers**: Add same custom header as above
     - Name: `X-Secret`
     - Value: `scrape_secret_8k9mP2nQ5xL7vR3wT6jF`
   - **Save Responses**: Yes
   - Click "Create"

4. **Enable Cron Jobs**
   - Make sure both cron jobs are enabled (green toggle)
   - Check "History" tab to verify first execution

### Part 5: Testing

1. **Test Frontend**
   ```bash
   # Visit your app
   https://your-app.vercel.app
   ```

2. **Test Scraping API**
   ```bash
   # Manual trigger
   curl -X POST https://your-app.vercel.app/api/trigger-scrape \
     -H "X-Secret: scrape_secret_8k9mP2nQ5xL7vR3wT6jF"
   
   # Expected response:
   # {"opened":10,"updated":5,"total":15}
   ```

3. **Test Email Subscription**
   - Go to your app
   - Set some filters
   - Click "Subscribe to notifications"
   - Enter your email
   - Check email for confirmation

4. **Check Logs**
   - **Vercel**: Dashboard > Your Project > Functions > Logs
   - **cron-job.org**: Dashboard > Your Job > History
   - **Resend**: Dashboard > Logs

### Part 6: Monitoring

1. **Vercel Analytics**
   - Enable in Vercel dashboard
   - Monitor traffic and errors

2. **cron-job.org Monitoring**
   - Check execution history
   - Set up email notifications for failures
   - Monitor response times

3. **Database Monitoring**
   - Check Supabase dashboard for:
     - Connection pooling
     - Query performance
     - Storage usage

4. **Email Monitoring**
   - Monitor Resend dashboard for:
     - Delivery rates
     - Bounces
     - Usage limits

### Part 7: Maintenance

#### Update Scraper Logic
```bash
# Make changes to lib/scraper.js
git add lib/scraper.js
git commit -m "Update scraper"
git push origin main
# Vercel auto-deploys
```

#### Update Frontend
```bash
# Make changes to app/page.js
git add app/page.js
git commit -m "Update UI"
git push origin main
```

#### Database Migrations
```bash
# Connect to Supabase
# Run SQL in Supabase SQL Editor
```

## Troubleshooting

### Deployment Fails
- Check Vercel build logs
- Verify all env variables are set
- Check for syntax errors

### Scraper Returns Errors
- Check cron-job.org execution history
- Verify secret header matches
- Check Vercel function logs
- Ensure e-uprava.gov.si is accessible

### Database Connection Issues
- Verify connection string format
- Check Supabase project is active
- Ensure SSL is enabled
- Test connection from Vercel function

### Emails Not Sending
- Verify Resend API key
- Check Resend logs for errors
- Verify email quota (100/day on free plan)
- Check spam folder

### Cron Not Executing
- Verify cron expression syntax
- Check timezone setting
- Ensure cron job is enabled
- Check cron-job.org account status

## Cost Breakdown

- **Vercel**: Free (Hobby plan)
- **Supabase**: Free up to 500MB database
- **Resend**: Free up to 100 emails/day
- **cron-job.org**: Free (unlimited jobs)

**Total: $0/month** for small to medium usage

## Scaling

### If you exceed free tiers:

1. **Vercel Pro** ($20/month)
   - Faster builds
   - More concurrent executions
   - Better performance

2. **Supabase Pro** ($25/month)
   - 8GB database
   - More connections
   - Point-in-time recovery

3. **Resend Pay-as-you-go**
   - $0.10 per 100 emails after free tier

4. **Alternative Cron** (if needed)
   - GitHub Actions (free for public repos)
   - Vercel Cron (requires Pro plan)
   - EasyCron (free tier available)

## Security Checklist

- [ ] Secret token is random and secure
- [ ] Environment variables are set in Vercel (not in code)
- [ ] Database uses SSL connection
- [ ] API endpoints have rate limiting (consider adding)
- [ ] Unsubscribe tokens are unique
- [ ] No sensitive data in git repository
- [ ] Resend API key is kept private

## Next Steps

1. Monitor first scraping cycle
2. Subscribe to test email notifications
3. Share app URL with users
4. Monitor usage and performance
5. Consider adding analytics
6. Plan for scaling if needed

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Resend Docs: https://resend.com/docs
- cron-job.org Help: https://cron-job.org/en/documentation.html
