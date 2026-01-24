import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig = {
    
    reactStrictMode: true,
};

export default nextConfig;
