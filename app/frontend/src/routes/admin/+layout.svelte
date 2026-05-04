<script lang="ts">
    import { onMount } from 'svelte';
    import { requireAdmin } from '$lib/guards';

    let { children } = $props();

    onMount(async () => {
        await requireAdmin();
    });
</script>

{@render children?.()}
