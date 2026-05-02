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

<div class="about-page">
    <h1>About NOAgenda</h1>
    <p class="text-muted mb-6">
        A project-focused task manager built with NestJS and SvelteKit.
    </p>

    {#if $error}
        <div class="alert alert-error">{$error}</div>
    {:else if $info}
        <div class="card">
            <div class="card-body">
                <dl class="info-dl">
                    <dt class="info-dt">Name</dt>
                    <dd class="info-dd">{$info.name ?? 'NOAgenda'}</dd>

                    <dt class="info-dt">Version</dt>
                    <dd class="info-dd">{$info.version ?? '—'}</dd>

                    <dt class="info-dt">Built at</dt>
                    <dd class="info-dd">{$info.builtAt ?? '—'}</dd>

                    <dt class="info-dt">Commit</dt>
                    <dd class="info-dd info-dd-mono">{$info.commit ?? '—'}</dd>
                </dl>
            </div>
        </div>
    {:else}
        <p>Loading…</p>
    {/if}
</div>
