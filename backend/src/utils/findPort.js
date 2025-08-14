import { createServer } from 'net';

export const findAvailablePort = (startPort = 5000) => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
};