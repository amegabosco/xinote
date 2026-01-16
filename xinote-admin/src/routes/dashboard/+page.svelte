<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let showModal = false;
	let selectedRecording: any = null;

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number | null) {
		if (!seconds) return 'N/A';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatFileSize(bytes: number | null) {
		if (!bytes) return 'N/A';
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}

	function getStatusColor(status: string) {
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

	function getConfidenceColor(score: number | null) {
		if (!score) return 'text-gray-500';
		if (score >= 0.9) return 'text-green-600';
		if (score >= 0.7) return 'text-yellow-600';
		return 'text-red-600';
	}

	function openModal(recording: any) {
		selectedRecording = recording;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedRecording = null;
	}

	function goToPage(page: number) {
		goto(`/dashboard?page=${page}&limit=${data.pagination.limit}`);
	}

	async function transcribeRecording(recordingId: string) {
		try {
			const response = await fetch(`/api/recordings/${recordingId}/transcribe`, {
				method: 'POST'
			});

			if (response.ok) {
				alert('Transcription en cours. Rechargez la page dans quelques instants.');
				closeModal();
				location.reload();
			} else {
				const error = await response.json();
				alert('Erreur: ' + error.message);
			}
		} catch (err) {
			alert('Erreur lors de la transcription');
			console.error(err);
		}
	}

	async function generateReport(recordingId: string) {
		try {
			const response = await fetch(`/api/recordings/${recordingId}/generate-report`, {
				method: 'POST'
			});

			if (response.ok) {
				alert('Rapport en cours de génération. Rechargez la page dans quelques instants.');
				closeModal();
				location.reload();
			} else {
				const error = await response.json();
				alert('Erreur: ' + error.message);
			}
		} catch (err) {
			alert('Erreur lors de la génération du rapport');
			console.error(err);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && showModal) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

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
			<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
				<h2 class="text-lg font-semibold text-gray-900">Recent Recordings</h2>
				<div class="text-sm text-gray-600">
					Page {data.pagination.currentPage} of {data.pagination.totalPages}
					({data.pagination.totalRecordings} total)
				</div>
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
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.recordings as recording}
							<tr class="hover:bg-gray-50 cursor-pointer" on:click={() => openModal(recording)}>
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
								<td class="px-6 py-4 whitespace-nowrap text-sm" on:click|stopPropagation>
									<button
										on:click={() => openModal(recording)}
										class="text-blue-600 hover:text-blue-800 font-medium"
									>
										View Details →
									</button>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">
									No recordings found. Start by uploading audio from the Xinote mobile app.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if data.pagination.totalPages > 1}
				<div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
					<div class="flex-1 flex justify-between sm:hidden">
						<button
							on:click={() => goToPage(data.pagination.currentPage - 1)}
							disabled={!data.pagination.hasPrevPage}
							class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						<button
							on:click={() => goToPage(data.pagination.currentPage + 1)}
							disabled={!data.pagination.hasNextPage}
							class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
					<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p class="text-sm text-gray-700">
								Showing
								<span class="font-medium">{(data.pagination.currentPage - 1) * data.pagination.limit + 1}</span>
								to
								<span class="font-medium">{Math.min(data.pagination.currentPage * data.pagination.limit, data.pagination.totalRecordings)}</span>
								of
								<span class="font-medium">{data.pagination.totalRecordings}</span>
								results
							</p>
						</div>
						<div>
							<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
								<button
									on:click={() => goToPage(data.pagination.currentPage - 1)}
									disabled={!data.pagination.hasPrevPage}
									class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									←
								</button>

								{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as page}
									{#if page === 1 || page === data.pagination.totalPages || (page >= data.pagination.currentPage - 2 && page <= data.pagination.currentPage + 2)}
										<button
											on:click={() => goToPage(page)}
											class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 {page === data.pagination.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-700'}"
										>
											{page}
										</button>
									{:else if page === data.pagination.currentPage - 3 || page === data.pagination.currentPage + 3}
										<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
											...
										</span>
									{/if}
								{/each}

								<button
									on:click={() => goToPage(data.pagination.currentPage + 1)}
									disabled={!data.pagination.hasNextPage}
									class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									→
								</button>
							</nav>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Modal -->
{#if showModal && selectedRecording}
	<div class="fixed z-50 inset-0 overflow-y-auto" on:click={closeModal}>
		<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
			<!-- Background overlay -->
			<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

			<!-- Center modal -->
			<span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

			<!-- Modal panel -->
			<div
				class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
				on:click|stopPropagation
			>
				<!-- Header -->
				<div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
					<h3 class="text-lg font-semibold text-gray-900">Recording Details</h3>
					<button
						on:click={closeModal}
						class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<!-- Content -->
				<div class="bg-white px-6 py-4 max-h-[70vh] overflow-y-auto">
					<!-- Recording Info -->
					<div class="mb-6">
						<h4 class="text-sm font-semibold text-gray-700 mb-3">Information de l'enregistrement</h4>
						<dl class="grid grid-cols-2 gap-3 text-sm">
							<div>
								<dt class="font-medium text-gray-500">Date</dt>
								<dd class="text-gray-900">{formatDate(selectedRecording.exam_datetime)}</dd>
							</div>
							<div>
								<dt class="font-medium text-gray-500">Durée</dt>
								<dd class="text-gray-900">{formatDuration(selectedRecording.duration_seconds)}</dd>
							</div>
							<div>
								<dt class="font-medium text-gray-500">Type</dt>
								<dd class="text-gray-900">{selectedRecording.exam_type || 'General'}</dd>
							</div>
							<div>
								<dt class="font-medium text-gray-500">Status</dt>
								<dd>
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(selectedRecording.status)}">
										{selectedRecording.status}
									</span>
								</dd>
							</div>
							<div>
								<dt class="font-medium text-gray-500">Taille</dt>
								<dd class="text-gray-900">{formatFileSize(selectedRecording.file_size_bytes)}</dd>
							</div>
							<div>
								<dt class="font-medium text-gray-500">Patient</dt>
								<dd class="text-gray-900 font-mono">{selectedRecording.patient_code || 'N/A'}</dd>
							</div>
						</dl>
					</div>

					<!-- Patient Info -->
					{#if selectedRecording.patient_code}
						<div class="mb-6 pb-6 border-b border-gray-200">
							<h4 class="text-sm font-semibold text-gray-700 mb-3">Information Patient</h4>
							<dl class="grid grid-cols-2 gap-3 text-sm">
								{#if selectedRecording.age}
									<div>
										<dt class="font-medium text-gray-500">Âge</dt>
										<dd class="text-gray-900">{selectedRecording.age} ans</dd>
									</div>
								{/if}
								{#if selectedRecording.gender}
									<div>
										<dt class="font-medium text-gray-500">Genre</dt>
										<dd class="text-gray-900">{selectedRecording.gender}</dd>
									</div>
								{/if}
								{#if selectedRecording.medical_history}
									<div class="col-span-2">
										<dt class="font-medium text-gray-500">Historique médical</dt>
										<dd class="text-gray-900 mt-1">{selectedRecording.medical_history}</dd>
									</div>
								{/if}
							</dl>
						</div>
					{/if}

					<!-- Transcription -->
					<div class="mb-6 pb-6 border-b border-gray-200">
						<div class="flex justify-between items-center mb-3">
							<h4 class="text-sm font-semibold text-gray-700">Transcription</h4>
							{#if !selectedRecording.final_transcript}
								<button
									on:click={() => transcribeRecording(selectedRecording.id)}
									class="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
								>
									Lancer la transcription
								</button>
							{/if}
						</div>

						{#if selectedRecording.final_transcript}
							<div class="space-y-3">
								<!-- Quality Info -->
								<div class="flex gap-4 text-xs">
									<div>
										<span class="font-medium text-gray-600">Méthode:</span>
										<span class="text-gray-900 ml-1">{selectedRecording.processing_method || 'N/A'}</span>
									</div>
									{#if selectedRecording.whisper_confidence_score}
										<div>
											<span class="font-medium text-gray-600">Confiance:</span>
											<span class="ml-1 {getConfidenceColor(selectedRecording.whisper_confidence_score)}">
												{(selectedRecording.whisper_confidence_score * 100).toFixed(1)}%
											</span>
										</div>
									{/if}
								</div>

								<!-- Transcript Text -->
								<div class="bg-gray-50 rounded p-3 text-sm text-gray-900 max-h-60 overflow-y-auto">
									{selectedRecording.final_transcript}
								</div>

								<!-- Medical Terms -->
								{#if selectedRecording.medical_terms_detected && selectedRecording.medical_terms_detected.length > 0}
									<div>
										<h5 class="text-xs font-medium text-gray-600 mb-2">Termes médicaux</h5>
										<div class="flex flex-wrap gap-1">
											{#each selectedRecording.medical_terms_detected as term}
												<span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
													{term}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Anatomical Terms -->
								{#if selectedRecording.anatomical_terms && selectedRecording.anatomical_terms.length > 0}
									<div>
										<h5 class="text-xs font-medium text-gray-600 mb-2">Termes anatomiques</h5>
										<div class="flex flex-wrap gap-1">
											{#each selectedRecording.anatomical_terms as term}
												<span class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
													{term}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Medications -->
								{#if selectedRecording.medication_mentions && selectedRecording.medication_mentions.length > 0}
									<div>
										<h5 class="text-xs font-medium text-gray-600 mb-2">Médicaments</h5>
										<div class="flex flex-wrap gap-1">
											{#each selectedRecording.medication_mentions as med}
												<span class="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
													{med}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{:else}
							<p class="text-gray-500 text-sm text-center py-4">Aucune transcription disponible</p>
						{/if}
					</div>

					<!-- Reports -->
					<div>
						<div class="flex justify-between items-center mb-3">
							<h4 class="text-sm font-semibold text-gray-700">
								Rapports {#if selectedRecording.report_count > 0}({selectedRecording.report_count}){/if}
							</h4>
							<button
								on:click={() => generateReport(selectedRecording.id)}
								class="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
								disabled={!selectedRecording.final_transcript}
							>
								Générer un rapport
							</button>
						</div>

						{#if selectedRecording.report_count > 0}
							<p class="text-xs text-gray-500">
								{selectedRecording.report_count} rapport(s) disponible(s).
								<a href="/recordings/{selectedRecording.id}" class="text-blue-600 hover:underline">
									Voir tous les rapports →
								</a>
							</p>
						{:else}
							<p class="text-gray-500 text-sm text-center py-4">Aucun rapport généré</p>
						{/if}
					</div>
				</div>

				<!-- Footer -->
				<div class="bg-gray-50 px-6 py-3 flex justify-end gap-3">
					<button
						on:click={closeModal}
						class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Fermer
					</button>
					<a
						href="/recordings/{selectedRecording.id}"
						class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
					>
						Voir détails complets
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.fixed {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
