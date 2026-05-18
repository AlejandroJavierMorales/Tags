import mysql from "mysql2/promise";

export const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_NAME,

  
});

console.log({
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  DATABASE: process.env.DB_DATABASE_NAME,
});