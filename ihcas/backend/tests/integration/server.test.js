const { execSync, exec, spawn } = require('child_process');
const path = require('path');
const request = require('supertest');

describe('Server Startup and Environment Tests', () => {
  const serverPath = path.join(__dirname, '../../src/server.js');
  
  it('Invalid or missing required configuration is reported clearly', () => {
    try {
      execSync(`node "${serverPath}"`, {
        env: { ...process.env, DB_HOST: '' }, // override env to fail
        stdio: 'pipe'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/Missing required environment variable/);
    }
  });

  it('Graceful shutdown releases the pool and stops the server correctly', async () => {
    // Instead of child_process which fails to handle SIGTERM on Windows, 
    // we'll directly test the shutdown logic by emitting the event.
    
    // Save original process.exit to avoid actually killing the test runner
    const originalExit = process.exit;
    let exitCode = null;
    process.exit = jest.fn((code) => {
      exitCode = code;
    });

    // Save process.env
    const originalEnv = process.env;
    process.env = { ...originalEnv, PORT: '3002', CORS_ORIGIN: 'http://localhost' };
    
    // We isolate requiring the server so it sets up its listeners and starts listening
    const server = require('../../src/server');
    
    // Spy on server.close and pool.end
    const pool = require('../../src/config/db');
    const closeSpy = jest.spyOn(server, 'close').mockImplementation((cb) => { cb(); });
    const endSpy = jest.spyOn(pool, 'end').mockResolvedValue();

    // Trigger the graceful shutdown
    process.emit('SIGTERM');

    // Wait a tick for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(closeSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);

    // Cleanup
    process.exit = originalExit;
    process.env = originalEnv;
    closeSpy.mockRestore();
    endSpy.mockRestore();
  });
});
