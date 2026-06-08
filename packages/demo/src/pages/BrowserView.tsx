import {
	css,
	type Component,
	createState,
} from "dreamland/core";
import {
	CatchEscapedLinksPlugin,
	UrlWatcherPlugin,
} from "@mercuryworkshop/scramjet-utils";
import { cachePlugin, controller } from "..";
import { demoSettingsStore } from "../store";
import homepage from "./homepage.html?raw";
import type { Frame } from "@mercuryworkshop/scramjet-controller";

export const browserState = createState({
	url: demoSettingsStore.homeUrl,
	frame: null! as Frame,
	hasNavigated: false,
});

function normalizeInputUrl(value: string): string {
	const trimmed = value.trim();

	if (!trimmed) return "";

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	if (trimmed.includes(".") && !trimmed.includes(" ")) {
		return `https://${trimmed}`;
	}

	return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function navigateTo(value: string) {
	const url = normalizeInputUrl(value);

	if (!url) return;

	browserState.url = url;
	browserState.hasNavigated = true;
	demoSettingsStore.homeUrl = url;
	browserState.frame?.go(url);
}

export const Omnibox: Component = function (cx) {
	const navigate = () => {
		navigateTo(browserState.url);
	};
	return (
		<form
			class="url-form"
			on:submit={(e: SubmitEvent) => {
				e.preventDefault();
				navigate();
			}}
		>
			<div class="browser-omnibox-shell">
				<div class="omnibox-nav" aria-hidden="true">
					<button
						type="button"
						class="nav-btn"
						on:click={() => browserState.frame?.back()}
					>
						<span class="material-symbols-outlined">arrow_back</span>
					</button>
					<button
						type="button"
						class="nav-btn"
						on:click={() => browserState.frame?.forward()}
					>
						<span class="material-symbols-outlined">arrow_forward</span>
					</button>
					<button
						type="button"
						class="nav-btn"
						on:click={() => browserState.frame?.reload()}
					>
						<span class="material-symbols-outlined">refresh</span>
					</button>
				</div>
				<input
					id="search"
					class="url-input"
					type="text"
					value={use(browserState.url)}
					spellcheck="false"
					placeholder="URL または検索ワード"
				/>
			</div>
		</form>
	);
};
Omnibox.style = css`
	:scope {
		display: flex;
		align-items: center;
		background: transparent;
		border-bottom: 0;
		min-width: 0;
		width: 100%;
		max-width: 520px;
		margin-left: auto;
	}
	.browser-omnibox-shell {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.35em;
		min-width: 0;
		border: 0;
		background: transparent;
		padding: 0 8px;
		flex: 1;
	}
	.omnibox-nav {
		display: flex;
		align-items: center;
		gap: 0.15em;
		padding-right: 0.25em;
		border-right: 1px solid #e5e7eb;
	}
	.nav-btn {
		border: 0;
		background: transparent;
		color: #6b7280;
		width: 1.7em;
		height: 1.7em;
		padding: 0;
		border-radius: 3px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.nav-btn:hover {
		background: #f3f4f6;
		color: #111827;
	}
	.browser-omnibox-shell .material-symbols-outlined {
		font-size: 15px !important;
		line-height: 1 !important;
		font-variation-settings:
			"OPSZ" 20,
			"wght" 300,
			"FILL" 0,
			"GRAD" 0;
	}
	.url-input {
		box-sizing: border-box;
		width: 100%;
		padding: 0.46em 0.75em;
		font-size: 0.9em;
		font-family: "Google Sans", Arial, "Noto Sans JP", system-ui, sans-serif;
		border: 1px solid #d1d5db;
		border-radius: 999px;
		background: #ffffff;
		color: #111827;
		outline: none;
	}
	.url-input:focus {
		border-color: #5865f2;
		box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.14);
	}
	.url-input::placeholder {
		color: #9ca3af;
	}
`;

const DotCanvas: Component<
	{},
	{},
	{
		canvas: HTMLCanvasElement;
		container: HTMLDivElement;
	}
> = function (cx) {
	cx.mount = () => {
		const canvas = this.canvas;
		const container = this.container;
		if (!canvas || !container) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let dots: Array<{
			x: number;
			y: number;
			phase: number;
			speed: number;
			baseOpacity: number;
		}> = [];
		let animationFrameId = 0;
		let time = 0;

		const FIXED_SPACING = 28;
		const FIXED_DOT_SIZE = 1.6;
		const ANIMATION_SPEED = 0.035;

		const resizeCanvas = () => {
			const rect = container.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			dots = [];
			const cols = Math.ceil(rect.width / FIXED_SPACING);
			const rows = Math.ceil(rect.height / FIXED_SPACING);

			for (let i = 0; i <= cols; i++) {
				for (let j = 0; j <= rows; j++) {
					dots.push({
						x: i * FIXED_SPACING,
						y: j * FIXED_SPACING,
						phase: Math.random() * Math.PI * 2,
						speed: 0.5 + Math.random() * 0.5,
						baseOpacity: 0.2 + Math.random() * 0.3,
					});
				}
			}
		};

		const animate = () => {
			const rect = container.getBoundingClientRect();
			ctx.clearRect(0, 0, rect.width, rect.height);
			ctx.fillStyle = "rgba(100, 100, 100, 1)";
			time += ANIMATION_SPEED;

			dots.forEach((dot) => {
				const scale = (Math.sin(time * dot.speed + dot.phase) + 1) / 2;
				ctx.globalAlpha = dot.baseOpacity + scale * 0.45;
				ctx.fillRect(dot.x, dot.y, FIXED_DOT_SIZE, FIXED_DOT_SIZE);
			});
			ctx.globalAlpha = 1;

			animationFrameId = requestAnimationFrame(animate);
		};

		resizeCanvas();
		animate();

		const observer = new ResizeObserver(resizeCanvas);
		observer.observe(container);
		window.addEventListener("pagehide", () => {
			cancelAnimationFrame(animationFrameId);
			observer.disconnect();
		});
	};

	return (
		<div class="dot-canvas" this={use(this.container)}>
			<canvas this={use(this.canvas)}></canvas>
		</div>
	);
};

DotCanvas.style = css`
	:scope {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
		isolation: isolate;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
`;

const BrowserView: Component<
	{
		active: boolean;
	},
	{
		heroInput: string;
	},
	{
		frameel: HTMLIFrameElement;
	}
> = function (cx) {
	this.heroInput ??= "";

	cx.mount = async () => {
		await controller.wait();

		let urlWatcher = new UrlWatcherPlugin((url) => {
			browserState.url = url;
		});
		let catchEscapedLinks = new CatchEscapedLinksPlugin(
			(url) =>
				new URL(`/?goto=${encodeURIComponent(url.href)}`, location.origin)
		);
		browserState.frame = controller.createFrame(this.frameel, {
			plugins: [cachePlugin, urlWatcher, catchEscapedLinks],
		});
		this.frameel.src = `data:text/html;base64,${btoa(homepage)}`;

		let goto = new URL(location.href).searchParams.get("goto");
		if (goto) {
			browserState.hasNavigated = true;
			browserState.frame?.go(goto);
			history.replaceState(null, "", location.href.split("?")[0]);
		}
	};

	const submitHero = () => {
		navigateTo(this.heroInput);
	};

	return (
		<div
			class={use(this.active).map(
				(active) => `tab-panel browser-view ${active ? "active" : ""}`
			)}
		>
			<iframe this={use(this.frameel)}></iframe>
			{use(browserState.hasNavigated).map((hasNavigated) =>
				hasNavigated ? null : (
					<div class="start-overlay">
						<DotCanvas />
						<form
							class="start-panel"
							on:submit={(e: SubmitEvent) => {
								e.preventDefault();
								submitHero();
							}}
						>
							<div class="start-copy">
								<div class="brand-pill">
									<img src="/assets/scramjet-mini.png" alt="" aria-hidden="true" />
									<span>ScramJet フォーク</span>
								</div>
								<h2>
									Filtering <span class="jp-title">回避</span>
								</h2>
								<h1>Persistent Proxy</h1>
								<p>
									URL または検索ワードを入力して、そのままプロキシ経由で開けます。
								</p>
							</div>
							<div class="start-card">
								<div class="card-section">
									<h3>サイトを開く</h3>
									<p>URL または検索ワード</p>
									<div class="start-row">
										<input
											type="text"
											value={use(this.heroInput)}
											placeholder="youtube.com"
											spellcheck="false"
											autofocus
											on:input={(e: InputEvent) => {
												this.heroInput = (e.target as HTMLInputElement).value;
											}}
										/>
									</div>
									<div class="quick-links">
										<button type="button" on:click={() => navigateTo("google.com")}>
											Google
										</button>
										<button type="button" on:click={() => navigateTo("youtube.com")}>
											YouTube
										</button>
										<button type="button" on:click={() => navigateTo("x.com")}>
											X
										</button>
										<button type="button" on:click={() => navigateTo("discord.com/app")}>
											Discord
										</button>
									</div>
									<button class="open-button" type="submit">
										<span class="open-label">Open</span>
										<span class="open-hover">
											Open
											<span class="material-symbols-outlined">arrow_forward</span>
										</span>
										<span class="open-fill"></span>
									</button>
								</div>
							</div>
						</form>
						<footer class="proxy-footer">
							<div class="footer-inner">
								<div>
									<div class="footer-brand">
										<span>Persistent Proxy</span>
									</div>
									<p class="footer-copy">
										Scramjet ベースの軽量 Web プロキシです。URL 入力、Cookie 保存、リクエスト確認をひとつの画面にまとめています。
									</p>
								</div>
								<div class="footer-links">
									<div>
										<h4>Project</h4>
										<a href="https://github.com/MercuryWorkshop/scramjet" target="_blank" rel="noopener noreferrer">
											Scramjet
										</a>
										<a href="https://github.com/MercuryWorkshop/wisp-protocol" target="_blank" rel="noopener noreferrer">
											Wisp Protocol
										</a>
									</div>
									<div>
										<h4>Tools</h4>
										<a href="#" on:click={(e: MouseEvent) => e.preventDefault()}>
											Cookie
										</a>
										<a href="#" on:click={(e: MouseEvent) => e.preventDefault()}>
											Requests
										</a>
									</div>
								</div>
							</div>
							<div class="footer-bottom">
								<span>Copyright 2026 yexe. All rights reserved.</span>
								<span>Powered by Scramjet</span>
							</div>
						</footer>
					</div>
				)
			)}
		</div>
	);
};

BrowserView.style = css`
	:scope {
		flex: 1;
		width: 100%;
		min-width: 0;
		min-height: 0;
		display: none;
		flex-direction: column;
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
	:scope.active {
		display: flex;
	}

	iframe {
		background: white;
		flex: 1;
		border: none;
	}

	.start-overlay {
		position: absolute;
		inset: 64px 0 0;
		display: block;
		background-color: #ffffff;
		color: #111827;
		z-index: 2;
		overflow: auto;
		padding: 0;
	}

	.start-panel {
		width: min(1024px, calc(100% - 32px));
		min-height: calc(100vh - 64px - 184px);
		margin: 0 auto;
		padding: 82px 0 70px;
		display: grid;
		gap: 38px;
		position: relative;
		z-index: 1;
	}

	.start-copy {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.start-panel h2,
	.start-panel h1 {
		margin: 0;
		font-size: clamp(1.85rem, 3.35vw, 3.1rem);
		font-weight: 800;
		letter-spacing: 0;
		line-height: 1.08;
	}

	.brand-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.82);
		box-shadow: 0 1px 2px rgba(17, 24, 39, 0.06);
		padding: 6px 12px;
		color: #4b5563;
		font-size: 0.76rem;
		font-weight: 800;
		line-height: 1;
	}

	.brand-pill img {
		width: 18px;
		height: 18px;
		object-fit: contain;
	}

	.jp-title {
		font-family: "Noto Sans JP", "Google Sans", Arial, system-ui, sans-serif;
		font-weight: 800;
	}

	.start-panel h2 {
		color: #111827;
	}

	.start-panel h1 {
		color: transparent;
		background: linear-gradient(90deg, #5865f2, #404eed);
		background-clip: text;
		-webkit-background-clip: text;
	}

	.start-copy p {
		width: min(620px, 100%);
		margin: 18px 0 0;
		color: #6b7280;
		font-size: 1.08rem;
		line-height: 1.7;
	}

	.start-card {
		display: block;
		width: min(560px, 100%);
		height: fit-content;
		margin: 0 auto;
		min-height: unset;
		border: 1px solid #27272a;
		border-radius: 16px;
		background: #050505;
		color: #ffffff;
		box-shadow: 0 28px 80px rgba(17, 24, 39, 0.20);
		overflow: hidden;
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

	.card-section {
		min-height: unset;
		padding: 40px 30px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		text-align: center;
	}

	.card-section h3 {
		margin: 0 0 7px;
		font-size: 1.45rem;
		font-weight: 800;
	}

	.card-section p {
		margin: 0 0 14px;
		color: #a1a1aa;
		font-size: 1rem;
	}

	.start-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: 14px;
		align-items: stretch;
	}

	.start-row input {
		min-width: 0;
		border: 1px solid #3f3f46;
		border-radius: 8px;
		background: #18181b;
		color: #ffffff;
		font: inherit;
		font-size: 1.05rem;
		padding: 0.95em 1em;
		outline: none;
		text-align: center;
	}

	.start-row input:focus {
		border-color: #5865f2;
		box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.18);
	}

	.open-button {
		position: relative;
		width: 128px;
		min-width: 128px;
		align-self: center;
		margin-top: 12px;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		background: #ffffff;
		color: #1f2937;
		cursor: pointer;
		font: inherit;
		font-size: 0.98rem;
		font-weight: 700;
		padding: 0.74rem 1rem;
		overflow: hidden;
		text-align: center;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		transition:
			box-shadow 0.3s ease,
			transform 0.3s ease;
	}

	.open-button:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.20);
	}

	.open-label {
		position: relative;
		z-index: 2;
		display: inline-block;
		transform: translateX(4px);
		transition:
			transform 0.3s ease,
			opacity 0.3s ease;
	}

	.open-hover {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: #ffffff;
		opacity: 0;
		transform: translateX(48px);
		transition:
			transform 0.3s ease,
			opacity 0.3s ease;
	}

	.open-hover .material-symbols-outlined {
		font-size: 16px !important;
	}

	.open-fill {
		position: absolute;
		left: 20%;
		top: 40%;
		z-index: 1;
		width: 8px;
		height: 8px;
		border-radius: 8px;
		background: #000000;
		transform: scale(1);
		transition:
			left 0.3s ease,
			top 0.3s ease,
			width 0.3s ease,
			height 0.3s ease,
			transform 0.3s ease;
	}

	.open-button:hover .open-label {
		opacity: 0;
		transform: translateX(48px);
	}

	.open-button:hover .open-hover {
		opacity: 1;
		transform: translateX(0);
	}

	.open-button:hover .open-fill {
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		transform: scale(1.8);
	}

	.quick-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		margin-top: 12px;
	}

	.quick-links button {
		border: 1px solid #27272a;
		border-radius: 999px;
		background: #111113;
		color: #d4d4d8;
		cursor: pointer;
		font: inherit;
		font-size: 0.9rem;
		padding: 0.58em 0.88em;
	}

	.quick-links button:hover {
		border-color: #5865f2;
		color: #ffffff;
	}

	.proxy-footer {
		border-top: 1px solid #f3f4f6;
		background: rgba(255, 255, 255, 0.92);
		position: relative;
		z-index: 3;
	}

	.footer-inner {
		width: min(1180px, calc(100% - 32px));
		margin: 0 auto;
		padding: 52px 0 28px;
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
		gap: 42px;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 1.08rem;
		font-weight: 800;
	}

	.footer-copy {
		width: min(420px, 100%);
		margin: 16px 0 0;
		color: #6b7280;
		font-size: 0.88rem;
		line-height: 1.75;
	}

	.footer-links {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 28px;
	}

	.footer-links h4 {
		margin: 0 0 12px;
		font-size: 0.9rem;
	}

	.footer-links a {
		display: block;
		color: #6b7280;
		text-decoration: none;
		font-size: 0.86rem;
		margin: 8px 0;
	}

	.footer-links a:hover {
		color: #111827;
	}

	.footer-bottom {
		width: min(1180px, calc(100% - 32px));
		margin: 0 auto;
		border-top: 1px solid #f3f4f6;
		padding: 20px 0;
		color: #6b7280;
		font-size: 0.78rem;
		display: flex;
		justify-content: space-between;
		gap: 18px;
	}

	@media (max-width: 760px) {
		.start-overlay {
			inset: 56px 0 0;
		}

		.start-panel {
			min-height: calc(100vh - 56px - 260px);
			padding: 42px 0 44px;
		}

		.start-panel h2,
		.start-panel h1 {
			font-size: clamp(1.7rem, 7.2vw, 2.35rem);
		}

		.start-row {
			grid-template-columns: 1fr;
		}

		.open-button {
			width: 100%;
			min-width: 0;
		}

		.card-section {
			padding: 32px 22px;
		}

		.footer-inner,
		.footer-bottom {
			grid-template-columns: 1fr;
			flex-direction: column;
		}

		.footer-inner {
			padding-top: 38px;
		}
	}
`;

export default BrowserView;
