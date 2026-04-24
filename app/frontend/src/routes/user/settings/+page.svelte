<script lang="ts">
// This is a placeholder for the user settings main page.
// Subpages (general, avatar, email-update, etc.) will be implemented as nested routes.
</script>

<h1>User Settings</h1>
<nav>
	<ul>
		<li><a href="/user/settings/general">General</a></li>
		<li><a href="/user/settings/avatar">Avatar</a></li>
		<li><a href="/user/settings/email-update">Email Update</a></li>
		<li><a href="/user/settings/password-update">Password Update</a></li>
		<li><a href="/user/settings/data-export">Data Export</a></li>
		<li><a href="/user/settings/deletion">Account Deletion</a></li>
		<!-- Add more links as needed -->
	</ul>
</nav>
<slot />
