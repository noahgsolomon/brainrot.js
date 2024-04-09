import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	uri: process.env.DB_URL,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT || 3306,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	ssl: {
		rejectUnauthorized: false,
	},
});

async function query(sql, params) {
	const [results] = await pool.execute(sql, params);
	return results;
}

export { query };
