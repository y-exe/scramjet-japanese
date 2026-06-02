import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import pg from "pg";

type CookieState = {
	updatedAt: number;
	cookies: string;
};

type CookieRecord = {
	domain?: string;
	name?: string;
	path?: string;
	expires?: number;
};

type DomainSummary = {
	domain: string;
	cookieCount: number;
	updatedAt: number;
};

const MAX_BODY_BYTES = 5 * 1024 * 1024;

function json(res: http.ServerResponse, status: number, body: unknown) {
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store",
	});
	res.end(JSON.stringify(body));
}

function userHash(req: http.IncomingMessage): string {
	const secret = process.env.COOKIE_USER_ID_SECRET || "dev-cookie-secret";
	const forwardedFor = req.headers["x-forwarded-for"];
	const ip = Array.isArray(forwardedFor)
		? forwardedFor[0]
		: forwardedFor?.split(",")[0]?.trim() ||
			req.socket.remoteAddress ||
			"0.0.0.0";
	const userAgent = req.headers["user-agent"] || "";

	return crypto
		.createHmac("sha256", secret)
		.update(`${ip}|${userAgent}`)
		.digest("hex");
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
	let size = 0;
	const chunks: Buffer[] = [];

	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.length;

		if (size > MAX_BODY_BYTES) {
			throw new Error("Request body is too large.");
		}

		chunks.push(buffer);
	}

	return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function parseCookieDump(cookies: string): Record<string, CookieRecord> {
	const parsed = JSON.parse(cookies || "{}");

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return {};
	}

	return parsed as Record<string, CookieRecord>;
}

function stringifyCookieDump(cookies: Record<string, CookieRecord>): string {
	return JSON.stringify(cookies);
}

function normalizeDomain(domain: string): string {
	return domain.replace(/^\./, "").toLowerCase();
}

function summarizeDomains(state: CookieState): DomainSummary[] {
	const cookies = parseCookieDump(state.cookies);
	const counts = new Map<string, number>();
	const now = Date.now();

	for (const cookie of Object.values(cookies)) {
		if (typeof cookie?.domain !== "string") {
			continue;
		}

		if (typeof cookie.expires === "number" && cookie.expires <= now) {
			continue;
		}

		const domain = normalizeDomain(cookie.domain);
		counts.set(domain, (counts.get(domain) || 0) + 1);
	}

	return [...counts.entries()]
		.map(([domain, cookieCount]) => ({
			domain,
			cookieCount,
			updatedAt: state.updatedAt,
		}))
		.sort((a, b) => a.domain.localeCompare(b.domain));
}

function deleteDomainFromDump(cookies: string, domain: string): string {
	const target = normalizeDomain(domain);
	const parsed = parseCookieDump(cookies);

	for (const [id, cookie] of Object.entries(parsed)) {
		if (typeof cookie.domain === "string" && normalizeDomain(cookie.domain) === target) {
			delete parsed[id];
		}
	}

	return stringifyCookieDump(parsed);
}

function ttlExpiresAt(): Date | null {
	const ttlDays = Number(process.env.COOKIE_TTL_DAYS || "60");

	if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
		return null;
	}

	return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

interface CookieBackend {
	read(user: string): Promise<CookieState>;
	write(user: string, state: CookieState): Promise<CookieState>;
	deleteAll(user: string): Promise<void>;
	deleteDomain(user: string, domain: string): Promise<CookieState>;
}

class FileCookieBackend implements CookieBackend {
	constructor(private readonly dir: string) {}

	private file(user: string): string {
		return path.join(this.dir, `${user}.json`);
	}

	async read(user: string): Promise<CookieState> {
		try {
			const raw = await fs.readFile(this.file(user), "utf8");
			const parsed = JSON.parse(raw);
			return {
				updatedAt: Number(parsed.updatedAt || 0),
				cookies: typeof parsed.cookies === "string" ? parsed.cookies : "{}",
			};
		} catch {
			return { updatedAt: 0, cookies: "{}" };
		}
	}

	async write(user: string, state: CookieState): Promise<CookieState> {
		await fs.mkdir(this.dir, { recursive: true });
		const existing = await this.read(user);
		const next =
			state.updatedAt >= existing.updatedAt
				? state
				: { ...existing, updatedAt: existing.updatedAt };
		await fs.writeFile(this.file(user), JSON.stringify(next), "utf8");
		return next;
	}

	async deleteAll(user: string): Promise<void> {
		await fs.rm(this.file(user), { force: true });
	}

	async deleteDomain(user: string, domain: string): Promise<CookieState> {
		const existing = await this.read(user);
		const next = {
			updatedAt: Date.now(),
			cookies: deleteDomainFromDump(existing.cookies, domain),
		};
		return this.write(user, next);
	}
}

class PostgresCookieBackend implements CookieBackend {
	private readonly pool: pg.Pool;

	constructor(connectionString: string) {
		this.pool = new pg.Pool({ connectionString });
	}

	async read(user: string): Promise<CookieState> {
		const result = await this.pool.query(
			`SELECT cookies, updated_at_ms
			 FROM scramjet_cookie_states
			 WHERE user_hash = $1
			   AND (expires_at IS NULL OR expires_at > now())`,
			[user]
		);
		const row = result.rows[0];

		if (!row) {
			return { updatedAt: 0, cookies: "{}" };
		}

		return {
			updatedAt: Number(row.updated_at_ms || 0),
			cookies: JSON.stringify(row.cookies || {}),
		};
	}

	async write(user: string, state: CookieState): Promise<CookieState> {
		const cookies = parseCookieDump(state.cookies);
		const expiresAt = ttlExpiresAt();
		const result = await this.pool.query(
			`INSERT INTO scramjet_cookie_states
			   (user_hash, cookies, updated_at_ms, expires_at, updated_at)
			 VALUES ($1, $2::jsonb, $3, $4, now())
			 ON CONFLICT (user_hash)
			 DO UPDATE SET
			   cookies = CASE
				 WHEN scramjet_cookie_states.updated_at_ms <= EXCLUDED.updated_at_ms
				 THEN EXCLUDED.cookies
				 ELSE scramjet_cookie_states.cookies
			   END,
			   updated_at_ms = GREATEST(scramjet_cookie_states.updated_at_ms, EXCLUDED.updated_at_ms),
			   expires_at = EXCLUDED.expires_at,
			   updated_at = now()
			 RETURNING cookies, updated_at_ms`,
			[user, JSON.stringify(cookies), state.updatedAt, expiresAt]
		);
		const row = result.rows[0];
		return {
			updatedAt: Number(row.updated_at_ms || 0),
			cookies: JSON.stringify(row.cookies || {}),
		};
	}

	async deleteAll(user: string): Promise<void> {
		await this.pool.query("DELETE FROM scramjet_cookie_states WHERE user_hash = $1", [
			user,
		]);
	}

	async deleteDomain(user: string, domain: string): Promise<CookieState> {
		const existing = await this.read(user);
		return this.write(user, {
			updatedAt: Date.now(),
			cookies: deleteDomainFromDump(existing.cookies, domain),
		});
	}
}

function createBackend(): CookieBackend {
	const store = (process.env.COOKIE_STORE || "file").toLowerCase();
	const databaseUrl = process.env.DATABASE_URL;

	if (store === "postgres" && databaseUrl) {
		return new PostgresCookieBackend(databaseUrl);
	}

	return new FileCookieBackend(
		path.resolve(process.env.COOKIE_FILE_STORE_DIR || ".cookie-store")
	);
}

export function createPersistentCookieMiddleware() {
	const backend = createBackend();

	return async function persistentCookieMiddleware(
		req: http.IncomingMessage,
		res: http.ServerResponse,
		next: (error?: unknown) => void
	) {
		try {
			if (!req.url?.startsWith("/api/cookies")) {
				next();
				return;
			}

			const url = new URL(req.url, "http://localhost");
			const user = userHash(req);

			if (req.method === "GET" && url.pathname === "/api/cookies/state") {
				json(res, 200, await backend.read(user));
				return;
			}

			if (req.method === "PUT" && url.pathname === "/api/cookies/state") {
				const body = (await readBody(req)) as Partial<CookieState>;
				const state = {
					updatedAt: Number(body.updatedAt || Date.now()),
					cookies: typeof body.cookies === "string" ? body.cookies : "{}",
				};
				parseCookieDump(state.cookies);
				json(res, 200, await backend.write(user, state));
				return;
			}

			if (req.method === "GET" && url.pathname === "/api/cookies/domains") {
				json(res, 200, { domains: summarizeDomains(await backend.read(user)) });
				return;
			}

			if (req.method === "DELETE" && url.pathname === "/api/cookies/state") {
				await backend.deleteAll(user);
				json(res, 200, { ok: true });
				return;
			}

			if (req.method === "DELETE" && url.pathname.startsWith("/api/cookies/domains/")) {
				const domain = decodeURIComponent(url.pathname.split("/").pop() || "");
				const state = await backend.deleteDomain(user, domain);
				json(res, 200, { ok: true, state });
				return;
			}

			json(res, 404, { error: "Cookie API route not found." });
		} catch (error) {
			json(res, 500, {
				error: error instanceof Error ? error.message : "Cookie API failed.",
			});
		}
	};
}
