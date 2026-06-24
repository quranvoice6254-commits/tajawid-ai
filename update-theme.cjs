const fs = require("fs");
const path = require("path");

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach((file) => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const files = walkSync("./src").filter((f) => f.endsWith(".tsx"));

const replacements = [
  // Backgrounds
  { regex: /bg-white/g, replacement: "bg-bg-secondary" },
  { regex: /bg-\[\#f7faf8\]/g, replacement: "bg-bg-primary" },
  { regex: /bg-zinc-50/g, replacement: "bg-bg-tertiary" },
  { regex: /bg-zinc-100/g, replacement: "bg-bg-tertiary" },
  { regex: /bg-emerald-50/g, replacement: "bg-brand-light" },
  { regex: /bg-emerald-light/g, replacement: "bg-brand-light" },
  { regex: /bg-emerald-primary\/10/g, replacement: "bg-brand-primary\/10" },
  { regex: /bg-emerald-primary\/5/g, replacement: "bg-brand-primary\/5" },
  { regex: /bg-emerald-primary/g, replacement: "bg-brand-primary" },

  // Texts
  { regex: /text-zinc-900/g, replacement: "text-text-primary" },
  { regex: /text-zinc-800/g, replacement: "text-text-primary" },
  { regex: /text-zinc-805/g, replacement: "text-text-primary" },
  { regex: /text-zinc-700/g, replacement: "text-text-secondary" },
  { regex: /text-zinc-600/g, replacement: "text-text-secondary" },
  { regex: /text-zinc-500/g, replacement: "text-text-muted" },
  { regex: /text-zinc-400/g, replacement: "text-text-muted" },
  { regex: /text-\[\#1e293b\]/g, replacement: "text-text-primary" },
  { regex: /text-emerald-primary/g, replacement: "text-brand-primary" },
  { regex: /text-emerald-700/g, replacement: "text-brand-primary" },
  { regex: /text-emerald-800/g, replacement: "text-brand-primary" },
  { regex: /text-emerald-900/g, replacement: "text-brand-primary" },
  { regex: /text-black/g, replacement: "text-text-primary" },

  // Borders
  { regex: /border-zinc-100/g, replacement: "border-border-primary" },
  { regex: /border-zinc-200/g, replacement: "border-border-primary" },
  { regex: /border-zinc-300/g, replacement: "border-border-primary" },
  { regex: /border-emerald-primary/g, replacement: "border-brand-primary" },

  // Custom outlines
  { regex: /outline-\[\#f7faf8\]/g, replacement: "outline-bg-primary" },

  // Group hover
  {
    regex: /group-hover:text-emerald-primary/g,
    replacement: "group-hover:text-brand-primary",
  },
  { regex: /hover:bg-emerald-50/g, replacement: "hover:bg-brand-light" },
];

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  let original = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated ${file}`);
  }
});
