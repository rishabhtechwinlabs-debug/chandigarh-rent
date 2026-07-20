# 📍 `chandigarh.rent` — Rent Transparency & No-Brokerage Platform for Tricity

A modern, open-source, crowdsourced rental price transparency web application for **Chandigarh, Mohali, and Panchkula** inspired by `bengaluru.rent`.

---

## ⚡ Key Features

1. **Interactive Leaflet Map**: Pre-loaded with seed rental data across Chandigarh Sectors (15, 22, 34, 35, 36, 43, 7, 8) & Mohali (Phases 3B2, 7, 10, Sectors 70, 71, 68, 125 Kharar).
2. **🟢 Drop Anonymous Rent**: Renters post what they actually pay so newcomers know true market prices without broker inflation.
3. **🔵 Direct Owner Listings (Zero Brokerage)**: Owners & tenants post available flats or room openings with direct call buttons.
4. **🟣 Flat Seeker Pins**: Drop a seeker pin specifying your BHK preference, target budget, and move-in timeline.
5. **🟡 Spot a "To-Let" Board**: Upload details of To-Let boards spotted around street corners to help fellow flat hunters skip brokers.
6. **📊 Sector Rent Benchmark & Analytics**: Instant calculation of average 1BHK/2BHK/3BHK rent, landlord sentiment ratings, and gated society percentages across sectors.
7. **🌙 Dark / Light Glassmorphism Theme**: Sleek modern UI built with custom CSS tokens and CARTO dark/light map tiles.

---

## 🌐 100% Free-to-Host Architecture

This application uses a zero-cost stack that operates 100% on free tiers without credit card requirements or API billing charges:

| Layer | Provider / Tech | Cost |
| :--- | :--- | :--- |
| **Frontend SPA** | HTML5, Vanilla CSS Design Tokens, Modular JS | **$0** |
| **Hosting & CDN** | Vercel / Netlify / Cloudflare Pages | **$0 / mo** |
| **Map Rendering** | Leaflet.js + CARTO Dark Matter & Voyager Tiles | **$0 / mo (No API Key required)** |
| **Storage & Persistence** | Browser LocalStorage + Supabase REST Ready | **$0 / mo** |

---

## 🚀 How to Run Locally

Because `chandigarh.rent` uses standard ES web standards and Leaflet CDN, you can run it immediately without any npm build step!

### Method 1: Using Python HTTP Server (Built-in)
```bash
# Run inside the project directory:
python3 -m http.server 3000
```
Then open your browser at: `http://localhost:3000`

### Method 2: Using Node.js `npx serve`
```bash
npx serve .
```

---

## ☁️ How to Deploy Online for Free ($0 / Month)

### Option 1: Deploy on Vercel (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Click **Deploy**. Vercel will automatically host `chandigarh.rent` on a custom `.vercel.app` domain for free!

### Option 2: Deploy on Netlify
1. Go to [Netlify.com](https://netlify.com).
2. Drag and drop the `chandigarh_rent` folder into the Netlify drop zone.
3. Your app will immediately go live on a custom `.netlify.app` domain!

### Option 3: Deploy on Cloudflare Pages
1. Go to Cloudflare Dashboard -> **Workers & Pages**.
2. Connect your GitHub repository.
3. Set build directory to `./` and click **Save and Deploy**.

---

## 🗄️ How Store & Share User Data Across All Visitors (Free Supabase Backend)

By default, any pin a user drops is stored in their browser's **LocalStorage** so it persists across refreshes instantly.

To make all submitted pins sync globally across every visitor on the web in real-time, connect a **100% Free Supabase Database**:

1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project and open the **SQL Editor**.
3. Run this 1-click table query:
```sql
create table pins (
  id text primary key,
  type text not null,
  city text,
  sector text,
  lat numeric,
  lng numeric,
  bhk text,
  rent numeric,
  budget numeric,
  maintenance numeric,
  deposit numeric,
  furnished text,
  gated text,
  rating numeric,
  review text,
  "desc" text,
  "tenantPref" text,
  "ownerType" text,
  "contactName" text,
  phone text,
  contact text,
  "moveDate" text,
  profile text,
  notes text,
  date text
);

-- Enable public read & insert access
alter table pins enable row level security;
create policy "Allow public read" on pins for select using (true);
create policy "Allow public insert" on pins for insert with check (true);
```
4. Copy your **Project URL** and **anon Key** from `Project Settings -> API`.
5. Open `js/data.js` and paste them into `window.SUPABASE_CONFIG`:
```javascript
window.SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key'
};
```
Now every user pin dropped anywhere in the world will automatically get stored and synced across all visitors live!

---

## 📱 Mobile & Tablet Responsive
Designed with floating bottom action bars for mobile devices and collapsible filter drawers for seamless desktop browsing.
