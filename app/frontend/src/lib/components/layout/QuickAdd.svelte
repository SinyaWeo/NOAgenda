<script lang="ts">
	import { Dropdown, DropdownItem } from 'flowbite-svelte';
	import { CheckCircleOutline, FolderOutline, PlusOutline } from 'flowbite-svelte-icons';
</script>

<button
	type="button"
	id="quick-add-btn"
	class="w-7 h-7 rounded-full bg-primary-600 text-white border-0 cursor-pointer flex items-center justify-content-center hover:opacity-85 transition-opacity"
	title="Create new…"
	aria-label="Create new task or project"
>
	<PlusOutline class="w-4 h-4 m-auto" />
</button>
<Dropdown triggeredBy="#quick-add-btn" placement="bottom-end">
	<DropdownItem href="/tasks/create">
		<CheckCircleOutline class="w-4 h-4 mr-2" />New Task
	</DropdownItem>
	<DropdownItem href="/projects/new">
		<FolderOutline class="w-4 h-4 mr-2" />New Project
	</DropdownItem>
</Dropdown>
