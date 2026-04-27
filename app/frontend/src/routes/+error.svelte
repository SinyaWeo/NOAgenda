<script lang="ts">
    import { page } from '$app/stores';
</script>

<div
    style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;padding:1rem"
>
    <div
        style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:3rem 2.5rem;width:100%;max-width:440px;text-align:center"
    >
        <div style="font-size:3rem;margin-bottom:1rem">&#128683;</div>
        <h1
            style="font-size:1.4rem;font-weight:700;color:#1e293b;margin:0 0 0.5rem"
        >
            {$page.status} &mdash; {$page.error?.message ?? 'Page Not Found'}
        </h1>
        <p style="color:#64748b;font-size:0.9rem;margin:0 0 1.5rem">
            <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px"
                >{$page.url.pathname}</code
            >
        </p>
        <a
            href="/dashboard"
            style="display:inline-block;padding:0.6rem 1.5rem;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;font-weight:500"
            >Back to Dashboard</a
        >
    </div>
</div>
