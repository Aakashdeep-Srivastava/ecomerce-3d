# Aavriti 3D Boutique - Shopify Liquid Section (OS 2.0)

This is a production-ready **Shopify Liquid section** featuring the 3D rotating rack, wooden hangers, centered Aavriti Lotus logo, and real-time GPU cloth waving and aerodynamic wind physics.

---

## 📁 File Structure

```text
shopify/
├── sections/
│   └── aavriti-3d-boutique.liquid      <-- The main Shopify section template & customizer schema
├── assets/
│   ├── aavriti-3d-boutique.css         <-- Scoped styling & responsive editorial layout
│   ├── aavriti-3d-boutique.js          <-- Vanilla Three.js 3D rack + GPU cloth wave shader
│   ├── aavriti-logo.png                <-- Centered transparent Aavriti lotus logo
│   ├── boutique-bg.png                 <-- Sunlit minimalist boutique interior background
│   ├── garment-rains.png               <-- Garment 1 (Waterproof Jacket)
│   ├── garment-yellow.png              <-- Garment 2 (Sunflower Yellow Kurti)
│   ├── garment-red.png                 <-- Garment 3 (Crimson Red Anarkali)
│   └── garment-black.png               <-- Garment 4 (Midnight Black Kurta)
└── preview/
    └── index.html                      <-- Standalone local preview to test immediately
```

---

## 🚀 How to Install in Your Shopify Store

You can install this into any Shopify theme (Dawn, Impulse, Prestige, Sense, etc.) in under 3 minutes:

### Step 1: Upload Assets
1. In your Shopify Admin, go to **Online Store** → **Themes**.
2. Click the **`...`** (Actions) menu next to your active theme → **Edit code**.
3. In the left sidebar, scroll down to the **Assets** folder and click **Add a new asset**.
4. Upload all files from `shopify/assets/`:
   - `aavriti-3d-boutique.css`
   - `aavriti-3d-boutique.js`
   - `aavriti-logo.png`
   - `boutique-bg.png`
   - `garment-rains.png`, `garment-yellow.png`, `garment-red.png`, `garment-black.png`

### Step 2: Create Section
1. In the left sidebar of the Code Editor, scroll to **Sections** and click **Add a new section**.
2. Name it `aavriti-3d-boutique.liquid`.
3. Delete any default code inside it and paste the entire contents of [`shopify/sections/aavriti-3d-boutique.liquid`](./sections/aavriti-3d-boutique.liquid).
4. Click **Save**.

### Step 3: Add to Your Homepage / Any Page
1. Go to **Online Store** → **Themes** → click **Customize** (Theme Editor).
2. Click **Add section** anywhere on your page.
3. Select **Aavriti 3D Boutique**.
4. Customize your products, images, titles, and prices directly in the sidebar!

---

## 🎨 Shopify Theme Customizer Options

- **Brand Logo**: Change the logo or adjust its height with the slider.
- **Boutique Background**: Swap the interior wallpaper/background image.
- **Product Blocks (up to 4)**:
  - Link to actual **Shopify Products** (inventory and prices link automatically!).
  - Override title, category tag, fabric spec, and description.
  - Upload custom cutout PNGs of dresses, gowns, kurtis, or shirts.
  - Direct 1-click **ADD TO CART** via Shopify's `/cart/add.js` AJAX API.

---

## 🖥️ Local Preview Testing
You can open [`shopify/preview/index.html`](./preview/index.html) in any web browser to see and interact with the exact Liquid section rendering without needing a live Shopify store.
