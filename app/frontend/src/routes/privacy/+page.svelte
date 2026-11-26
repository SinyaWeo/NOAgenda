<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { t } from '#lib/i18n/index.js';
	import { OPERATOR_NAME, CONTACT_EMAIL, LAST_UPDATED } from '#lib/legal.js';
	const operator = OPERATOR_NAME || '[Operator name and address]';
	const contact = CONTACT_EMAIL || '[contact email]';
</script>

<LegalPage title={t('legal.privacy.title')}>
	<p class="meta">{t('legal.lastUpdated', { date: LAST_UPDATED })}</p>

	<p>
		This policy explains what personal data NOAgenda ("the service") stores about you, why, and what you can
		do about it. The service is operated by <strong>{operator}</strong> ("we"). Questions:
		<a href="mailto:{contact}">{contact}</a>.
	</p>

	<h2>1. What we store</h2>
	<ul>
		<li>
			<strong>Account:</strong> username, email address, password (stored only as a salted bcrypt hash, never in
			readable form), optional display name and avatar, and your preferences (theme, timezone, language).
		</li>
		<li>
			<strong>Your content:</strong> projects, tasks, comments, labels, teams, saved filters, attachments you upload,
			notifications, favourites and similar items you create in the app.
		</li>
		<li>
			<strong>Security and technical data:</strong> for each signed-in device the browser/app name and IP address,
			and the time it was last used (shown to you under Settings → Sessions); failed sign-in attempts (username
			and IP address); standard server logs. This is used only to keep accounts secure and the service running.
		</li>
		<li>
			<strong>Consent record:</strong> the time you accepted the Terms and this policy when registering.
		</li>
	</ul>
	<p>
		We do not use advertising, analytics or tracking tools and we do not sell or share your data for
		marketing.
	</p>

	<h2>2. Cookies and browser storage</h2>
	<p>Only what is strictly necessary for the service to work:</p>
	<ul>
		<li>a sign-in cookie (<code>noa_rt</code>, HttpOnly, valid up to 30 days) that keeps you signed in;</li>
		<li>
			a short-lived access token (15 minutes) and a few preferences (e.g. sidebar state, theme) in your
			browser's local storage.
		</li>
	</ul>
	<p>Because these are essential, no cookie consent banner is shown. They are removed when you sign out.</p>

	<h2>3. Why we process it</h2>
	<p>
		To provide the service you signed up for (account, task management, collaboration, security emails), and
		our legitimate interest in keeping it secure and preventing abuse. We process your content only on your
		instructions. [Operator: confirm the legal bases that apply in your jurisdiction.]
	</p>

	<h2>4. Who sees your data</h2>
	<ul>
		<li>
			<strong>People you collaborate with:</strong> anything in a project you share is visible to the people (or
			teams) you shared it with. Your username and display name are visible to other signed-in users so they can
			add you to projects.
		</li>
		<li>
			<strong>Service providers (processors):</strong> hosting [hosting provider, location] and email delivery [email
			provider], solely to run the service. [Operator: list your actual providers.]
		</li>
		<li>We disclose data to authorities only where legally required.</li>
	</ul>

	<h2>5. How long we keep it</h2>
	<ul>
		<li>Account data and content: until you delete your account.</li>
		<li>
			When you ask to delete your account it is scheduled for deletion after a <strong>
				7-day grace period
			</strong> (you can cancel during that time). After that your account and the projects you own are permanently
			removed, together with their tasks, comments and attachments. Tasks you created in other people's projects
			stay in those projects without your name.
		</li>
		<li>Backups made before deletion are overwritten on a rolling schedule of about [14] days.</li>
		<li>Security logs: [30] days.</li>
	</ul>

	<h2>6. Your rights</h2>
	<ul>
		<li>
			<strong>Access and portability:</strong> Settings → Data export downloads everything we hold about you as
			a JSON file.
		</li>
		<li><strong>Correction:</strong> edit your profile and settings at any time.</li>
		<li><strong>Deletion:</strong> Settings → Delete account.</li>
		<li>
			<strong>Objection, restriction, complaint:</strong> contact us at
			<a href="mailto:{contact}">{contact}</a>. You may also complain to your data protection authority.
		</li>
	</ul>

	<h2>7. Security</h2>
	<p>
		Connections are encrypted (HTTPS). Passwords are hashed; sign-in sessions can be revoked at any time;
		accounts are temporarily locked after repeated failed sign-ins; access to data is restricted to its owner
		and the people it is shared with. No system is perfectly secure; if a breach affects you we will notify
		you as required by law.
	</p>

	<h2>8. Children</h2>
	<p>The service is not intended for children under [16]. Do not register if you are younger.</p>

	<h2>9. Changes</h2>
	<p>
		We will publish changes on this page and update the date above. If a change is material we will tell you
		in the app or by email.
	</p>
</LegalPage>
