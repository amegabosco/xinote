<script>
	/** @type {any} */
	export let data;

	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds) {
		if (!seconds) return 'N/A';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getStatusColor(status) {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'processing':
				return 'bg-blue-100 text-blue-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>Xinote Dashboard - {data.doctor.full_name}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Xinote Dashboard</h1>
					<p class="text-sm text-gray-600">
						{data.doctor.full_name}
						{#if data.doctor.specialization}
							· {data.doctor.specialization}
						{/if}
					</p>
				</div>
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
					>
						Logout
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Statistics Cards -->
		<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="text-sm font-medium text-gray-500">Total Recordings</div>
				<div class="mt-2 text-3xl font-bold text-gray-900">{data.stats.total_recordings}</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<div class="text-sm font-medium text-gray-500">Completed</div>
				<div class="mt-2 text-3xl font-bold text-green-600">{data.stats.completed_recordings}</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<div class="text-sm font-medium text-gray-500">Pending</div>
				<div class="mt-2 text-3xl font-bold text-yellow-600">{data.stats.pending_recordings}</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<div class="text-sm font-medium text-gray-500">Failed</div>
				<div class="mt-2 text-3xl font-bold text-red-600">{data.stats.failed_recordings}</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<div class="text-sm font-medium text-gray-500">Patients</div>
				<div class="mt-2 text-3xl font-bold text-blue-600">{data.stats.total_patients}</div>
			</div>
		</div>

		<!-- Recordings Table -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Recent Recordings</h2>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Date
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Patient
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Type
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Duration
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Transcript
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.recordings as recording}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(recording.created_at)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{recording.patient_code || 'N/A'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{recording.exam_type || 'General'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDuration(recording.duration_seconds)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(recording.status)}">
										{recording.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									{#if recording.final_transcript}
										<div class="max-w-md truncate" title={recording.final_transcript}>
											{recording.final_transcript}
										</div>
									{:else}
										<span class="text-gray-400">No transcript</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-6 py-12 text-center text-sm text-gray-500">
									No recordings found. Start by uploading audio from the Xinote mobile app.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</main>
</div>

<style>
	/* Optional: Add any custom styles */
</style>
