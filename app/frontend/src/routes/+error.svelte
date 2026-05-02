<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="error-page">
    <span class="icon icon-lg">error</span>
    <p class="error-code">{$page.status}</p>
    <p class="error-message">{$page.error?.message ?? 'Page Not Found'}</p>
    <p class="text-muted text-sm">
        <code>{$page.url.pathname}</code>
    </p>
    <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
</div>
