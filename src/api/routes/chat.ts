import { Router } from 'express';
import { z } from 'zod';
import { HotelAgentService } from '../../agents/hotel_agent_service';

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().optional()
});

const router = Router();

const agentService = new HotelAgentService();

router.post('/', async (req, res) => {
  try {
    const validation = chatSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation error',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      return;
    }

    const { message, sessionId } = validation.data;

    const result = await agentService.route(message);

    console.log(`Chat response for session ${sessionId || 'default'}:`, result);

    res.json({
      response: result.response,
      skill: result.skill,
      sessionId: sessionId || 'default'
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('API key') || errorMessage.includes('OpenAI')) {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'AI service is not available. Please check configuration.'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal error',
      message: 'Failed to process your request. Please try again.'
    });
  }
});

export { router as chatRouter };