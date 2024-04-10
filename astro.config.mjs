import { defineConfig } from "astro/config";
import unocss from "@unocss/astro";
import mdx from "@astrojs/mdx";
import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  integrations: [unocss(), mdx(), playformCompress()]
});
