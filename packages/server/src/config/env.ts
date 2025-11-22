import path from 'path';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(__dirname, `../../../../${envFile}`); // Adjust path: src/config/env.ts -> packages/server/src/config -> packages/server/src -> packages/server -> root

console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });
