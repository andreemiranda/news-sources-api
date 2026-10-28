// server.js - Custom entrypoint for Node.js Hosting / Shared Servers / PaaS
// Compatible with: cPanel (Passenger/Phusion), Hostinger hPanel Node.js, Render, Railway, Fly.io, VPS
const http = require('http');
const { parse } = require('url');
const next = require('next');

// Dynamically determine port and host - never hardcode
const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    server.listen(port, hostname, (err) => {
      if (err) {
        console.error('Failed to bind server to port', port, err);
        process.exit(1);
      }
      console.log(`> Server ready on http://${hostname}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });

    // Graceful shutdown handling for container and process managers
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Error preparing Next.js application:', err);
    process.exit(1);
  });
