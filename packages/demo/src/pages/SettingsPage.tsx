import { css, type Component } from "dreamland/core";
import { controller, getTransport } from "..";
import {
	AVAILABLE_TRANSPORTS,
	type AvailableTransports,
	demoSettingsDefaults,
	demoSettingsStore,
	normalizeHomeUrl,
	normalizeMaxRequests,
	normalizeTransport,
	normalizeWispUrl,
} from "../store";

const SettingsView: Component<
	{},
	{
		wispUrlInput: string;
		transportInput: AvailableTransports;
		homeUrlInput: string;
		maxRequestsInput: string;
		status: string;
		error: string;
	},
	{}
> = function () {
	this.wispUrlInput ??= demoSettingsStore.wispUrl;
	this.transportInput ??= demoSettingsStore.transport;
	this.homeUrlInput ??= demoSettingsStore.homeUrl;
	this.maxRequestsInput ??= String(demoSettingsStore.maxRequests);
	this.status ??= "";
	this.error ??= "";

	const syncInputsFromStore = () => {
		this.wispUrlInput = demoSettingsStore.wispUrl;
		this.transportInput = demoSettingsStore.transport;
		this.homeUrlInput = demoSettingsStore.homeUrl;
		this.maxRequestsInput = String(demoSettingsStore.maxRequests);
	};

	const applySettings = async () => {
		this.error = "";
		this.status = "設定を保存しています...";

		try {
			const nextWispUrl = normalizeWispUrl(this.wispUrlInput);
			const nextTransport = normalizeTransport(this.transportInput);
			const nextHomeUrl = normalizeHomeUrl(this.homeUrlInput);
			const nextMaxRequests = normalizeMaxRequests(this.maxRequestsInput);
			const wispChanged = nextWispUrl !== demoSettingsStore.wispUrl;
			const transportChanged = nextTransport !== demoSettingsStore.transport;

			demoSettingsStore.wispUrl = nextWispUrl;
			demoSettingsStore.transport = nextTransport;
			demoSettingsStore.homeUrl = nextHomeUrl;
			demoSettingsStore.maxRequests = nextMaxRequests;

			this.wispUrlInput = nextWispUrl;
			this.transportInput = nextTransport;
			this.homeUrlInput = nextHomeUrl;
			this.maxRequestsInput = String(nextMaxRequests);

			if (wispChanged || transportChanged) {
				controller.setTransport(getTransport());
			}
			this.status =
				wispChanged || transportChanged
					? "設定を保存しました。通信方式は次回以降のリクエストに反映されます。"
					: "設定を保存しました。";
		} catch (error) {
			this.status = "";
			this.error =
				error instanceof Error ? error.message : "設定の保存に失敗しました。";
		}
	};

	const resetDefaults = async () => {
		this.error = "";
		this.status = "初期値に戻しています...";
		this.wispUrlInput = demoSettingsDefaults.wispUrl;
		this.transportInput = demoSettingsDefaults.transport;
		this.homeUrlInput = demoSettingsDefaults.homeUrl;
		this.maxRequestsInput = String(demoSettingsDefaults.maxRequests);
		await applySettings();
	};

	return (
		<div class="settings-panel">
			<div class="settings-header">
				<h2>プロキシ設定</h2>
				<p>
					実行中のプロキシ設定を変更できます。Wispの変更は次回以降のリクエストに反映されます。
				</p>
			</div>

			<label class="field">
				<span class="label">Wispサーバー</span>
				<input
					type="text"
					value={use(this.wispUrlInput)}
					spellcheck={false}
					on:input={(e: InputEvent) => {
						this.wispUrlInput = (e.target as HTMLInputElement).value;
					}}
				/>
				<span class="hint">例: ws://localhost:4142/</span>
			</label>

			<label class="field">
				<span class="label">通信方式</span>
				<select
					value={use(this.transportInput)}
					on:change={(e: Event) => {
						this.transportInput = (e.target as HTMLSelectElement)
							.value as AvailableTransports;
					}}
				>
					{AVAILABLE_TRANSPORTS.map((option) => (
						<option value={option.value}>{option.label}</option>
					))}
				</select>
				<span class="hint">
					Wisp経由で外部リクエストを送るときに使うクライアントです。
				</span>
			</label>

			<label class="field">
				<span class="label">ホームURL</span>
				<input
					type="text"
					value={use(this.homeUrlInput)}
					spellcheck={false}
					on:input={(e: InputEvent) => {
						this.homeUrlInput = (e.target as HTMLInputElement).value;
					}}
				/>
				<span class="hint">
					ブラウザの初期URLとして使われます。
				</span>
			</label>

			<label class="field">
				<span class="label">リクエスト履歴の上限</span>
				<input
					type="number"
					min="10"
					max="5000"
					step="10"
					value={use(this.maxRequestsInput)}
					on:input={(e: InputEvent) => {
						this.maxRequestsInput = (e.target as HTMLInputElement).value;
					}}
				/>
				<span class="hint">
					メモリ上に保持するリクエスト履歴の最大件数です。
				</span>
			</label>

			<div class="actions">
				<button type="button" class="primary" on:click={applySettings}>
					保存
				</button>
				<button type="button" on:click={resetDefaults}>
					初期値に戻す
				</button>
				<button
					type="button"
					on:click={() => {
						syncInputsFromStore();
						this.error = "";
						this.status = "保存済みの設定に戻しました。";
					}}
				>
					入力を戻す
				</button>
			</div>

			{use(this.error).map((error) =>
				error ? <div class="message error">{error}</div> : null
			)}
			{use(this.status).map((status) =>
				status ? <div class="message status">{status}</div> : null
			)}
		</div>
	);
};

SettingsView.style = css`
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

	.settings-header {
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid #e5e7eb;
	}

	.settings-header h2 {
		margin: 0 0 6px;
		font-size: 1.18rem;
		font-weight: 800;
	}

	.settings-header p {
		margin: 0;
		color: #6b7280;
		line-height: 1.45;
		font-size: 0.84rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 14px;
		max-width: 720px;
	}

	.label {
		font-size: 0.84rem;
		font-weight: 600;
		color: #111827;
	}

	input,
	select {
		width: 100%;
		padding: 0.55em 0.65em;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		color: #111827;
		font: inherit;
		font-size: 0.88rem;
		outline: none;
		box-sizing: border-box;
	}

	input:focus,
	select:focus {
		border-color: #5865f2;
		box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.12);
	}

	select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image:
			linear-gradient(45deg, transparent 50%, #6b7280 50%),
			linear-gradient(135deg, #6b7280 50%, transparent 50%);
		background-position:
			calc(100% - 14px) 50%,
			calc(100% - 9px) 50%;
		background-size:
			5px 5px,
			5px 5px;
		background-repeat: no-repeat;
		padding-right: 28px;
		cursor: pointer;
	}

	.hint {
		color: #6b7280;
		font-size: 0.78rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
	}

	button {
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		color: #111827;
		padding: 0.45em 0.8em;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		line-height: 1.2;
		min-height: 28px;
	}

	button:hover {
		background: #f3f4f6;
	}

	button.primary {
		border-color: #111827;
		background: #111827;
		color: #ffffff;
	}

	button.primary:hover {
		background: #000000;
	}

	.message {
		margin-top: 12px;
		padding: 0.65em 0.8em;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
		font-size: 0.82rem;
		max-width: 720px;
	}

	.message.error {
		border-color: #fecaca;
		color: #991b1b;
	}

	.message.status {
		color: #374151;
	}
`;
export default SettingsView;
