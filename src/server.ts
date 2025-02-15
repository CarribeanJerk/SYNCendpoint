import express from 'express';
import type { RequestHandler } from 'express';
import { generateVideo } from './index';  // We'll modify index.ts to export this function

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

interface GenerateRequest {
  script: string;
}

const generateHandler: RequestHandler<{}, any, GenerateRequest> = async (req, res) => {
  try {
    const { script } = req.body;
    
    if (!script || typeof script !== 'string') {
      res.status(400).json({ error: 'Script is required in request body' });
      return;
    }

    const videoPath = await generateVideo(script);
    res.json({ success: true, videoPath });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate video' });
  }
};

app.post('/generate', generateHandler);

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
}); 