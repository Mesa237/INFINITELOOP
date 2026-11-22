# CouCouMTL

**Ask. Get help. Say coucou.**
A neighbour-to-neighbour help app for Montréal that connects **elders and newcomers** with **volunteers**: in any language, matched by skills, meeting safely in public places.

Built by **Team InfiniteLoop** for the Montréal hackathon (theme: build something for the community and the city).

- Showcase site: https://coucoumtl.vercel.app
- Pitch deck: in the hackathon OneDrive folder

---

## The problem
In Montréal, **36% of seniors live alone** (vs 29% in Quebec and 27% in Toronto), and **31.6% of them live below the low-income line**. About **1 resident in 3 is an immigrant**. Many neighbours would gladly help, but people can't find each other.

## What the app does
| Feature | What it does |
|---|---|
| **AI post writer** | Members describe their need in any language. Claude writes a clear post in French or English, removes private details, and flags only real emergencies as urgent. |
| **Skills-first matching** | Volunteers see requests that need their skills first. Members see which volunteers have the skills they need. Niche skills written in the volunteer's own words are matched against request text. |
| **Volunteer dashboard** | Skills, kinds of help, languages, profession, talents, availability, each with an "Other" option. |
| **Offers, chat and notifications** | Offer, accept, live chat, and an Inbox with an unread badge. |
| **Meet safely** | Fair midpoint: public places (metro stations, Grande Bibliothèque) at a fair distance for both people, computed from live locations rounded to about 100 m. "Near me" suggests public places only. No home address is ever shared. |
| **Trust and safety** | Ratings (a reason is required under 4 stars), Verified volunteer badge (3+ reviews averaging 4+ stars), block and report, community rules with a liability disclaimer. |
| **Community** | Discover posts with photos, videos and comments. Volunteer-run clubs (e.g. French A1 Tandem, Winter in MTL) with club chat and in-app live voice rooms (host, speakers, listeners, raise hand). |
| **Accessibility** | Easy view (bigger text and buttons), English / Français, light / dark mode. |
| **Services** | Verified phone numbers and links for key public services. |

## Tech stack
- **Mobile app:** Expo SDK 58, React Native, Expo Router
- **Backend:** Supabase (Postgres with row-level security on every table, Realtime, Storage, Edge Functions)
- **AI:** Anthropic Claude via a Supabase Edge Function (`supabase/functions/draft-request`)
- **Live rooms:** WebRTC audio with Supabase Realtime signalling (`website/live.html`, shown in-app)
- **Website:** static site on Vercel (`website/`)

## Project structure
```
src/app/            Expo Router entry
src/screens/        App screens (index.jsx, community.jsx, auth.jsx, public-services.jsx)
src/theme/          Colours, dark mode, Easy view, language
lib/                Supabase client and storage
supabase/migrations Database schema, security rules and functions (run in order)
supabase/functions  Edge Function for the AI post writer
website/            Showcase site and live room page
```

## Run it locally
1. `npm install`
2. Create `.env` with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
   (Never commit `.env` or any secret key.)
3. Apply `supabase/migrations/*.sql` in order to your Supabase project.
4. `npx expo start --tunnel` and scan the QR code with Expo Go.

## Business model
- **Members:** free.
- **Organisations** (universities, settlement services, residences): pay for a dashboard and to reach volunteers.
- **Volunteers:** earn verified volunteer hours.

## Team
InfiniteLoop: 4 students, Montréal.
