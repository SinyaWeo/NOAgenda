<script lang="ts">
    import { page } from '$app/stores';
    import { Button } from 'flowbite-svelte';
    import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
</script>

<div
    class="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
>
    <ExclamationCircleOutline class="w-16 h-16 text-red-500 mb-2" />
    <p class="text-6xl font-extrabold text-primary-600 leading-none m-0">
        {$page.status}
    </p>
    <p class="text-lg text-gray-500 dark:text-gray-400 m-0">
        {$page.error?.message ?? 'Page Not Found'}
    </p>
    <p class="text-sm text-gray-400 m-0"><code>{$page.url.pathname}</code></p>
    <Button href="/dashboard" class="mt-4">Back to Dashboard</Button>
</div>
