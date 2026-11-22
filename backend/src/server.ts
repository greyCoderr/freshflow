import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
const env = loadEnv();
createApp(env).listen(env.PORT, () => console.log(`FreshFlow API on :${env.PORT}`));
