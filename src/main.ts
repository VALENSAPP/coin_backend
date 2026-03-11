import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Server, Socket } from 'socket.io';
import { PostService } from './post/post.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get PostService instance
  const postService = app.get(PostService);

  // Webhooks need raw body for signature verification
  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));
  app.use('/kyc/webhook', bodyParser.raw({ type: '*/*' }));
  app.use('/sumsub-verification/webhook', bodyParser.raw({ type: '*/*' }));
app.use('/sumsub-user_verification/webhook', bodyParser.raw({ type: '*/*' }));
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Serve static files from the public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Serve .well-known files with correct content type
  app.useStaticAssets(join(__dirname, '..', 'public', '.well-known'), {
    prefix: '/.well-known/',
    setHeaders: (res, path) => {
      if (path.endsWith('apple-app-site-association')) {
        res.setHeader('Content-Type', 'application/json');
      }
    }
  });

  app.useGlobalInterceptors(new ResponseInterceptor());
  setupSwagger(app);

  const port = process.env.PORT || 3002;
  const host = process.env.HOST || '0.0.0.0';

  // Start HTTP server
  await app.listen(port, host);

  // Initialize Socket.IO server
  const io = new Server(app.getHttpServer(), {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.IO connection handling
  const connectedUsers = new Map<string, string>(); // userId -> socketId

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    if (userId) {
      connectedUsers.set(userId, socket.id);
    }

    // Handle getUserChatBox
   socket.on('getUserChatBox', async (data: any) => {
  try {
    // FIX: parse JSON string if necessary
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

     console.log('getUserChatBox payload:', data, data.userId);

    const userId = data.userId;

    const chatBoxes = await postService.getUserChatBox(userId);
    socket.emit('userChatBox', chatBoxes);
  } catch (error) {
    console.error('getUserChatBox error:', error);
    socket.emit('userChatBoxError', { message: 'Failed to fetch chat boxes' });
  }
});

  socket.on('getConversation', async (data: any) => {
  try {
    // FIX: parse JSON string if necessary
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

     console.log('getConversationWithUser payload:', data, data.userId);

    const userId = data.userId;
    const otherUserId = data.otherUserId;

    const chatBoxes = await postService.getConversationWithUser(userId, otherUserId);
    socket.emit('userConversation', chatBoxes);
  } catch (error) {
    console.error('getUserConversation error:', error);
    socket.emit('userConversation', { message: 'Failed to fetch conversation' });
  }
});

  // Mark a single message as seen
  socket.on('markMessageSeen', async (data: any) => {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      const { messageId, userId, otherUserId } = data || {};

      if (!messageId) {
        socket.emit('messageSeenError', { message: 'messageId required' });
        return;
      }

      const result = await postService.messageSeenUpdate(messageId, userId);
      socket.emit('messageSeen', { messageId, ...result });

      // Notify the other user if connected
      if (otherUserId) {
        const otherSocketId = connectedUsers.get(otherUserId);
        if (otherSocketId) {
          io.to(otherSocketId).emit('messageSeen', { messageId, seenBy: userId, ...result });
        }
      }
    } catch (error) {
      console.error('markMessageSeen error:', error);
      socket.emit('messageSeenError', { message: 'Failed to update seen status' });
    }
  });
    

    // Handle disconnect
    socket.on('disconnect', () => {
      if (userId) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  console.log(`Nest application successfully started`);
  console.log(`Listening on host "${host}" at port "${port}"`);
  console.log(`Socket.IO server running on the same port`);
  console.log(`Access Swagger UI at http://<YOUR_SERVER_IP>:${port}/api`);
  // Local Stripe testing: run in another terminal: stripe listen --forward-to localhost:${port}/billing/webhook
  console.log(`[Stripe] For local webhooks run: stripe listen --forward-to http://localhost:${port}/billing/webhook`);
}
bootstrap();
