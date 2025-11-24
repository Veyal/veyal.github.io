# veyal.github.io – Redesign Reference Spec

This document captures the current content and functionality of **veyal.github.io** so another team can rebuild or redesign the experience without repeatedly inspecting the original codebase.

---

## 1. Tech Stack (current implementation)

- **Framework**: Next.js 14 App Router (TypeScript, server components + `"use client"` sections)
- **Styling**: Tailwind CSS with custom gradients, pastel colors, and Kirby-themed visuals
- **Animations**: framer-motion for hero/CTA animations and hover interactions
- **State/logic**: React hooks + Web APIs (`navigator.share`, `navigator.clipboard`, `localStorage`, FileReader, canvas)

If redesigning, the stack may change, but keep parity with features listed below.

---

## 2. Site Map & Key Screens

### 2.1 Landing Page (`/`)
Kirby-themed personal/portfolio home with sections (from `src/app/page.tsx`):
- **Hero**: “VEYAL'S DREAM LAND” title, animated stars, pastel gradients.
- **Character card**: Avatar, personal summary, social links (GitHub, LinkedIn, email, CV).
- **Tools Showcase**: Cards fed by `src/app/env/tools.json` (Encryptor, Password Generator, JSON Beautifier, AES Mode Detector, SplitBill OCR).
- **Feature Sections**:
  - Skills grid (Developer, Security, Learner, Fun, Artist, Shipper) with bullet lists.
  - Certifications carousel (OSCP, GMOB, CAP, CRTP, CPSA).
  - Timeline (“Story Mode”) with milestone cards.
  - “Kirby Dream Team” cards for collaboration roles (Security Engineer, Full Stack Engineer, Purple Team, Product Designer, Cyber Storyteller).
- **Contact CTA**: Buttons with emojis, email CTA (“email me”), hero text showing friendly tone.

### 2.2 Tools Layout (`/tools/*`)
- Shared pastel navigation with animated background, back-to-home button, tool pills, dropdown for remaining tools.
- Mobile vs desktop behavior: only a subset of tools shown inline; rest accessible via dropdown.

### 2.3 Tool Pages
Current ready tools include:
1. **Encryptor** (`/tools/encryptor`) – not inspected in detail here but available via JSON config.
2. **Password Generator** – warns about missing dependency in lint but currently part of suite.
3. **JSON Beautifier** – textareas for input/output, copy button, Kirby-flavored alerts.
4. **AES Mode Detector** – similar styling as other tools.
5. **SplitBill OCR** (`/tools/splitbill`) – most complex tool; detailed below.

---

### 2.4 Character Card & Stats
- **Profile**: Displays “Andrew Salim”, handle `@Veyal`, profile image `/profile.png`, and a “LV. 1” badge.
- **Portfolio Buttons**: “🏰 Portfolio” (links to https://veyal.github.io) and “💼 LinkedIn” (https://www.linkedin.com/in/andrew-salim/).
- **Player Stats**: Attack ★★★★★, Defense ★★★★★, Speed ★★★★☆, Intelligence ★★★★★ (text strings should be carried over).

### 2.5 Ability Badges
- Under “⭐ COLLECTED ABILITIES ⭐” there are three cards:
  1. 🔐 “Security Rookie” – caption “Learning to Hack!”
  2. 💻 “Code Beginner” – caption “Still Googling!”
  3. 🤿 “Ocean Newbie” – caption “Can Hold Breath!”

### 2.6 Stage Select (Tools)
- Each tool tile displays a stage number badge, icon (from `tools.json`), tool name, and status (► PLAY for ready, “🔨 BUILDING”/“🔒 LOCKED” otherwise). Preserve this playful copy even if the redesign changes visuals.

### 2.7 Achievement Gallery
- Carousel heading “🏆 ACHIEVEMENT GALLERY 🏆” with subtitle “Collected power-ups and badges!”.
- Each certification card shows abbreviation, organization, issue date, and icon (pulled from `certifications.json`). “NEW!” badge appears for entries flagged as AWS-CCP in code.

---

## 3. SplitBill OCR Tool (primary focus)

### 3.1 UX Flow
1. **Hero Section**
   - Title: “Kirby-fied Receipt Splitter”.
   - Description invites users to upload receipts, share bills with friends, and emphasizes pastel/Kirby theme.
   - Settings button opens “Kirby AI Configuration” modal for API credentials.
   - Share-config button copies shareable URL encoding credentials.
   - Optional info badges: config loaded from URL, config copied notice.
   - Quality tier cards (“Kirby Lite”, “Kirby Balanced”, “Kirby Precision”, “Kirby Ultra”) with descriptions and token budgets (~2.2k, 3.2k, 4.5k, 16k tokens). Cards highlight active tier.

2. **Stepper Navigation**
   - Steps: Upload, Review, Add people, Assign items, Results.
   - Each pill shows icon, label, and description; clicking allows navigating back (forward allowed only if prerequisites satisfied).

3. **Step 1: Upload Receipt**
   - Drag-and-drop zone with dashed border.
   - Hidden file input triggered by “Browse files”.
   - After upload: preview image, buttons for Remove, Crop receipt, Reset crop (if cropped), Analyze Receipt.
   - Tip text (“Tap Crop to outline the receipt ...”).

4. **Cropping Modal**
   - Polygon-based cropper with four draggable handles (default rectangle), pointer interactions.
   - Shows approximate selection size (display px & natural px).
   - Buttons: Reset handles, Cancel, Apply crop (disabled until selection valid), spinner while cropping.
   - Cropping uses canvas to clip polygon and generate new PNG `File`.

5. **Azure Settings Modal (Kirby AI Configuration)**
   - Inputs: endpoint, API key, API version (default `2025-01-01-preview`), deployment name (default `gpt-5-mini`), quality tier selector with same labels as hero.
   - Provider toggle lets user choose between **Azure OpenAI** and **Google Gemini**:
     - Azure requires endpoint + API key + deployment.
     - Gemini requires API key + model (default `gemini-1.5-flash-latest`).
   - Copy shareable config uses URL query params (includes provider-specific keys).
   - Config persisted via `localStorage` key `splitbill.kirby-config`.

6. **Prompt / OCR Logic**
   - Sends to Azure OpenAI via `fetch` POST to `<endpoint>/openai/deployments/<deployment>/chat/completions?api-version=2025-01-01-preview`.
   - Supports quality tiers controlling `max_completion_tokens`; uses `temperature` only for non GPT-5 deployments due to API limits.
   - Prompt stored in constant `RECEIPT_PROMPT`:
     - Describes role (“receipt parsing and reconstruction expert”).
     - Input issues (OCR noise) and instructions for cleaning.
     - Output schema with fields including `discount`.
     - Rules for restaurant info, multi-line items, charges/totals, extra charges, NYC-specific instructions, number normalization, etc.
     - Discount rules: negative amounts, percentages -> 0, sum multiple lines.
     - Number cleanup: treat IDR separators as formatting.
     - Output must be strict minified JSON.

7. **Review Step**
   - Card with restaurant info, address, date, “Parsed via Kirby Vision · <tier>”.
   - Bill summary showing subtotal, service charge, tax, extra charges each with currency, discount row (green) if discount ≠ 0, total, and a warning if computed totals invalid.
   - Extracted items list with name + price.

8. **Add People Step**
   - Form to add participant names. Press Enter or click “Add person”.
   - Chips display added names (Kirby colors).
   - “Headcount preview” card summarizing count.
   - Buttons to go back to review or proceed (disabled if no people).

9. **Assignment Step**
   - Left column lists items; clicking opens modal to assign percentages to people using sliders/text inputs (ensures sum = 100%).
   - Right column “Assignment summary” shows per-person assigned subtotal.
   - “Calculate fair split” button (disabled if any item unassigned). “Start over” resets.

10. **Results Step**
    - Card per person: avatar (colored circle with initial), list of items with percentages, breakdown (items subtotal, service charge, tax, extra charges, discount line if applicable), total owed.
    - Bottom summary card shows total paid and buttons: “Share bill” (invokes `navigator.share` with automatic clipboard fallback) & “Start another receipt”.
    - Shared text includes per-person breakdown plus grand total; success toasts show either “Shared bill via system share sheet” or “Bill summary copied to clipboard”.

### 3.2 Key Data & Calculations
- `ReceiptData`: restaurant, address, date, array of `items` (with `name`, `total`, `percentages`), `subtotal`, `serviceCharge`, `tax`, `discount`, `extraCharges`, `total`, computedTotal, flags.
- `people`: list of `{ name, color }`.
- Assignment stores `assignedTo` list + `percentages` map per item.
- Splitting algorithm:
  - Each person `subtotal` = sum of assigned item totals by percentage.
  - Proportional distribution of service charge, tax, extra charges, discount (demonstrated by mapping to each person based on `subtotal / totalSubtotal`).
  - Person total = subtotal + serviceCharge share + tax share + extraCharges share + discount share.

### 3.3 Interactions & Edge Cases
- Autosaves configs; shareable URL preloads settings via query params.
- Handles duplicate names (restriction).
- Ensures polygon crop selection minimum size; adhesives for pointer capture to support mobile.
- Stepper ensures prerequisites (e.g., can't jump to assignment without people + receipt).
- Lint warnings only in password generator (hook dependency).

---

## 4. Textual Content for Redesign

### Hero / CTA Text (Landing)
- “VEYAL'S DREAM LAND”
- Subtext copy: encourages “explore security, code, and pastel missions.”
- Buttons: GitHub, LinkedIn, Email, Download CV (“Kirby CV”).
- Character stats labels (Attack/Defense/Speed/Intelligence) and ability badge copy (Security Rookie, Code Beginner, Ocean Newbie).
- Handle shown as `@Veyal`.

### Tools Section Titles
- “Power-Up Station” header.
- Tool cards text:
  - “Encryptor – Protect treasures.”
  - “Password Generator – Kirby-worthy passwords.”
  - “JSON Beautifier – Poyo! Prettify your JSON.”
  - “AES Mode Detector – Detect encryption modes.”
  - “SplitBill OCR – Kirby-friendly bill splitter.”

### SplitBill-specific text (non exhaustive):
- Quality tiers: “Kirby Lite”, “Kirby Balanced”, “Kirby Precision”, “Kirby Ultra”.
- Provider selector labels: “Azure OpenAI” and “Google Gemini”.
- Tips: “Tap Crop to outline the receipt…”
- Buttons/labels: “Kirby AI Settings”, “Share Kirby config”, “Step X · {title}”, “Items total”, “Service charge”, “Discount”, etc.
- Final CTA: “Total paid · …”, “Share bill”, “Start another receipt”.

### Prompts & Warnings
- “Configure Kirby AI credentials first.” when missing API data.
- “Upload a receipt before cropping/analyzing.”
- Stepper status text for each stage (Upload receipt, Review, Add people, Assign items, Results).
- Encryptor/AES detector validation errors (“Please enter text to encrypt”, “This mode requires an IV”, “Invalid Base64 input”, etc.).
- JSON Beautifier error: “Invalid JSON format”.
- Password generator copy success alert (“Password copied to clipboard!”).

---

## 5. Detailed Tool Specs (Beyond SplitBill)

### 5.1 Encryptor (`/tools/encryptor/`)
- AES encrypt/decrypt playground powered by `crypto-js`.
- Mode selector (AES-CBC/CFB/CTR/OFB/ECB) with IV requirement indicator.
- Textareas for plaintext (left) and ciphertext (right), copy button, base64 toggle.
- Key and IV inputs (text-based).
- Error handling for missing inputs, invalid Base64, failed decryption.

### 5.2 Password Generator (`/tools/password-generator/`)
- Length slider (4–32), toggles for alphabet/numbers/special chars.
- Custom characters field appended to pool.
- Generated password shows in read-only input with copy button and “Generate New Password” CTA.
- Auto-regenerates when switches/slider/custom chars change.

### 5.3 JSON Beautifier (`/tools/json-beautifier/`)
- Dual-pane layout: input textarea, output textarea.
- “Beautify” button pretty-prints JSON with indentation.
- Copy button on output; Kirby-flavored alert text `(>^_^)> Poyo! ...`.
- Displays parsing errors in output area (red text).

### 5.4 AES Mode Detector (`/tools/aes-mode-detector/`)
- Accepts ciphertext/key/IV with format selectors (hex/base64/utf8).
- Tests multiple AES key sizes & modes (ECB/CBC/CFB/OFB/CTR for 128/192/256).
- Shows card per mode with success/failure, decrypted preview, confidence meter.
- Buttons for detection, loading state with shield-themed icons.

### 5.5 SplitBill OCR (`/tools/splitbill/`)
- Wizard described in §3 (upload → review → people → assignment → results).
- Features polygon cropping, dual provider support (Azure OpenAI `gpt-5-mini` or Google Gemini `gemini-1.5-flash-latest`), share/copy summary, discounts, tier selection, etc.

---

## 6. Accessibility & Responsive Notes

- Mobile uses simplified navigation pills (only key tools shown).
- Crop handles sized for touch; share/copy fallback ensures functionality without Web Share API.
- Pastel palette uses high-contrast text (white on gradient backgrounds).
- Animations could be reduced for motion-sensitive users (currently not implemented; consider `prefers-reduced-motion` in redesign).

---

## 7. Assets & Data

- Fonts: uses system fonts via Tailwind (no custom font import).
- Images (`/public` + `/out`):
  - `profile.png`
  - Certification icons: `oscp.png`, `gmob.png`, `cap.png`, `crt.png`, `cpsa.png`
- JSON data:
  - `src/app/env/tools.json` lists paths/names of tools.
  - `src/app/env/certifications.json` (not shown but referenced on home).
  - `src/app/env/tools.json` used for navigation/hero cards.

---

## 8. Feature Checklist for Rebuild

- [ ] Pastel Kirby theme applied site-wide.
- [ ] Landing hero, skills, certifications, timeline, team cards, contact CTA.
- [ ] Tools nav with dropdown and “Power-Up Station” styling.
- [ ] SplitBill wizard with steps:
  - Upload (drag-drop, hidden input, cropping modal, analyze button)
  - Review (info card, bill summary, items list)
  - People (add/remove chips)
  - Assignment (list + modal + summary)
  - Results (per-person cards, share/copy ability)
- [ ] Kirby AI settings with localStorage persistence and shareable URLs.
- [ ] Quality tier selection with descriptions and token max values.
- [ ] OCR prompt logic and API call to Azure `gpt-5-mini` (2025-01-01-preview).
- [ ] Additional share/copy summary functionality.
- [ ] Discount/extra charge support in UI and calculations.
- [ ] `navigator.share` fallback path to clipboard.
- [ ] Crop polygon functionality with canvas export.

---

This spec should enable a designer/dev to recreate the experience with any design language while retaining functionality, copy, and integration points. Adjust styling and interactions as desired, but maintain content parity unless changes are explicitly approved.
