#!/usr/bin/env node
// Scaffolds templates/<id>/ from scripts/template-kit/. Run via
// `npm run new:template -- <id> --category <marriage|reception|birthday|other>`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const KIT_DIR = path.join(ROOT, "scripts", "template-kit");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const ASSETS_MD_PATH = path.join(ROOT, "ASSETS.md");

// Must match src/lib/categories.ts -- duplicated here because this script
// is plain Node (no TS build step) and templates/ tooling has always been
// scripts/*.mjs reading JSON directly, not importing from src/.
const CATEGORIES = ["marriage", "reception", "birthday", "other"];

function usageError(message) {
  console.error(`✗ ${message}`);
  console.error("\nUsage: npm run new:template -- <id> --category <marriage|reception|birthday|other>");
  process.exit(1);
}

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const categoryIndex = args.indexOf("--category");
const category = categoryIndex >= 0 ? args[categoryIndex + 1] : undefined;

if (!id) usageError("missing <id>");
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) usageError(`"${id}" must be lowercase letters, digits, and hyphens only`);
if (!category) usageError("missing --category");
if (!CATEGORIES.includes(category)) usageError(`--category must be one of: ${CATEGORIES.join(", ")}`);

const designDir = path.join(TEMPLATES_DIR, id);
if (fs.existsSync(designDir)) usageError(`templates/${id}/ already exists -- choose a different id`);

function titleCase(slug) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
const title = titleCase(id);
const scaffoldDate = new Date().toISOString().slice(0, 10);

// ---------- directories ----------
fs.mkdirSync(path.join(designDir, "template"), { recursive: true });
fs.mkdirSync(path.join(designDir, "assets", "js"), { recursive: true });

// ---------- template/index.html: copy the canonical engine, substitute placeholders ----------
let engineHtml = fs.readFileSync(path.join(KIT_DIR, "engine.html"), "utf8");
engineHtml = engineHtml
  .replaceAll("__SCAFFOLD_DATE__", scaffoldDate)
  .replaceAll("__DESIGN_ID__", id)
  .replaceAll("__TITLE__", title);
fs.writeFileSync(path.join(designDir, "template", "index.html"), engineHtml);

// ---------- assets: vendor JS + the one original placeholder graphic ----------
for (const file of ["gsap.min.js", "ScrollTrigger.min.js"]) {
  fs.copyFileSync(path.join(KIT_DIR, "assets", "js", file), path.join(designDir, "assets", "js", file));
}
fs.copyFileSync(
  path.join(KIT_DIR, "assets", "cover-placeholder.svg"),
  path.join(designDir, "assets", "cover-placeholder.svg")
);

// ---------- meta.json ----------
const meta = {
  id,
  title,
  category,
  // Deliberately false even though the only asset shipped so far (the
  // placeholder SVG) is already clean -- "licensed" means "ready to sell",
  // and this stub isn't (generic gradients, no real beat art, placeholder
  // copy). Flip to true once this design's own real assets are logged
  // below with nothing left UNLICENSED.
  licensed: false,
  previewImage: "assets/cover-placeholder.svg",
  share: {
    titleFields: ["person1Name", "person2Name"],
    titleJoiner: " & ",
    dateField: "ceremonyDate",
    locationField: "ceremonyVenue"
  }
};
fs.writeFileSync(path.join(designDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

// ---------- schema.json ----------
const schema = [
  { key: "person1Name", label: "First person's name", type: "text", section: "The couple", required: true },
  { key: "person2Name", label: "Second person's name", type: "text", section: "The couple", required: true },
  {
    key: "coverPhoto",
    label: "Cover photo",
    type: "photo",
    section: "Photos",
    hint: "Optional. Until you add one, a placeholder icon is shown instead.",
    clearLabel: "Use the placeholder instead",
    clearTo: ""
  },
  {
    key: "ceremonyDate",
    label: "Ceremony date and time",
    type: "date",
    section: "The ceremony",
    required: true,
    hint: "Drives the welcome screen, the date card and the countdown. Interpreted in Indian Standard Time (IST, +05:30)."
  },
  { key: "ceremonyVenue", label: "Ceremony venue", type: "text", section: "The ceremony", required: true },
  {
    key: "ceremonyMap",
    label: "Google Maps link (optional)",
    type: "url",
    section: "The ceremony",
    hint: "Leave blank to hide the Directions button."
  },
  {
    key: "events",
    label: "Schedule",
    type: "list",
    section: "Celebrations",
    hint: "Shown on one schedule page. Add up to 5.",
    maxItems: 5,
    itemFields: [
      { key: "name", label: "Event name", type: "text", required: true, maxLength: 40 },
      { key: "date", label: "Date and time", type: "date", required: true },
      { key: "venue", label: "Venue", type: "text", maxLength: 60 },
      { key: "place", label: "Town / city", type: "text", maxLength: 40 },
      { key: "map", label: "Google Maps link (optional)", type: "url", hint: "Leave blank to hide the Directions button for this event." }
    ]
  },
  {
    key: "wishes",
    label: "Best wishes from",
    type: "list",
    section: "Families & wishes",
    hint: "Leave empty to hide this part of the page.",
    maxItems: 6,
    itemFields: [
      { key: "role", label: "Relation", type: "text", required: true, maxLength: 24 },
      { key: "name", label: "Name", type: "text", required: true, maxLength: 40 }
    ]
  },
  {
    key: "contacts",
    label: "Contacts",
    type: "list",
    section: "Contacts",
    hint: "Shown as tap-to-call cards. Leave empty to hide this card.",
    maxItems: 6,
    itemFields: [
      { key: "name", label: "Name", type: "text", required: true, maxLength: 30 },
      { key: "phone", label: "Phone", type: "tel", required: true }
    ]
  },
  { key: "hashtag", label: "Hashtag", type: "text", section: "Contacts" }
];
fs.writeFileSync(path.join(designDir, "schema.json"), JSON.stringify(schema, null, 2) + "\n");

// ---------- defaults.json: dummy data only, never real people ----------
const defaults = {
  person1Name: "Alex",
  person2Name: "Sam",
  coverPhoto: "",
  ceremonyDate: "2027-12-18T10:30",
  ceremonyVenue: "Venue Name, City",
  ceremonyMap: "",
  events: JSON.stringify([
    { name: "Ceremony", date: "2027-12-18T10:30", venue: "Venue Name", place: "City", map: "" },
    { name: "Reception", date: "2027-12-18T18:00", venue: "Venue Name", place: "City", map: "" }
  ]),
  wishes: JSON.stringify([{ role: "Friend", name: "Dummy Name" }]),
  contacts: JSON.stringify([{ name: "Contact Name", phone: "9000000000" }]),
  hashtag: "#YourHashtagHere"
};
fs.writeFileSync(path.join(designDir, "defaults.json"), JSON.stringify(defaults, null, 2) + "\n");

// ---------- ASSETS.md: append a new section ----------
const assetsMdEntry = `\n## templates/${id}/\n\nScaffolded from scripts/template-kit/ on ${scaffoldDate}. No stock photos yet --\nonly original artwork made for this project. Add a row here for every real\nimage/video/font/music file before setting "licensed": true in meta.json.\n\n| File | Used for | Status |\n| --- | --- | --- |\n| \`assets/cover-placeholder.svg\` | Default cover-photo placeholder (shown until a real photo is uploaded) | Original artwork, made for this project. No licence needed. |\n\nNot sample media, tracked separately because it's already properly licensed\nopen-source code, not placeholder content:\n\n| File | Licence |\n| --- | --- |\n| \`assets/js/gsap.min.js\`, \`assets/js/ScrollTrigger.min.js\` | GSAP (GreenSock); verify current terms at gsap.com before shipping |\n| Google Fonts: Cormorant Garamond, Manrope (loaded via \`fonts.googleapis.com\`, not bundled) | Google Fonts, SIL Open Font License 1.1 |\n`;
fs.appendFileSync(ASSETS_MD_PATH, assetsMdEntry);

// ---------- per-template README.md stub ----------
const readme = `# ${title}

Scaffolded from \`scripts/template-kit/\` on ${scaffoldDate}. This is a stub --
7 generic beats with no real art yet, built on the shared engine (see
TEMPLATES.md). Nothing here is ready to sell until the TODOs below are done.

## TODO before this design is real
- [ ] Replace the 7 \`--grad-N\` CSS gradients in \`template/index.html\` with
      real photography (see \`npm run prep:image\` for resizing to the right
      aspect) -- or keep gradients deliberately, if that's the look.
- [ ] Replace the EDIT-ME placeholder quote line in beat 1.
- [ ] Decide this design's own theme tokens (colours, fonts) at the top of
      \`template/index.html\` -- the shipped values are a neutral placeholder.
- [ ] If this is a Birthday (or otherwise non-couple) design, rework
      \`person1Name\`/\`person2Name\` into a single-celebrant shape in
      \`schema.json\`, \`defaults.json\`, and every \`{{person1}}\`/\`{{person2}}\`
      binding in \`template/index.html\`.
- [ ] Replace every dummy value in \`defaults.json\` with this design's own
      invented placeholder data (never a real person's details).
- [ ] Log every new asset in \`ASSETS.md\` with its source and licence, then
      set \`"licensed": true\` in \`meta.json\` once nothing is left UNLICENSED.
- [ ] \`npm run check:templates\` and \`npm run qa:template -- ${id}\` both pass.
`;
fs.writeFileSync(path.join(designDir, "README.md"), readme);

console.log(`✓ Scaffolded templates/${id}/`);
console.log("\nNext steps:");
console.log(`  npm run check:templates     # should pass now (licensed: false is expected)`);
console.log(`  npx next dev -p 3100        # then open /design/${id}`);
console.log(`  See templates/${id}/README.md for the TODO list.`);
