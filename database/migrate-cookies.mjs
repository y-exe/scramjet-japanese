import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL is required.");
	process.exit(1);
}

const sql = await readFile(
	new URL("./migrations/001_scramjet_persistent_cookies.sql", import.meta.url),
	"utf8"
);
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
	await pool.query(sql);
	console.log("001_scramjet_persistent_cookies.sql applied");
} finally {
	await pool.end();
}
