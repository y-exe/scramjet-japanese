import { css, type Component } from "dreamland/core";
import { controller } from "..";
import { backendUrl } from "../backend";

type DomainSummary = {
	domain: string;
	cookieCount: number;
	updatedAt: number;
};

async function fetchDomains(): Promise<DomainSummary[]> {
	const response = await fetch(backendUrl("/api/cookies/domains"), {
		credentials: "same-origin",
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("Cookieドメインの読み込みに失敗しました。");
	}

	const data = await response.json();
	return Array.isArray(data.domains) ? data.domains : [];
}

async function deleteDomain(domain: string) {
	const response = await fetch(backendUrl(`/api/cookies/domains/${encodeURIComponent(domain)}`), {
		method: "DELETE",
		credentials: "same-origin",
	});

	if (!response.ok) {
		throw new Error(`${domain} の削除に失敗しました。`);
	}

	const data = await response.json();
	if (typeof data.state?.cookies === "string") {
		controller.cookieJar.load(data.state.cookies);
		await controller.persistCookies();
	}
}

async function deleteAll() {
	const response = await fetch(backendUrl("/api/cookies/state"), {
		method: "DELETE",
		credentials: "same-origin",
	});

	if (!response.ok) {
		throw new Error("Cookieの削除に失敗しました。");
	}

	controller.cookieJar.clear();
	await controller.persistCookies();
}

const CookieManager: Component<
	{},
	{
		domains: DomainSummary[];
		status: string;
		error: string;
		loading: boolean;
	},
	{}
> = function (cx) {
	this.domains ??= [];
	this.status ??= "";
	this.error ??= "";
	this.loading ??= false;

	const load = async () => {
		this.loading = true;
		this.error = "";

		try {
			this.domains = await fetchDomains();
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : "Cookieの読み込みに失敗しました。";
		} finally {
			this.loading = false;
		}
	};

	const removeDomain = async (domain: string) => {
		this.status = `${domain} を削除しています...`;
		this.error = "";

		try {
			await deleteDomain(domain);
			this.status = `${domain} を削除しました。`;
			await load();
		} catch (error) {
			this.status = "";
			this.error =
				error instanceof Error ? error.message : "ドメインの削除に失敗しました。";
		}
	};

	const removeAll = async () => {
		this.status = "すべてのCookieを削除しています...";
		this.error = "";

		try {
			await deleteAll();
			this.status = "すべてのCookieを削除しました。";
			await load();
		} catch (error) {
			this.status = "";
			this.error =
				error instanceof Error ? error.message : "Cookieの削除に失敗しました。";
		}
	};

	cx.mount = () => {
		void load();
	};

	return (
		<div class="cookie-panel">
			<div class="cookie-header">
				<div>
					<h2>Cookie管理</h2>
					<p>保存済みCookieのドメイン一覧です。ユーザーごとに分離して扱います。</p>
				</div>
				<div class="actions">
					<button type="button" on:click={load}>
						更新
					</button>
					<button
						type="button"
						class="danger"
						on:click={removeAll}
						disabled={use(this.domains).map((domains) => domains.length === 0)}
					>
						すべて削除
					</button>
				</div>
			</div>

			{use(this.error).map((error) =>
				error ? <div class="message error">{error}</div> : null
			)}
			{use(this.status).map((status) =>
				status ? <div class="message status">{status}</div> : null
			)}

			{use(this.loading).map((loading) =>
				loading ? <div class="empty">読み込み中...</div> : null
			)}

			{use(this.domains).map((domains) =>
				domains.length === 0 ? (
					<div class="empty">保存済みCookieはまだありません。</div>
				) : (
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>ドメイン</th>
									<th>Cookie数</th>
									<th>更新日時</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{domains.map((domain) => (
									<tr>
										<td>{domain.domain}</td>
										<td>{domain.cookieCount}</td>
										<td>{new Date(domain.updatedAt).toLocaleString()}</td>
										<td class="row-actions">
											<button
												type="button"
												class="ghost danger-text"
												on:click={() => removeDomain(domain.domain)}
											>
												削除
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)
			)}
		</div>
	);
};

CookieManager.style = css`
	:scope {
		display: block;
		flex: 1;
		min-width: 0;
		min-height: 0;
		padding: 28px;
		background: #ffffff;
		color: #111827;
		overflow: auto;
		font-family:
			"Google Sans",
			"Noto Sans JP",
			system-ui,
			-apple-system,
			"Segoe UI",
			sans-serif;
		box-sizing: border-box;
	}

	.cookie-header {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid #e5e7eb;
	}

	h2 {
		margin: 0 0 6px;
		font-size: 1.18rem;
		font-weight: 800;
	}

	p {
		margin: 0;
		color: #6b7280;
		line-height: 1.45;
		font-size: 0.84rem;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	button {
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		color: #111827;
		cursor: pointer;
		font: inherit;
		font-size: 0.84rem;
		padding: 0.45em 0.7em;
	}

	button:hover {
		background: #f3f4f6;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	button.danger {
		border-color: #fecaca;
		background: #fff1f2;
		color: #b91c1c;
	}

	button.ghost {
		background: transparent;
	}

	.danger-text {
		color: #fca5a5;
	}

	.message,
	.empty {
		border: 1px solid #e5e7eb;
		background: #f9fafb;
		padding: 12px;
		margin-bottom: 12px;
	}

	.message.error {
		border-color: #fecaca;
		color: #991b1b;
	}

	.message.status {
		border-color: #bbf7d0;
		color: #166534;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}

	th,
	td {
		border-bottom: 1px solid #e5e7eb;
		padding: 10px 8px;
		text-align: left;
		white-space: nowrap;
	}

	th {
		color: #6b7280;
		font-size: 0.72rem;
		text-transform: uppercase;
	}

	.row-actions {
		text-align: right;
	}
`;

export default CookieManager;
