import { css, type Component } from "dreamland/core";

const LoadInterstitial: Component = function () {
	return (
		<dialog class="loading-dialog" aria-label="Loading">
			<div class="spinner"></div>
		</dialog>
	);
};

LoadInterstitial.style = css`
	:scope {
		width: 96px;
		height: 96px;
		border: none;
		border-radius: 8px;
		padding: 0;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 18px 60px rgba(15, 23, 42, 0.16);
		place-items: center;
		transition: opacity 0.4s ease;
	}

	:scope[open] {
		display: grid;
	}

	.spinner {
		width: 34px;
		height: 34px;
		border: 3px solid #e5e7eb;
		border-top-color: #111827;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	:modal[open] {
		animation: fade 0.4s ease normal;
	}

	:modal::backdrop {
		background: rgba(248, 250, 252, 0.78);
		backdrop-filter: blur(3px);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
`;

export default LoadInterstitial;
