import mysql from "mysql2/promise";

const connectionString = process.env.MYSQL_URL || "mysql://root:@127.0.0.1:3306/bangsam_nextjs";

const pool = mysql.createPool({
  uri: connectionString,
  connectionLimit: 5,
  namedPlaceholders: true,
  timezone: "Z",
});

export default pool;
