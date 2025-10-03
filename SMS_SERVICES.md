# SMS Notification Services Guide

## Overview

You asked about SMS notification services as an alternative or addition to email notifications. Here are the best options for sending SMS notifications when new exam slots become available.

---

## Top SMS Service Providers

### 1. **Twilio** ⭐ Most Popular

**Website**: https://www.twilio.com/

**Pricing**:
- Pay-as-you-go: ~€0.07 per SMS (Slovenia)
- No monthly fees on pay-as-you-go
- Free trial: €15 credit

**Pros**:
- Most reliable and popular
- Excellent documentation
- Easy-to-use API
- Global coverage including Slovenia
- No minimum commitment
- Good developer experience

**Cons**:
- More expensive than competitors
- Requires phone number verification

**Node.js Integration**:
```javascript
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

await client.messages.create({
  body: 'New exam slot available!',
  from: '+1234567890', // Your Twilio number
  to: '+38640123456'   // User's number
});
```

**Best for**: Reliability and ease of use

---

### 2. **Vonage (Nexmo)** 

**Website**: https://www.vonage.com/communications-apis/sms/

**Pricing**:
- ~€0.055 per SMS (Slovenia)
- No monthly fees
- Free trial: €2 credit

**Pros**:
- Cheaper than Twilio
- Good API documentation
- No phone number purchase required for basic SMS
- Global coverage
- Simple integration

**Cons**:
- Slightly less documentation than Twilio
- Smaller community

**Node.js Integration**:
```javascript
const { Vonage } = require('@vonage/server-sdk');
const vonage = new Vonage({
  apiKey: API_KEY,
  apiSecret: API_SECRET
});

await vonage.sms.send({
  to: '38640123456',
  from: 'SlotFinder',
  text: 'New exam slot available!'
});
```

**Best for**: Cost-effective SMS at scale

---

### 3. **MessageBird**

**Website**: https://messagebird.com/

**Pricing**:
- ~€0.06 per SMS (Slovenia)
- No monthly fees
- Free trial: €10 credit

**Pros**:
- Good balance of price and features
- Clean API
- European company (Netherlands)
- Good GDPR compliance
- WhatsApp integration available
- Viber integration available

**Cons**:
- Slightly less popular than Twilio/Vonage
- Requires verification

**Node.js Integration**:
```javascript
const messagebird = require('messagebird')('API_KEY');

messagebird.messages.create({
  originator: 'SlotFinder',
  recipients: ['+38640123456'],
  body: 'New exam slot available!'
}, callback);
```

**Best for**: European projects requiring GDPR compliance

---

### 4. **Infobip**

**Website**: https://www.infobip.com/

**Pricing**:
- Custom pricing (typically €0.05-0.08 per SMS)
- Volume discounts available
- May have minimum monthly commitment

**Pros**:
- Very strong in Europe and Slovenia
- Excellent deliverability rates
- WhatsApp Business API
- Viber integration
- Rich communication services

**Cons**:
- More enterprise-focused
- May require sales contact for pricing
- Might have minimum commitments

**Best for**: Larger scale operations or if you need WhatsApp/Viber

---

### 5. **AWS SNS (Simple Notification Service)**

**Website**: https://aws.amazon.com/sns/

**Pricing**:
- ~€0.06 per SMS (Slovenia)
- Pay only for what you use
- Very cheap for low volume
- Free tier: First 1,000 SMS free

**Pros**:
- If you're already using AWS
- Very cheap at low volumes
- Highly scalable
- Reliable infrastructure
- Easy integration with other AWS services

**Cons**:
- AWS account setup required
- More complex setup than dedicated SMS services
- Less SMS-focused features
- No dedicated SMS customer support

**Best for**: If you're already on AWS ecosystem

---

### 6. **ClickSend**

**Website**: https://www.clicksend.com/

**Pricing**:
- ~€0.055 per SMS (Slovenia)
- No monthly fees
- Free trial: €5 credit

**Pros**:
- Simple and straightforward
- Good for beginners
- Transparent pricing
- Multiple channels (SMS, Email, Voice, Post)

**Cons**:
- Smaller than major players
- Less community resources

**Best for**: Simplicity and multi-channel needs

---

## Recommended Solution

### For Your Project: **Twilio** or **Vonage**

**Why Twilio**:
- Most documentation and Stack Overflow answers
- Easiest to implement
- Best for getting started quickly
- Worth the extra €0.01-0.02 per SMS for peace of mind

**Why Vonage**:
- €0.055 vs Twilio's €0.07 (21% cheaper)
- Still very reliable
- Good documentation
- No phone number purchase required

---

## Implementation Approach

### Database Schema Addition

Add SMS subscription table:

```sql
CREATE TABLE sms_subscriptions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  filter_obmocje INTEGER,
  filter_town VARCHAR(100),
  filter_exam_type VARCHAR(20),
  filter_tolmac BOOLEAN,
  filter_categories VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  unsubscribe_token VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_notified_at TIMESTAMP
);
```

### API Routes

Add to your Next.js API:

```javascript
// POST /api/subscribe-sms
export async function POST(request) {
  const { phone, filters } = await request.json();
  
  // Validate phone number format
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }
  
  // Send confirmation SMS
  await twilio.messages.create({
    body: `Confirm subscription: Reply YES. Unsubscribe: ${url}`,
    to: phone,
    from: TWILIO_NUMBER
  });
  
  // Save to database
  // ...
}
```

### SMS Notification Logic

When a new slot is found:

```javascript
async function notifySMSSubscribers(newSlot) {
  const subs = await query(
    'SELECT * FROM sms_subscriptions WHERE active = true'
  );
  
  for (const sub of subs) {
    if (matchesFilters(newSlot, sub)) {
      await twilio.messages.create({
        body: `New slot: ${newSlot.date_str} ${newSlot.time_str} ${newSlot.location}`,
        to: sub.phone_number,
        from: TWILIO_NUMBER
      });
      
      // Update last notified
      await query(
        'UPDATE sms_subscriptions SET last_notified_at = NOW() WHERE id = $1',
        [sub.id]
      );
    }
  }
}
```

---

## Cost Comparison

For 1000 notifications per month:

| Service | Cost/SMS | Monthly Cost |
|---------|----------|--------------|
| Twilio | €0.070 | €70 |
| Vonage | €0.055 | €55 |
| MessageBird | €0.060 | €60 |
| AWS SNS | €0.060 | €60 |
| ClickSend | €0.055 | €55 |

**Email (Resend)**: €0 for first 3,000 emails

---

## Hybrid Approach (Recommended)

Offer both email and SMS:

**Free tier**: Email notifications (Resend)
**Premium tier**: SMS notifications (Twilio/Vonage)

This allows:
- Free service for most users
- Revenue from SMS-preferring users
- Cover SMS costs + margin

Example pricing:
- Email: Free
- SMS: €5/month for unlimited notifications
  - Cost: ~€1-3/month per active user
  - Profit: €2-4/month per user

---

## Legal Considerations

### GDPR Compliance
- Get explicit consent for SMS
- Provide easy unsubscribe
- Store phone numbers securely
- Include privacy policy
- Keep consent records

### Slovenia-Specific
- Ensure service provider can send to Slovenia (+386)
- Check local telecommunications regulations
- Provide opt-out in every SMS (if required)

---

## WhatsApp Alternative

**WhatsApp Business API** (via Twilio, MessageBird, or Infobip):

**Pros**:
- Free messages (after setup cost)
- Richer notifications (images, buttons)
- More engaging
- High open rates

**Cons**:
- Complex approval process
- Business verification required
- Setup can take weeks
- Requires Facebook Business Manager

**Best for**: Once you have significant users (1000+)

---

## Implementation Priority

1. **Phase 1**: Email only (current - FREE) ✅
2. **Phase 2**: Add SMS with Twilio (€70-100 initial investment)
3. **Phase 3**: Add subscription tiers (monetize)
4. **Phase 4**: Consider WhatsApp (when at scale)

---

## Quick Start: Twilio Setup

1. Sign up at twilio.com
2. Get €15 free credit
3. Buy a phone number (~€1/month)
4. Get Account SID and Auth Token
5. Install: `yarn add twilio`
6. Test with your phone number
7. Verify your business (for production)

---

## Conclusion

**My Recommendation**:

- **Start with**: Email only (you have this already)
- **Add next**: Twilio SMS for premium users
- **Consider**: Vonage if you need to optimize costs later
- **Future**: WhatsApp Business API when you have 1000+ users

SMS costs add up quickly, so:
1. Start with email (free)
2. Validate user demand for SMS
3. Add SMS as paid feature
4. Use SMS revenue to cover costs

---

**Questions? Need help implementing?** Just ask!
