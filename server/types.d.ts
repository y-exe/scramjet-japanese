declare module "pg" {
	export class Pool {
		constructor(options: { connectionString: string });
		query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
		end(): Promise<void>;
	}

	const pg: {
		Pool: typeof Pool;
	};

	export default pg;
}
