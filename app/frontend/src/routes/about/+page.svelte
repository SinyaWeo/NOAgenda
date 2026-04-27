<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth } from '$lib/api';

    const info = writable<any>(null);
    const error = writable('');

    onMount(async () => {
        try {
            info.set(await apiGetAuth<any>('/info'));
        } catch (e: any) {
            error.set(e.message);
        }
    });
</script>

<div style="max-width:760px">
    <h1 style="margin-bottom:0.4rem">About NOAgenda</h1>
    <p style="margin:0 0 1.25rem;color:#64748b">
        A project-focused task manager built with NestJS and SvelteKit.
    </p>

    {#if $error}
        <p
            style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem"
        >
            {$error}
        </p>
    {:else if $info}
        <section
            style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
        >
            <dl
                style="display:grid;grid-template-columns:180px 1fr;gap:0.65rem 1rem;margin:0"
            >
                <dt style="margin:0;color:#64748b">Name</dt>
                <dd style="margin:0;color:#1e293b;font-weight:500">
                    {$info.name ?? 'NOAgenda'}
                </dd>

                <dt style="margin:0;color:#64748b">Version</dt>
                <dd style="margin:0;color:#1e293b;font-weight:500">
                    {$info.version ?? '—'}
                </dd>

                <dt style="margin:0;color:#64748b">Built at</dt>
                <dd style="margin:0;color:#1e293b">{$info.builtAt ?? '—'}</dd>

                <dt style="margin:0;color:#64748b">Commit</dt>
                <dd
                    style="margin:0;color:#1e293b;font-family:'JetBrains Mono',monospace;font-size:0.9rem"
                >
                    {$info.commit ?? '—'}
                </dd>
            </dl>
        </section>
    {:else}
        <p>Loading…</p>
    {/if}
</div>
