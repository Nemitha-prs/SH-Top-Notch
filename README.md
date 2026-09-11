# SH Top Notch

Static, mobile-first website for SH Top Notch premium mobile auto detailing.

## Deploy to Vercel

Import the repository into Vercel with the project root as the deployment directory. No build command is required. The `api/book.js` function uses Resend for transactional email; add these environment variables in the Vercel project settings:

- `RESEND_API_KEY` - Resend API key with permission to send mail.
- `OWNER_EMAIL` - email address that receives new booking alerts.
- `FROM_EMAIL` - verified Resend sender, for example `bookings@yourdomain.com.au`.

The Google review link in `index.html` contains a placeholder Place ID. Replace `REPLACE_WITH_YOUR_PLACE_ID` with the business Place ID before launch.

## Local preview

Serve the root directory with any static server, for example `npx serve .`, then open `http://localhost:3000`. Booking email delivery requires the Vercel function and the environment variables above.
