<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Task } from '$lib/types';
	import { Card } from 'flowbite-svelte';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
	import TaskVersionHistory from '$lib/components/task/TaskVersionHistory.svelte';

	let {
		taskId,
		activityVersion,
		onRestored
	}: {
		taskId: number;
		/** Changes whenever something that is recorded in the activity log may have changed. */
		activityVersion: string;
		onRestored: (task: Task) => void;
	} = $props();
</script>

<!-- Version history -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.history.title')}</h2>
	<TaskVersionHistory {taskId} version={activityVersion} {onRestored} />
</Card>

<!-- Activity log -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('activity.title')}</h2>
	<ActivityLog endpoint="/activity?nodeId={taskId}" version={activityVersion} />
</Card>
