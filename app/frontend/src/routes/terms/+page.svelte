<script lang="ts">
	import LegalPage from '$lib/components/LegalPage.svelte';
	import { t } from '$lib/i18n';
	import { OPERATOR_NAME, CONTACT_EMAIL, LAST_UPDATED } from '$lib/legal';
	const operator = OPERATOR_NAME || '[Operator name and address]';
	const contact = CONTACT_EMAIL || '[contact email]';
</script>

<LegalPage title={$t('legal.terms.title')}>
	<p class="meta">{$t('legal.lastUpdated', { date: LAST_UPDATED })}</p>

	<p>
		These terms govern your use of NOAgenda ("the service"), operated by <strong>{operator}</strong> ("we").
		By creating an account you agree to them and to the <a href="/privacy">Privacy Policy</a>.
	</p>

	<h2>1. The service</h2>
	<p>
		NOAgenda lets you organise projects and tasks, collaborate with other people and manage your account.
		Features may change over time.
	</p>

	<h2>2. Your account</h2>
	<ul>
		<li>
			Give accurate information, and keep your password secret. You are responsible for activity under your
			account.
		</li>
		<li>
			One account per person. Tell us promptly if you think your account was accessed without permission.
		</li>
		<li>You must be at least [16] years old.</li>
	</ul>

	<h2>3. Acceptable use</h2>
	<p>You agree not to:</p>
	<ul>
		<li>store or share unlawful content, or content that infringes other people's rights;</li>
		<li>attack, probe or overload the service, or try to access other users' data;</li>
		<li>
			send spam or abusive content through the service (for example in comments, names or emails it sends);
		</li>
		<li>use automated access other than through your own API tokens and within the rate limits.</li>
	</ul>

	<h2>4. Your content</h2>
	<p>
		You keep all rights to what you put into the service. You give us the limited permission needed to store,
		back up and display it to you and the people you choose to share it with, and nothing more. You can export
		your data and delete your account at any time from Settings.
	</p>

	<h2>5. Availability and backups</h2>
	<p>
		We work to keep the service available and to back up data, but it is provided "as is" without a guarantee
		of uninterrupted or error-free operation. Keep your own copy of anything critical (the data export helps
		with that).
	</p>

	<h2>6. Ending your use</h2>
	<p>
		You may stop using the service and delete your account at any time. We may suspend or close an account
		that breaks these terms or puts the service or other users at risk; where reasonable we will warn you
		first and give you the chance to export your data.
	</p>

	<h2>7. Liability</h2>
	<p>
		To the extent permitted by law, we are not liable for indirect or consequential losses, or for data loss
		that could have been avoided by keeping your own copy. Nothing in these terms limits liability that cannot
		be limited by law. [Operator: have this section adapted to your jurisdiction.]
	</p>

	<h2>8. Changes</h2>
	<p>
		We may update these terms. We will publish the new version here and tell you about material changes.
		Continuing to use the service after a change means you accept it.
	</p>

	<h2>9. Governing law and contact</h2>
	<p>
		These terms are governed by the laws of [country/region]. Questions: <a href="mailto:{contact}">
			{contact}
		</a>.
	</p>
</LegalPage>
