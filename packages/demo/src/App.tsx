import { css, type Component } from "dreamland/core";
import BrowserView from "./pages/BrowserView";
import RequestViewer from "./pages/RequestViewer";
import SettingsView from "./pages/SettingsPage";
import CookieManager from "./pages/CookieManager";
import { Omnibox } from "./pages/BrowserView";
import { requestsState } from "./pages/RequestViewer";

const App: Component<
	{},
	{},
	{
		activeTab: "browser" | "requests" | "settings" | "cookies";
	}
> = function (cx) {
	this.activeTab ??= "browser";
	return (
		<div>
			<div class="top-bar">
				<a class="brand" href="/">
					yexe.xyz
				</a>
				<div class="tab-bar">
					<button
						class={use(this.activeTab).map(
							(tab) => `tab-button ${tab === "browser" ? "active" : ""}`
						)}
						on:click={() => {
							this.activeTab = "browser";
						}}
					>
						ブラウザ
					</button>
					<button
						class={use(this.activeTab).map(
							(tab) => `tab-button ${tab === "requests" ? "active" : ""}`
						)}
						on:click={() => {
							this.activeTab = "requests";
						}}
					>
						リクエスト{" "}
						{use(requestsState.requests).map((requests) =>
							requests.length ? `(${requests.length})` : ""
						)}
					</button>
					<button
						class={use(this.activeTab).map(
							(tab) => `tab-button ${tab === "settings" ? "active" : ""}`
						)}
						on:click={() => {
							this.activeTab = "settings";
						}}
					>
						設定
					</button>
					<button
						class={use(this.activeTab).map(
							(tab) => `tab-button ${tab === "cookies" ? "active" : ""}`
						)}
						on:click={() => {
							this.activeTab = "cookies";
						}}
					>
						Cookie
					</button>
					{use(this.activeTab)
						.map((tab) => tab === "browser")
						.andThen(<Omnibox />)}
				</div>
			</div>
			<div
				class={use(this.activeTab).map(
					(tab) =>
						`tab-panel browser-panel ${tab === "browser" ? "active" : ""}`
				)}
			>
				<BrowserView
					active={use(this.activeTab).map((tab) => tab === "browser")}
				/>
			</div>
			<div
				class={use(this.activeTab).map(
					(tab) =>
						`tab-panel requests-panel ${tab === "requests" ? "active" : ""}`
				)}
			>
				<RequestViewer
					active={use(this.activeTab).map((tab) => tab === "requests")}
				/>
			</div>
			<div
				class={use(this.activeTab).map(
					(tab) =>
						`tab-panel settings-tab ${tab === "settings" ? "active" : ""}`
				)}
			>
				<SettingsView />
			</div>
			<div
				class={use(this.activeTab).map(
					(tab) =>
						`tab-panel cookies-tab ${tab === "cookies" ? "active" : ""}`
				)}
			>
				<CookieManager />
			</div>
		</div>
	);
};

App.style = css`
	@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0");

	:scope {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		margin: 0;
		overflow: hidden;
		position: absolute;
		top: 0;
		left: 0;

		padding: 0;
		background: #f8fafc;
		box-sizing: border-box;
		font-family:
			"Google Sans",
			Arial,
			"Noto Sans JP",
			Inter,
			system-ui,
			-apple-system,
			"Segoe UI",
			sans-serif;
	}
	.material-symbols-outlined {
		font-family: "Material Symbols Outlined";
		font-weight: normal;
		font-style: normal;
		font-size: 11px;
		line-height: 1;
		letter-spacing: normal;
		text-transform: none;
		display: inline-block;
		white-space: nowrap;
		word-wrap: normal;
		direction: ltr;
		-webkit-font-smoothing: antialiased;
	}
	.top-bar {
		display: flex;
		align-items: stretch;
		gap: 0;
		margin-bottom: 0;
		border-bottom: 1px solid #e5e7eb;
		background: rgba(255, 255, 255, 0.88);
		backdrop-filter: blur(14px);
		min-height: 64px;
		padding: 0 24px;
		position: relative;
		z-index: 10;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		color: #111827;
		font-family: "Google Sans", Arial, "Noto Sans JP", system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: 0;
		text-decoration: none;
		margin-right: 38px;
	}
	.tab-bar {
		display: flex;
		flex: 1;
		align-items: stretch;
		gap: 2px;
		font-family: "Google Sans", Arial, "Noto Sans JP", system-ui, sans-serif;
	}
	.tab-button {
		border: 1px solid transparent;
		background: transparent;
		color: #6b7280;
		font-family: "Google Sans", Arial, "Noto Sans JP", system-ui, sans-serif;
		padding: 0 15px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.88rem;
		font-weight: 600;
		line-height: 1.2;
		min-height: 64px;
		margin: 0;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
	}
	.tab-button:hover {
		background: #f3f4f6;
		color: #111827;
	}
	.tab-button.active {
		background: transparent;
		color: #111827;
		border-color: transparent;
		margin-bottom: 0;
	}
	.tab-panel {
		flex: 1;
		width: 100%;
		min-width: 0;
		min-height: 0;
		display: none;
	}
	.tab-panel.active {
		display: flex;
	}
	.requests-panel {
		flex-direction: column;
	}
	.settings-tab {
		width: 100%;
		min-width: 0;
		min-height: 0;
	}

	@media (max-width: 820px) {
		.top-bar {
			padding: 0 12px;
			min-height: 56px;
		}

		.brand {
			font-size: 1rem;
			margin-right: 10px;
		}

		.tab-button {
			padding: 0 9px;
			font-size: 0.78rem;
			min-height: 56px;
		}

	}
`;
export default App;
