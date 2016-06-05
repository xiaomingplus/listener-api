const Redis = require('ioredis');
const logger = require('koa-log4').getLogger('index')
const config = require('../config.js');
const redis = new Redis({
  port: config.redisConfig.port,          // Redis port
  host: config.redisConfig.host,   // Redis host
  family: config.redisConfig.family,           // 4 (IPv4) or 6 (IPv6)
  password: config.redisConfig.password,
  db: config.redisConfig.db
});

redis.on('connect',() => {
  logger.info('redis has connected');
});

redis.on('error',(err) => {
  logger.error(err);
  process.exit(1);
});

redis.on('close',() =>{
  logger.warn('redis has closed.');
  process.exit(1);
});

redis.on('reconnecting',() =>{
  logger.info('redis has reconnecting');
});

module.exports = redis;
