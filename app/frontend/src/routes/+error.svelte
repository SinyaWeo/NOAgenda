<script lang="ts">
    import { page } from '$app/state';
    import { authSession } from '$lib/auth';
    import { Button } from 'flowbite-svelte';
    import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

    const status = $derived(page.status);
    const signedIn = $derived($authSession.status === 'authenticated');

    const title = $derived(
        status === 404
            ? 'Page not found'
            : status === 403
              ? 'No access'
              : status >= 500
                ? 'Something went wrong'
                : 'Something is not right',
    );
    // Never show raw server error text for 5xx: it can contain internals.
    const detail = $derived(
        status === 404
            ? 'The page you are looking for does not exist or was moved.'
            : status === 403
              ? 'You do not have permission to open this page.'
              : status >= 500
                ? 'Our side hit an unexpected problem. Please try again in a moment.'
                : (page.error?.message ?? 'The request could not be completed.'),
    );
</script>

<svelte:head><title>{title} · NOAgenda</title></svelte:head>

<div
    class="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    role="alert"
>
    <ExclamationCircleOutline class="w-16 h-16 text-red-500 mb-2" aria-hidden="true" />
    <p class="text-6xl font-extrabold text-primary-600 leading-none m-0">{status}</p>
    <h1 class="text-xl font-semibold m-0 mt-2">{title}</h1>
    <p class="text-gray-500 dark:text-gray-400 m-0 max-w-md">{detail}</p>
    <div class="flex gap-3 mt-4">
        <Button href={signedIn ? '/dashboard' : '/user/login'}>{signedIn ? 'Back to Dashboard' : 'Sign in'}</Button>
        <Button color="light" onclick={() => history.back()}>Go back</Button>
    </div>
</div>
