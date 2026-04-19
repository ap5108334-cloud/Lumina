import re

path = r"c:\Users\Swanand Dixit\Downloads\lumina\lumina\app\(app)\ai\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace massive headings
content = content.replace("text-6xl", "text-3xl")
content = content.replace("text-5xl", "text-3xl")
content = content.replace("text-4xl", "text-2xl")

# Fix font weights
content = content.replace("font-black", "font-semibold")
content = content.replace("font-extrabold", "font-bold")
content = content.replace("font-bold", "font-medium")

# Fix custom text sizes
content = content.replace("text-[10px]", "text-xs")
content = content.replace("text-[11px]", "text-xs")
content = content.replace("text-[12px]", "text-xs")
content = content.replace("text-[14px]", "text-sm")
content = content.replace("text-[16px]", "text-base")
content = content.replace("text-[20px]", "text-lg")

# Fix tracking
content = re.sub(r'tracking-\[[^\]]+\]', 'tracking-wider', content)
content = content.replace("tracking-tighter", "tracking-tight")

# Fix prose text sizes (markdown bodies)
content = content.replace("prose-2xl", "prose-base")
content = content.replace("prose-lg", "prose-base")

# Make bubbles look cleaner by removing some opacity overrides
content = content.replace("opacity-90", "opacity-100")
content = content.replace("opacity-40", "opacity-70")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
