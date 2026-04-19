const fs = require('fs');

const path = "c:\\Users\\Swanand Dixit\\Downloads\\lumina\\lumina\\app\\(app)\\ai\\page.tsx";
let content = fs.readFileSync(path, 'utf8');

// Replace massive headings
content = content.replace(/text-6xl/g, "text-3xl");
content = content.replace(/text-5xl/g, "text-3xl");
content = content.replace(/text-4xl/g, "text-2xl");

// Fix font weights
content = content.replace(/font-black/g, "font-semibold");
content = content.replace(/font-extrabold/g, "font-bold");
content = content.replace(/font-bold/g, "font-medium");

// Fix custom text sizes
content = content.replace(/text-\[10px\]/g, "text-xs");
content = content.replace(/text-\[11px\]/g, "text-xs");
content = content.replace(/text-\[12px\]/g, "text-xs");
content = content.replace(/text-\[14px\]/g, "text-sm");
content = content.replace(/text-\[16px\]/g, "text-base");
content = content.replace(/text-\[20px\]/g, "text-lg");

// Fix tracking
content = content.replace(/tracking-\[[^\]]+\]/g, "tracking-wider");
content = content.replace(/tracking-tighter/g, "tracking-tight");

// Fix prose text sizes (markdown bodies)
content = content.replace(/prose-2xl/g, "prose-base");
content = content.replace(/prose-lg/g, "prose-base");

// Make bubbles look cleaner by removing some opacity overrides
content = content.replace(/opacity-90/g, "opacity-100");
content = content.replace(/opacity-40/g, "opacity-70");

fs.writeFileSync(path, content, 'utf8');
console.log("Done");
