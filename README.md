# Shop Celino — storefront

Headless storefront for **shopcelino.com**.

- Next.js (App Router) + TypeScript + Tailwind CSS
- Data source: the Shop Celino WordPress + WooCommerce backend (no local/dummy product data)
- Hosting: Vercel, auto-deploys from `main`

## Local setup

```bash
cp .env.example .env.local   # fill in WooCommerce details
npm install
npm run dev
```

WooCommerce keys are used server-side only and must never be exposed to the browser.
