import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const credsPath = path.join(process.cwd(), 'google-credentials.json');
  const exists = fs.existsSync(credsPath);
  
  res.status(200).json({ 
    message: "API is working",
    env: {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY
    },
    fallbackFile: {
      exists,
      path: credsPath
    }
  });
}