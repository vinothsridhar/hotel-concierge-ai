import express, { Express } from 'express';
import { chatRouter } from './routes/chat';

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/chat', chatRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

export function startApiServer(): void {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  });
}

export { app };