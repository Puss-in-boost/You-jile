import fs from "node:fs";
import process from "node:process";
import { config } from "dotenv";

for (const candidate of [".env.local", ".env"]) {
  if (fs.existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
}

const major = Number(process.versions.node.split(".")[0]);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const database = process.env.DATABASE_URL?.trim();

console.log(`Node ${process.versions.node} ${major === 22 || major === 24 ? "✓" : "(建议使用 Node 22 LTS)"}`);
console.log(`Supabase URL ${supabaseUrl ? "✓" : "✗"}`);
console.log(`Publishable key ${publishable ? "✓" : "✗"}`);
console.log(`DATABASE_URL ${database ? "✓（本地/API兼容模式）" : "未设置（Supabase 直连模式正常）"}`);

for (const file of ["public/icon-192.png", "public/icon-512.png", "public/apple-touch-icon.png"]) {
  console.log(`${file} ${fs.existsSync(file) ? "✓" : "✗"}`);
}

if (!supabaseUrl || !publishable) {
  console.error("\n当前无法进入云端账本：请在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。");
  process.exitCode = 1;
} else {
  console.log("\n基础配置通过。运行 npm run dev 即可使用云端账本。");
}
