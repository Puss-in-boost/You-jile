import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://geznqxtbmcdaawmynpff.supabase.co";
const secretKey = "sb_publishable_-TopyYKgup3yXRJKM94pdg_Q5y75LUI";
const userId = "e4ede1fc-7959-4b78-9365-b8512f25c236";
const newPassword = "youjile@666";

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  { password: newPassword }
);

if (error) {
  console.error("修改失败：", error.message);
  process.exit(1);
}

console.log("密码修改成功：", data.user.email);