import mysql from "mysql2/promise";

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_NAME,
  charset: "utf8mb4",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true
};

const globalForTagsDb = globalThis;

export const db =
  globalForTagsDb.__tagsDbPool ||
  mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForTagsDb.__tagsDbPool = db;
}

/* console.log({
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  DATABASE: process.env.DB_DATABASE_NAME,
}); */
