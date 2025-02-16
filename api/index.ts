import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVideo } from '../src/index.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Function started, method:', req.method);
  
  try {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET' && req.url === '/health') {
      return res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      console.log('POST request received');
      try {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        const { script } = req.body;
        
        if (!script || typeof script !== 'string') {
          console.log('Invalid script:', script);
          return res.status(400).json({ 
            success: false, 
            error: 'Script is required in request body' 
          });
        }

        console.log('Starting video generation with script:', script);
        
        // Check environment variables
        console.log('Environment check:', {
          SYNC_API_KEY: !!process.env.SYNC_API_KEY,
          ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY
        });
        
        const videoUrl = await generateVideo(script);
        console.log('Video generation complete, URL:', videoUrl);
        
        return res.json({ 
          success: true, 
          videoUrl,
          status: 'completed'
        });
      } catch (error) {
        console.error('Error in POST handler:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unhandled server error',
      status: 'failed'
    });
  }
} 