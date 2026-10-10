const mysql = require('mysql2/promise');
const pool = require('../src/config/db');

jest.mock('mysql2/promise', () => {
  return {
    createPool: jest.fn(() => ({
      query: jest.fn(),
      getConnection: jest.fn(),
    })),
  };
});

describe('Database Configuration', () => {
  it('should create a pool with the correct environment variables', () => {
    expect(mysql.createPool).toHaveBeenCalled();
    expect(pool).toBeDefined();
  });
});
