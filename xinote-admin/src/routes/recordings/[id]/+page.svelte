<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
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
			case 'error':
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

	async function generateReport() {
		try {
			const response = await fetch(`/api/recordings/${data.recording.id}/generate-report`, {
				method: 'POST'
			});

			if (response.ok) {
				alert('Rapport en cours de génération. Rechargez la page dans quelques instants.');
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

	async function transcribeRecording() {
		try {
			const response = await fetch(`/api/recordings/${data.recording.id}/transcribe`, {
				method: 'POST'
			});

			if (response.ok) {
				alert('Transcription en cours. Rechargez la page dans quelques instants.');
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
</script>

<svelte:head>
	<title>Recording Details - Xinote</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="text-blue-600 hover:text-blue-800">
					← Back to Dashboard
				</a>
				<div class="flex-1">
					<h1 class="text-2xl font-bold text-gray-900">Recording Details</h1>
					<p class="text-sm text-gray-600">
						{data.doctor.full_name}
					</p>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Recording Info Card -->
		<div class="bg-white rounded-lg shadow mb-6">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Information de l'enregistrement</h2>
			</div>
			<div class="px-6 py-4">
				<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<dt class="text-sm font-medium text-gray-500">ID</dt>
						<dd class="mt-1 text-sm text-gray-900 font-mono">{data.recording.id}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Status</dt>
						<dd class="mt-1">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(data.recording.status)}">
								{data.recording.status}
							</span>
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Date</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDate(data.recording.exam_datetime)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Durée</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatDuration(data.recording.duration_seconds)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Type d'examen</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.recording.exam_type || 'General'}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Taille du fichier</dt>
						<dd class="mt-1 text-sm text-gray-900">{formatFileSize(data.recording.file_size_bytes)}</dd>
					</div>
				</dl>
			</div>
		</div>

		<!-- Patient Info Card -->
		{#if data.recording.patient_code}
			<div class="bg-white rounded-lg shadow mb-6">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Information Patient</h2>
				</div>
				<div class="px-6 py-4">
					<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<dt class="text-sm font-medium text-gray-500">Code Patient</dt>
							<dd class="mt-1 text-sm text-gray-900 font-mono">{data.recording.patient_code}</dd>
						</div>
						{#if data.recording.age}
							<div>
								<dt class="text-sm font-medium text-gray-500">Âge</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.recording.age} ans</dd>
							</div>
						{/if}
						{#if data.recording.gender}
							<div>
								<dt class="text-sm font-medium text-gray-500">Genre</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.recording.gender}</dd>
							</div>
						{/if}
						{#if data.recording.medical_history}
							<div class="md:col-span-2">
								<dt class="text-sm font-medium text-gray-500">Historique médical</dt>
								<dd class="mt-1 text-sm text-gray-900">{data.recording.medical_history}</dd>
							</div>
						{/if}
					</dl>
				</div>
			</div>
		{/if}

		<!-- Transcript Card -->
		<div class="bg-white rounded-lg shadow mb-6">
			<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
				<h2 class="text-lg font-semibold text-gray-900">Transcription</h2>
				{#if !data.recording.final_transcript}
					<button
						on:click={transcribeRecording}
						class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
					>
						Lancer la transcription
					</button>
				{/if}
			</div>
			<div class="px-6 py-4">
				{#if data.recording.final_transcript}
					<div class="space-y-4">
						<!-- Transcript Quality Info -->
						<div class="flex gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-700">Méthode:</span>
								<span class="text-gray-900 ml-2">{data.recording.processing_method || 'N/A'}</span>
							</div>
							{#if data.recording.whisper_confidence_score}
								<div>
									<span class="font-medium text-gray-700">Confiance Whisper:</span>
									<span class="ml-2 {getConfidenceColor(data.recording.whisper_confidence_score)}">
										{(data.recording.whisper_confidence_score * 100).toFixed(1)}%
									</span>
								</div>
							{/if}
							{#if data.recording.local_confidence_score}
								<div>
									<span class="font-medium text-gray-700">Confiance Locale:</span>
									<span class="ml-2 {getConfidenceColor(data.recording.local_confidence_score)}">
										{(data.recording.local_confidence_score * 100).toFixed(1)}%
									</span>
								</div>
							{/if}
						</div>

						<!-- Final Transcript -->
						<div>
							<h3 class="text-sm font-medium text-gray-700 mb-2">Transcription finale</h3>
							<div class="bg-gray-50 rounded p-4 text-sm text-gray-900 whitespace-pre-wrap">
								{data.recording.final_transcript}
							</div>
						</div>

						<!-- Medical Terms -->
						{#if data.recording.medical_terms_detected && data.recording.medical_terms_detected.length > 0}
							<div>
								<h3 class="text-sm font-medium text-gray-700 mb-2">Termes médicaux détectés</h3>
								<div class="flex flex-wrap gap-2">
									{#each data.recording.medical_terms_detected as term}
										<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
											{term}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Anatomical Terms -->
						{#if data.recording.anatomical_terms && data.recording.anatomical_terms.length > 0}
							<div>
								<h3 class="text-sm font-medium text-gray-700 mb-2">Termes anatomiques</h3>
								<div class="flex flex-wrap gap-2">
									{#each data.recording.anatomical_terms as term}
										<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
											{term}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Medications -->
						{#if data.recording.medication_mentions && data.recording.medication_mentions.length > 0}
							<div>
								<h3 class="text-sm font-medium text-gray-700 mb-2">Médicaments mentionnés</h3>
								<div class="flex flex-wrap gap-2">
									{#each data.recording.medication_mentions as med}
										<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
											{med}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Medical Flags -->
						{#if data.recording.medical_flags}
							<div>
								<h3 class="text-sm font-medium text-red-700 mb-2">⚠️ Alertes médicales</h3>
								<div class="bg-red-50 rounded p-4 text-sm text-red-900">
									<pre>{JSON.stringify(data.recording.medical_flags, null, 2)}</pre>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-gray-500 text-center py-8">Aucune transcription disponible</p>
				{/if}
			</div>
		</div>

		<!-- Reports Card -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
				<h2 class="text-lg font-semibold text-gray-900">Rapports</h2>
				<button
					on:click={generateReport}
					class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
					disabled={!data.recording.final_transcript}
				>
					Générer un rapport
				</button>
			</div>
			<div class="px-6 py-4">
				{#if data.reports && data.reports.length > 0}
					<div class="space-y-4">
						{#each data.reports as report}
							<div class="border border-gray-200 rounded-lg p-4">
								<div class="flex justify-between items-start mb-2">
									<div>
										<h3 class="font-medium text-gray-900">{report.report_id}</h3>
										<p class="text-sm text-gray-500">
											Demandé le {formatDate(report.requested_at)}
										</p>
									</div>
									<span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(report.generation_status)}">
										{report.generation_status}
									</span>
								</div>

								{#if report.generation_status === 'completed'}
									<div class="mt-3 flex gap-4 items-center">
										<a
											href={report.pdf_url}
											target="_blank"
											class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
										>
											Télécharger PDF
										</a>
										<span class="text-sm text-gray-500">
											{formatFileSize(report.pdf_file_size_bytes)}
										</span>
										{#if report.total_generation_time_ms}
											<span class="text-sm text-gray-500">
												Généré en {(report.total_generation_time_ms / 1000).toFixed(2)}s
											</span>
										{/if}
									</div>

									{#if report.ai_extraction_data}
										<div class="mt-4">
											<h4 class="text-sm font-medium text-gray-700 mb-2">Contenu du rapport</h4>
											<div class="bg-gray-50 rounded p-3 text-sm space-y-2">
												{#if report.ai_extraction_data.observations}
													<div>
														<span class="font-medium">Observations:</span>
														<ul class="ml-4 mt-1 list-disc">
															{#each report.ai_extraction_data.observations as obs}
																<li>{obs}</li>
															{/each}
														</ul>
													</div>
												{/if}
												{#if report.ai_extraction_data.analysis_summary}
													<div>
														<span class="font-medium">Analyse:</span>
														<p class="ml-4 mt-1">{report.ai_extraction_data.analysis_summary}</p>
													</div>
												{/if}
												{#if report.ai_extraction_data.medical_conclusion}
													<div>
														<span class="font-medium">Conclusion:</span>
														<p class="ml-4 mt-1">{report.ai_extraction_data.medical_conclusion}</p>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								{:else if report.generation_status === 'error'}
									<p class="text-sm text-red-600 mt-2">Erreur: {report.error_message}</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-center py-8">Aucun rapport généré</p>
				{/if}
			</div>
		</div>
	</main>
</div>