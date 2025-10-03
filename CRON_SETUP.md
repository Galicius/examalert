# Cron-Job.org Setup Guide

This guide explains how to configure scheduled scraping using cron-job.org

## Why cron-job.org?

- ✅ Free forever
- ✅ Reliable execution
- ✅ Support for complex schedules
- ✅ Execution history and monitoring
- ✅ Email alerts on failures
- ✅ No server maintenance required

## Schedule Requirements

Your scraper should run:
- **Daytime (6 AM - 10 PM CET)**: Every 20 minutes
- **Nighttime (10 PM - 6 AM CET)**: Every hour

## Setup Steps

### 1. Create Account

1. Go to https://cron-job.org
2. Click "Sign up"
3. Fill in your details
4. Verify your email address
5. Log in to dashboard

### 2. Create Daytime Job

1. Click **"Create cronjob"** button

2. Fill in the form:

**Basic Settings:**
- **Title**: `Exam Scraper - Daytime (Every 20 min)`
- **Address (URL)**: `https://your-app.vercel.app/api/trigger-scrape`
  - Replace `your-app.vercel.app` with your actual Vercel domain

**Schedule:**
- **Pattern**: Select "Every X minutes"
- **Every**: `20` minutes
- **Advanced pattern** (if available): `*/20 6-21 * * *`
- **Days**: All selected (Mon-Sun)
- **Time window**: 06:00 - 21:59
- **Timezone**: `Europe/Ljubljana` or `Europe/Zagreb` (CET/CEST)

**Request Settings:**
- **Request method**: `POST`
- **Request timeout**: `60` seconds

**Custom Request Headers:**
Click "Add header" and enter:
- **Header name**: `X-Secret`
- **Header value**: `scrape_secret_8k9mP2nQ5xL7vR3wT6jF`

**Response Handling:**
- ✅ **Save responses**: Enabled (for debugging)
- **Expected response**: Leave empty or `200`
- ✅ **Execute even on errors**: Enabled

**Notifications:**
- ✅ **Email on failure**: Enabled
- **Failures before notification**: `3` (to avoid false alarms)

3. Click **"Create cronjob"**

### 3. Create Nighttime Job

1. Click **"Create cronjob"** button again

2. Fill in the form:

**Basic Settings:**
- **Title**: `Exam Scraper - Nighttime (Every hour)`
- **Address (URL)**: `https://your-app.vercel.app/api/trigger-scrape`

**Schedule:**
- **Pattern**: Select "Every X hours"
- **Every**: `1` hour
- **Advanced pattern**: `0 22-23,0-5 * * *`
- **Days**: All selected
- **Time window**: 22:00 - 05:59
- **Timezone**: `Europe/Ljubljana`

**Request Settings:**
- **Request method**: `POST`
- **Request timeout**: `60` seconds

**Custom Request Headers:**
- **Header name**: `X-Secret`
- **Header value**: `scrape_secret_8k9mP2nQ5xL7vR3wT6jF`

**Response Handling:**
- ✅ **Save responses**: Enabled
- ✅ **Execute even on errors**: Enabled

**Notifications:**
- ✅ **Email on failure**: Enabled
- **Failures before notification**: `3`

3. Click **"Create cronjob"**

### 4. Verify Setup

1. Go to **"Cronjobs"** tab in dashboard
2. You should see both jobs listed
3. Ensure both jobs are **ENABLED** (green toggle)
4. Check the "Next execution" times

### 5. Test Execution

**Manual Test:**
1. Click on job name
2. Click **"Execute now"** button
3. Wait for execution to complete
4. Check the response in "Execution history"
5. Expected response: `{"opened":X,"updated":Y,"total":Z}`

**Check History:**
1. Go to "Execution history" tab
2. Look for recent executions
3. Verify response code is `200`
4. Check response body for success

## Cron Expression Reference

| Expression | Meaning |
|------------|---------|
| `*/20 6-21 * * *` | Every 20 minutes between 6 AM and 9 PM |
| `0 22-23,0-5 * * *` | Every hour from 10 PM to 6 AM |
| `*/15 * * * *` | Every 15 minutes (alternative for testing) |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |

### Cron Expression Format

```
*    *    *    *    *
│    │    │    │    │
│    │    │    │    └─── Day of week (0-6, Sun-Sat)
│    │    │    └──────── Month (1-12)
│    │    └───────────── Day of month (1-31)
│    └────────────────── Hour (0-23)
└─────────────────────── Minute (0-59)
```

## Monitoring

### View Execution History

1. Go to your job
2. Click "Execution history" tab
3. View recent executions with:
   - Timestamp
   - Response code
   - Response body
   - Execution time

### Set Up Alerts

1. Edit job settings
2. Enable "Email on failure"
3. Set threshold (e.g., 3 consecutive failures)
4. Add notification email

### Monitor Performance

Track metrics:
- Success rate
- Response time
- Error patterns
- Execution consistency

## Troubleshooting

### Job Not Executing

**Check:**
- [ ] Job is enabled (green toggle)
- [ ] Time window is correct for your timezone
- [ ] No account limitations
- [ ] Cron expression is valid

**Solution:**
- Click "Execute now" to test
- Check account status
- Verify timezone setting

### Execution Fails (Non-200 Response)

**Check:**
- [ ] URL is correct
- [ ] Vercel app is deployed
- [ ] Secret header matches
- [ ] Vercel function doesn't timeout

**Solution:**
- Test URL manually with curl
- Check Vercel logs
- Verify environment variables
- Increase timeout if needed

### Wrong Schedule

**Check:**
- [ ] Cron expression syntax
- [ ] Timezone setting
- [ ] Time window configuration

**Solution:**
- Use cron expression validator
- Test with "Execute now"
- Adjust pattern as needed

### Too Many Emails

**Solution:**
- Increase failure threshold before notification
- Disable email alerts temporarily
- Fix underlying issue causing failures

## Alternative: Vercel Cron (Pro Plan)

If you have Vercel Pro plan, you can use native Vercel Cron:

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/trigger-scrape",
    "schedule": "*/20 6-21 * * *"
  }]
}
```

**Limitations:**
- Requires Vercel Pro ($20/month)
- More complex for multiple schedules
- Less flexible monitoring

## Best Practices

1. **Test First**: Always test with "Execute now" before enabling
2. **Monitor Initially**: Check history frequently after setup
3. **Set Alerts**: Enable failure notifications
4. **Keep Logs**: Save responses for debugging
5. **Document Changes**: Note any schedule modifications
6. **Backup**: Export configuration periodically
7. **Security**: Keep secret token private
8. **Timezone**: Always specify timezone explicitly

## Cost

**cron-job.org Free Plan includes:**
- Unlimited cron jobs
- 1-minute minimum interval
- Execution history
- Email notifications
- API access
- No credit card required

**Paid plans** (optional):
- Professional: €4.99/month
- Enterprise: Custom pricing
- Benefits: Priority execution, longer history, premium support

For this project, **free plan is sufficient**.

## Security

### Protect Your Endpoint

The secret header (`X-Secret`) protects your endpoint from:
- Unauthorized scraping
- Resource abuse
- Malicious triggers

### Best Practices

1. **Use strong secret**: Random, long string
2. **Don't share publicly**: Keep secret in cron-job.org only
3. **Rotate periodically**: Change secret every few months
4. **Monitor usage**: Check execution patterns
5. **Rate limiting**: Consider adding to API endpoint

## Support

- **Documentation**: https://cron-job.org/en/documentation.html
- **Support Email**: support@cron-job.org
- **Community Forum**: https://cron-job.org/en/forum/
- **Status Page**: Check service status

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  DAYTIME JOB (6 AM - 10 PM)            │
├─────────────────────────────────────────┤
│  Schedule: */20 6-21 * * *              │
│  Interval: Every 20 minutes             │
│  Timezone: Europe/Ljubljana             │
│  Method: POST                           │
│  Header: X-Secret: [SECRET_TOKEN]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  NIGHTTIME JOB (10 PM - 6 AM)          │
├─────────────────────────────────────────┤
│  Schedule: 0 22-23,0-5 * * *            │
│  Interval: Every hour                   │
│  Timezone: Europe/Ljubljana             │
│  Method: POST                           │
│  Header: X-Secret: [SECRET_TOKEN]       │
└─────────────────────────────────────────┘
```

Save this card for quick reference!
