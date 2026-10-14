import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:60000,workers:1,fullyParallel:false,
  use:{baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{executablePath:process.env.SPROUT_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer']},screenshot:'only-on-failure'},
  webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},reporter:'list',
});
