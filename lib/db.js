import mysql from "mysql2/promise";

// Create the connection to database
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "lbi",
  password: "race@123",
  waitForConnections: true,
  connectionLimit: 500,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// const db = mysql.createPool({
//   host: "racedev-db.c1u6o2ewayxy.ap-south-1.rds.amazonaws.com",
//   user: "root",
//   database: "race_news",
//   password: "Racedeveloper2024",
//   waitForConnections: true,
//   connectionLimit: 80,
//   // maxIdle: 10,
//   idleTimeout: 60000,
//   keepAliveInitialDelay: 0,
//   queueLimit: 0,
//   enableKeepAlive: true,
 
// });

// console.log("Connected to MySQL database");

export default db;


// aws db password: Racedeveloper2024

// Master username
//root
//Master password
//Racedeveloper2024
