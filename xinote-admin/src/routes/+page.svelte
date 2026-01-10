<script>
	import { onMount } from 'svelte';

	let users = [];
	let loading = true;

	onMount(() => {
		// Simulation de données utilisateurs
		setTimeout(() => {
			users = [
				{ id: 1, name: 'Dr. Martin Dubois', email: 'martin.dubois@hopital.fr', role: 'Médecin', active: true },
				{ id: 2, name: 'Dr. Sarah Chen', email: 'sarah.chen@clinique.fr', role: 'Médecin', active: true },
				{ id: 3, name: 'Infirmière Julie', email: 'julie.martin@hopital.fr', role: 'Infirmière', active: false },
			];
			loading = false;
		}, 1000);
	});

	function toggleUserStatus(userId) {
		users = users.map(user =>
			user.id === userId ? { ...user, active: !user.active } : user
		);
	}
</script>

<svelte:head>
	<title>Xinote Admin - Dashboard</title>
</svelte:head>

<div class="container mx-auto px-6 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-800 mb-2">
			🏥 Xinote Admin
		</h1>
		<p class="text-gray-600">Gestion des droits d'accès à l'application mobile</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="flex items-center">
				<div class="p-3 bg-green-100 rounded-full">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
					</svg>
				</div>
				<div class="ml-4">
					<h3 class="text-lg font-semibold text-gray-700">Utilisateurs Actifs</h3>
					<p class="text-2xl font-bold text-green-600">{users.filter(u => u.active).length}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="flex items-center">
				<div class="p-3 bg-yellow-100 rounded-full">
					<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
					</svg>
				</div>
				<div class="ml-4">
					<h3 class="text-lg font-semibold text-gray-700">En Attente</h3>
					<p class="text-2xl font-bold text-yellow-600">{users.filter(u => !u.active).length}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="flex items-center">
				<div class="p-3 bg-blue-100 rounded-full">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
					</svg>
				</div>
				<div class="ml-4">
					<h3 class="text-lg font-semibold text-gray-700">Total Utilisateurs</h3>
					<p class="text-2xl font-bold text-blue-600">{users.length}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Users Table -->
	<div class="bg-white rounded-xl shadow-md overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-xl font-semibold text-gray-800">Gestion des Utilisateurs</h2>
		</div>

		{#if loading}
			<div class="p-8 text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-2 text-gray-600">Chargement des utilisateurs...</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Utilisateur
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Rôle
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Statut
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each users as user}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div class="flex-shrink-0 h-10 w-10">
											<div class="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
												{user.name.split(' ').map(n => n[0]).join('')}
											</div>
										</div>
										<div class="ml-4">
											<div class="text-sm font-medium text-gray-900">{user.name}</div>
											<div class="text-sm text-gray-500">{user.email}</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
										{user.role}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
										{user.active ? 'Actif' : 'Inactif'}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<button
										on:click={() => toggleUserStatus(user.id)}
										class="text-indigo-600 hover:text-indigo-900 mr-4"
									>
										{user.active ? 'Désactiver' : 'Activer'}
									</button>
									<button class="text-gray-600 hover:text-gray-900">
										Modifier
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Quick Actions -->
	<div class="mt-8">
		<h3 class="text-lg font-semibold text-gray-800 mb-4">Actions Rapides</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
				</svg>
				Nouvel Utilisateur
			</button>
			<button class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
				</svg>
				Configurer Sécurité
			</button>
		</div>
	</div>
</div>