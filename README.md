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
