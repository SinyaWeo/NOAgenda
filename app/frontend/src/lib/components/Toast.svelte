<script lang="ts">
    import { toasts, type ToastItem } from '$lib/toast';

    function dismiss(id: number) {
        toasts.update((list) => list.filter((t) => t.id !== id));
    }

    const colorClasses: Record<ToastItem['type'], string> = {
        success:
            'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
        error: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
        info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
    };

    const iconClasses: Record<ToastItem['type'], string> = {
        success: 'text-green-500',
        error: 'text-red-500',
        info: 'text-blue-500',
    };
</script>

<div
    class="fixed bottom-5 right-5 z-9999 flex flex-col gap-2 items-end pointer-events-none"
>
    {#each $toasts as toast (toast.id)}
        <div
            class="pointer-events-auto flex items-center gap-3 min-w-65 max-w-sm px-4 py-3 rounded-lg border shadow-lg text-sm font-medium {colorClasses[
                toast.type
            ]}"
            role="alert"
        >
            <!-- Icon -->
            {#if toast.type === 'success'}
                <svg
                    class="w-5 h-5 shrink-0 {iconClasses[toast.type]}"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                    ></path>
                </svg>
            {:else if toast.type === 'error'}
                <svg
                    class="w-5 h-5 shrink-0 {iconClasses[toast.type]}"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    ></path>
                </svg>
            {:else}
                <svg
                    class="w-5 h-5 shrink-0 {iconClasses[toast.type]}"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                    ></path>
                </svg>
            {/if}

            <span class="flex-1">{toast.message}</span>

            <!-- Close button -->
            <button
                onclick={() => dismiss(toast.id)}
                class="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer p-0 leading-none"
                aria-label="Dismiss"
            >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    ></path>
                </svg>
            </button>
        </div>
    {/each}
</div>
