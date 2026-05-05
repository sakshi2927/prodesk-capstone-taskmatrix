# Deployment Checklist – Vercel

## Prerequisites
- Vercel account (free tier works; [vercel.com](https://vercel.com))
- GitHub/GitLab/Bitbucket repository with this code pushed
- Supabase project with:
  - Database schema created (`supabase/tasks.sql` applied)
  - Auth enabled
  - Public URL and anon key ready
- Google Gemini API key (free tier: [ai.google.dev](https://ai.google.dev))

---

## Step 1: Connect Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with your GitHub/GitLab/Bitbucket account
3. Select your repository (search for "my-app" or the repo name)
4. Click **Import**
5. Vercel will auto-detect this as a Next.js project
6. ✅ Leave defaults (no changes needed to build settings)

---

## Step 2: Configure Environment Variables

On the **Environment Variables** page, add the following **before** clicking **Deploy**:

### Public Variables (visible in browser)
| Name | Value | Source |
|------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ey...` (long string) | Supabase Settings > API > `anon` public key |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Set to "false" for production (uses real auth) |

### Secret Variables (server-only)
| Name | Value | Source |
|------|-------|--------|
| `GEMINI_API_KEY` | `AIza...` | [ai.google.dev/apikey](https://ai.google.dev/apikey) |

**Optional:**
- `GEMINI_MODEL` – defaults to `gemini-1.5-flash`; set to `gemini-2.0-flash` or `gemini-pro` if needed

---

## Step 3: Deploy

1. Click **Deploy**
2. Vercel builds your app (2–5 minutes)
3. Once green ✅, your app is live at `https://my-app-<random>.vercel.app`

---

## Step 4: Verify Deployment

1. Open your Vercel URL in Chrome
2. Test the **login/register** flow:
   - Register a new account
   - Check your email for Supabase confirmation (if real auth)
   - Log in
3. Test the **dashboard**:
   - Create a task
   - Click "Generate sub-steps" (uses Gemini API)
   - Verify the task saves to Supabase
4. Test **logout**

---

## Step 5: Run Lighthouse Audit (Performance & Accessibility)

1. Open your live Vercel URL in **Google Chrome**
2. Press **F12** → DevTools → **Lighthouse** tab
3. Select:
   - Device: **Mobile** (stricter scoring)
   - Categories: **Performance** + **Accessibility**
   - Click **Analyze page load**
4. **Target: 90+ in both categories**

### If scores are low (<90):
- **Performance issues:**
  - Chart now lazy-loads; ensure images are optimized
  - Check Network tab for large bundles
- **Accessibility issues:**
  - Verify all form inputs have `<label>` (they do)
  - Check color contrast ratios in your CSS variables
  - Ensure buttons have accessible labels

---

## Step 6: Custom Domain (Optional)

1. In Vercel project → **Settings** → **Domains**
2. Add your custom domain (e.g., `prodesk.com`)
3. Update DNS records per Vercel's instructions
4. Re-run Lighthouse on the custom domain

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Deploy fails with TypeScript errors | Check `npm run build` locally; fix errors before pushing |
| "Supabase is not configured" error on deployed app | Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel Environment Variables |
| "Gemini is not configured" when generating sub-steps | Verify `GEMINI_API_KEY` is set (server-side only, won't show in browser) |
| Lighthouse Performance <90 | Chart is now lazy-loaded (helps); check bundle sizes in Vercel Analytics |
| Lighthouse Accessibility <90 | Review color contrast in `globals.css` and ensure all interactive elements have labels |

---

## Build & Performance Summary

✅ **Production build**: Passes (Turbopack, Next.js 16.2.4)  
✅ **Code quality**: ESLint clean  
✅ **Chart optimization**: Recharts moved to lazy-loaded component (`dashboard-analytics-chart.tsx`)  
✅ **Accessibility**: Semantic HTML, form labels, ARIA attributes

---

## Quick Commands (for local testing before deploy)

```bash
# Production build
npm run build

# Start production server locally
npm start

# Lint check
npm run lint

# Development (with hot reload)
npm run dev
```

---

## Post-Deployment Monitoring

- **Vercel Analytics** → Check CWV (Core Web Vitals), LCP, FID
- **Supabase Console** → Monitor auth signups, database queries
- **Google AI Studio** (optional) → Track Gemini API calls and usage
