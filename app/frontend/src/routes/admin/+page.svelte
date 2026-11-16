<script lang="ts">
    import { Card } from 'flowbite-svelte';
    import {
        UsersGroupOutline,
        QuoteOutline,
        CogOutline,
    } from 'flowbite-svelte-icons';

</script>

<svelte:head>
    <title>Admin — NOAgenda</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Admin Dashboard
    </h1>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <a href="/admin/users" class="no-underline">
            <Card
                class="hover:shadow-md transition-shadow cursor-pointer h-full"
            >
                <div class="flex items-center gap-3">
                    <UsersGroupOutline class="w-8 h-8 text-primary-600" />
                    <div>
                        <p class="font-semibold text-gray-900 dark:text-white">
                            Users
                        </p>
                        <p class="text-sm text-gray-500">Manage user roles</p>
                    </div>
                </div>
            </Card>
        </a>
        <a href="/admin/quotes" class="no-underline">
            <Card
                class="hover:shadow-md transition-shadow cursor-pointer h-full"
            >
                <div class="flex items-center gap-3">
                    <QuoteOutline class="w-8 h-8 text-primary-600" />
                    <div>
                        <p class="font-semibold text-gray-900 dark:text-white">
                            Quotes
                        </p>
                        <p class="text-sm text-gray-500">
                            Manage motivational quotes
                        </p>
                    </div>
                </div>
            </Card>
        </a>
        <a href="/admin/settings" class="no-underline">
            <Card
                class="hover:shadow-md transition-shadow cursor-pointer h-full"
            >
                <div class="flex items-center gap-3">
                    <CogOutline class="w-8 h-8 text-primary-600" />
                    <div>
                        <p class="font-semibold text-gray-900 dark:text-white">
                            Settings
                        </p>
                        <p class="text-sm text-gray-500">App configuration</p>
                    </div>
                </div>
            </Card>
        </a>
    </div>
</div>
