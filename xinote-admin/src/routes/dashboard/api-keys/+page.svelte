<script lang="ts">
	import { onMount } from 'svelte';

	export let data;

	let keys: any[] = [];
	let loading = false;
	let error = '';
	let successMessage = '';

	// New API key generation
	let showGenerateForm = false;
	let newKeyName = '';
	let newKeyExpires = false;
	let newKeyExpiresInDays = 90;
	let generatedKey = '';
	let showGeneratedKey = false;

	onMount(async () => {
		await loadKeys();
	});

	async function loadKeys() {
		try {
			const response = await fetch('/api/keys');
			const result = await response.json();

			if (result.success) {
				keys = result.keys;
			}
		} catch (err) {
			console.error('Failed to load API keys:', err);
		}
	}

	async function generateKey() {
		loading = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newKeyName || null,
					expiresInDays: newKeyExpires ? newKeyExpiresInDays : null
				})
			});

			const result = await response.json();

			if (result.success) {
				generatedKey = result.apiKey;
				showGeneratedKey = true;
				successMessage = 'API key generated successfully!';
				showGenerateForm = false;
				newKeyName = '';
				await loadKeys();
			} else {
				error = 'Failed to generate API key';
			}
		} catch (err) {
			error = 'Failed to generate API key';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function revokeKey(keyId: string) {
		if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch(`/api/keys/${keyId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				successMessage = 'API key revoked successfully';
				await loadKeys();
			} else {
				error = 'Failed to revoke API key';
			}
		} catch (err) {
			error = 'Failed to revoke API key';
			console.error(err);
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		successMessage = 'Copied to clipboard!';
		setTimeout(() => {
			successMessage = '';
		}, 2000);
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString();
	}

	function isExpired(expiresAt: string | null) {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}
</script>

<div class="max-w-6xl mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">API Keys</h1>
		<p class="text-gray-600">Manage API keys for your mobile app authentication</p>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if successMessage}
		<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
			{successMessage}
		</div>
	{/if}

	{#if showGeneratedKey}
		<div class="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg mb-6">
			<h3 class="text-lg font-bold text-gray-900 mb-2">Your New API Key</h3>
			<p class="text-sm text-gray-600 mb-4">
				⚠️ Make sure to copy this key now. You won't be able to see it again!
			</p>
			<div class="bg-white p-4 rounded border border-gray-300 flex items-center justify-between">
				<code class="text-sm font-mono text-gray-800 break-all">{generatedKey}</code>
				<button
					on:click={() => copyToClipboard(generatedKey)}
					class="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0"
				>
					Copy
				</button>
			</div>
			<button
				on:click={() => (showGeneratedKey = false)}
				class="mt-4 text-sm text-gray-600 hover:text-gray-800"
			>
				I've saved this key
			</button>
		</div>
	{/if}

	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="p-4 border-b border-gray-200 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-800">Active API Keys</h2>
			<button
				on:click={() => (showGenerateForm = !showGenerateForm)}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
			>
				{showGenerateForm ? 'Cancel' : '+ Generate New Key'}
			</button>
		</div>

		{#if showGenerateForm}
			<div class="p-6 bg-gray-50 border-b border-gray-200">
				<h3 class="text-lg font-semibold mb-4">Generate New API Key</h3>

				<div class="space-y-4">
					<div>
						<label for="keyName" class="block text-sm font-medium text-gray-700 mb-1">
							Key Name (optional)
						</label>
						<input
							id="keyName"
							type="text"
							bind:value={newKeyName}
							placeholder="e.g., My iPhone, Production App"
							class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label class="flex items-center">
							<input type="checkbox" bind:checked={newKeyExpires} class="mr-2" />
							<span class="text-sm font-medium text-gray-700">Set expiration date</span>
						</label>

						{#if newKeyExpires}
							<div class="mt-2">
								<label for="expiresInDays" class="block text-sm text-gray-600 mb-1">
									Expires in (days)
								</label>
								<input
									id="expiresInDays"
									type="number"
									bind:value={newKeyExpiresInDays}
									min="1"
									max="365"
									class="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						{/if}
					</div>

					<button
						on:click={generateKey}
						disabled={loading}
						class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
					>
						{loading ? 'Generating...' : 'Generate API Key'}
					</button>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
							>Last Used</th
						>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
							>Requests</th
						>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if keys.length === 0}
						<tr>
							<td colspan="7" class="px-6 py-8 text-center text-gray-500">
								No API keys yet. Generate one to get started.
							</td>
						</tr>
					{:else}
						{#each keys as key}
							<tr class:bg-gray-50={key.revoked_at || isExpired(key.expires_at)}>
								<td class="px-6 py-4">
									<code class="text-sm font-mono text-gray-800">{key.key_prefix}...</code>
								</td>
								<td class="px-6 py-4 text-sm text-gray-900">
									{key.key_name || '-'}
								</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{formatDate(key.created_at)}
								</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{formatDate(key.last_used_at)}
								</td>
								<td class="px-6 py-4">
									{#if key.revoked_at}
										<span class="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Revoked</span>
									{:else if isExpired(key.expires_at)}
										<span class="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800"
											>Expired</span
										>
									{:else}
										<span class="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{key.request_count}
								</td>
								<td class="px-6 py-4">
									{#if !key.revoked_at && !isExpired(key.expires_at)}
										<button
											on:click={() => revokeKey(key.id)}
											class="text-red-600 hover:text-red-800 text-sm font-medium"
										>
											Revoke
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
		<h3 class="text-sm font-semibold text-blue-900 mb-2">How to use API keys</h3>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• Use API keys to authenticate your mobile app with the Xinote backend</li>
			<li>• Include the key in the Authorization header: <code>Bearer YOUR_API_KEY</code></li>
			<li>• Keep your API keys secure and never commit them to version control</li>
			<li>• Revoke any keys that may have been compromised</li>
		</ul>
	</div>
</div>
