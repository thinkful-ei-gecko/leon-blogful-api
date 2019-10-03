require('dotenv').config();

module.exports = {
  'migrationsDirectory': 'migrations',
  'driver': 'pg',
  'connectionString': (process.env.NODE_ENV === 'test')
    ? process.env.DB_URL_TEST_2
    : process.env.DB_URL
};