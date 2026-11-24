import type { Message } from '../../core';
import type { messages as en } from '../en/auth';

// Messages for the "auth" area. Keys are prefixed "auth." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'auth.signInTitle': 'Přihlaste se ke svému účtu',
	'auth.sessionExpired': 'Platnost přihlášení vypršela. Přihlaste se prosím znovu.',
	'auth.loginFailed': 'Přihlášení se nezdařilo',
	'auth.stepUp.title': 'Potvrďte heslo',
	'auth.stepUp.text':
		'Změny v administraci vyžadují znovu zadat heslo. Na tomto zařízení se na něj chvíli nebudeme ptát.',
	'auth.stepUp.confirm': 'Potvrdit',
	'auth.loadAccountFailed': 'Účet se nepodařilo načíst',
	'auth.unknownError': 'Neznámá chyba',
	'auth.resend.label': 'Poslat potvrzovací odkaz znovu',
	'auth.resend.button': 'Poslat znovu',
	'auth.resend.ok': 'Pokud adresa patří k neověřenému účtu, poslali jsme nový odkaz.',
	'auth.resend.failed': 'E‑mail se nepodařilo odeslat. Zkuste to za chvíli znovu.',
	'auth.emailPlaceholder': 'vy@example.com',
	'auth.signIn': 'Přihlásit se',
	'auth.signingIn': 'Přihlašování…',
	'auth.demo.title': 'Demo účty',
	'auth.demo.hint':
		'Kliknutím na účet vyplníte přihlašovací formulář. Demo se každou noc o půlnoci obnoví. Nahrávání souborů (příloh, avatarů) je vypnuto.',
	'auth.demo.role.admin': 'Admin aplikace',
	'auth.demo.role.manager': 'Manažer týmu',
	'auth.demo.role.member': 'Člen týmu',
	'auth.demo.role.user': 'Uživatel',
	'auth.noAccount': 'Nemáte účet?',
	'auth.register': 'Zaregistrovat se',
	'auth.forgotPassword': 'Zapomněli jste heslo?',
	'auth.terms': 'Podmínky',
	'auth.privacy': 'Soukromí',
	'auth.languageSwitcher': 'Jazyk',

	'auth.register.title': 'Vytvořte si účet',
	'auth.register.failed': 'Registrace se nezdařila',
	'auth.register.closedTitle': 'Registrace je uzavřena',
	'auth.register.closedBody': 'Nové účty teď nelze vytvářet. Pokud už účet máte, můžete se přihlásit.',
	'auth.goToSignIn': 'Přejít na přihlášení',
	'auth.checkEmail': 'Zkontrolujte e‑mail',
	'auth.register.sentLink':
		'Poslali jsme potvrzovací odkaz na adresu {email}. Otevřete ho, aktivujte účet a poté se přihlaste.',
	'auth.register.inviteCode': 'Kód pozvánky',
	'auth.register.inviteHelp': 'Registrace je pouze na pozvání. Zadejte kód, který jste obdrželi.',
	'auth.register.passwordHint': 'Minimálně 8 znaků',
	'auth.register.agreePrefix': 'Přečetl(a) jsem a souhlasím s',
	'auth.register.termsLink': 'Podmínkami použití',
	'auth.register.agreeAnd': 'a se',
	'auth.register.privacyLink': 'Zásadami ochrany soukromí',
	'auth.register.submit': 'Vytvořit účet',
	'auth.register.submitting': 'Registrace…',
	'auth.register.haveAccount': 'Už máte účet?',

	'auth.reset.title': 'Obnovení hesla',
	'auth.reset.failed': 'Požadavek se nezdařil',
	'auth.reset.sent': 'Pokud pro tuto adresu existuje účet, poslali jsme pokyny k obnovení hesla.',
	'auth.backToSignIn': 'Zpět na přihlášení',
	'auth.reset.emailLabel': 'E‑mailová adresa',
	'auth.reset.send': 'Poslat odkaz pro obnovení',
	'auth.reset.sending': 'Odesílání…',

	'auth.newPassword.title': 'Nastavte nové heslo',
	'auth.newPassword.mismatch': 'Hesla se neshodují',
	'auth.newPassword.incompleteLink': 'Tento odkaz pro obnovení je neúplný. Požádejte o nový.',
	'auth.newPassword.failed': 'Obnovení hesla se nezdařilo',
	'auth.newPassword.success': 'Heslo bylo úspěšně obnoveno',
	'auth.newPassword.redirecting': 'Přesměrování na přihlášení…',
	'auth.newPassword.label': 'Nové heslo',
	'auth.newPassword.confirm': 'Potvrzení hesla',
	'auth.newPassword.submit': 'Obnovit heslo',
	'auth.newPassword.submitting': 'Obnovování…',

	'auth.verify.pageTitle': 'Potvrzení e‑mailu – {app}',
	'auth.verify.title': 'Potvrďte svou e‑mailovou adresu',
	'auth.verify.incomplete': 'Tento potvrzovací odkaz je neúplný.',
	'auth.verify.failed': 'E‑mailovou adresu se nepodařilo potvrdit.',
	'auth.verify.okTitle': 'E‑mail potvrzen',
	'auth.verify.okBody': 'Děkujeme! Nyní se můžete přihlásit.',
	'auth.verify.invalidTitle': 'Neplatný odkaz',
	'auth.verify.invalidBody': '{message} Možná vypršel nebo už byl použit.',
	'auth.verify.requestNew': 'Přihlaste se a vyžádejte si nový odkaz',

	'auth.profile.loadFailed': 'Profil se nepodařilo načíst.',
	'auth.profile.avatar': 'Avatar',
	'auth.profile.memberSince': 'Členem od',
	'auth.profile.timezone': 'Časové pásmo',
	'auth.profile.edit': 'Upravit profil',

	'auth.about.title': 'O aplikaci {app}',
	'auth.about.tagline': 'Správce úkolů zaměřený na projekty, vytvořený v NestJS a SvelteKitu.',
	'auth.about.version': 'Verze',
	'auth.about.source': 'Zdrojový kód',
	'auth.about.license': 'Licence',
	'auth.about.timeline.heading': 'Časová osa projektu',
	'auth.about.timeline.singleUser.title': 'Režim jednoho uživatele',
	'auth.about.timeline.singleUser.body':
		'Administrátor může instanci přepnout pro jediného člověka: týmy, sdílení, řešitelé a registrace ustoupí stranou a vše přejde na tohoto administrátora.',
	'auth.about.timeline.adminTools.title': 'Předávání projektů a potvrzení heslem',
	'auth.about.timeline.adminTools.body':
		'Administrátor může projekt předat jinému uživateli nebo ho převzít, i při mazání účtu, a změny v administraci potvrzuje heslem.',
	'auth.about.timeline.quickNotes.title': 'Rychlé poznámky a nová nástěnka',
	'auth.about.timeline.quickNotes.body':
		'Přepracovaná nástěnka s rychlými jednořádkovými poznámkami, které můžete odškrtnout nebo převést na úkol, projekt či nápad.',
	'auth.about.timeline.trash.title': 'Koš a historie verzí',
	'auth.about.timeline.trash.body':
		'Smazané projekty, úkoly a nápady počkají 30 dní v koši a vrátí se se vším, co pod nimi bylo; dřívější názvy a popisy lze obnovit.',
	'auth.about.timeline.ideas.title': 'Nápady',
	'auth.about.timeline.ideas.body':
		'Nová soukromá sekce Nápady pro rychlé poznámky, volitelně navázané na projekt a sdílitelné s vašimi týmy.',
	'auth.about.timeline.calendar.title': 'Kalendářový pohled',
	'auth.about.timeline.calendar.body':
		'Úkoly v kalendáři v projektech, na stránce Nadcházející a na nástěnce.',
	'auth.about.timeline.activity.title': 'Protokol aktivity',
	'auth.about.timeline.activity.body':
		'Auditní stopa toho, kdo co na úkolech a projektech změnil, včetně změn po jednotlivých polích, viditelná každému, kdo položku může číst, a správcům aplikace.',
	'auth.about.timeline.teams.title': 'Role v týmech a nástroje správce',
	'auth.about.timeline.teams.body':
		'Manažeři a členové týmů, samostatný správce aplikace s vlastní stránkou pro správu týmů a sekcí v postranním menu, bezpečnější mazání účtu posledního manažera týmu.',
	'auth.about.timeline.views.title': 'Pohledy na úkoly',
	'auth.about.timeline.views.body':
		'Kanban s přetahováním, Ganttův diagram, název projektu a priorita na každé kartě úkolu, posuvník průběhu, přiřazování úkolů členům týmu a vylepšená myšlenková mapa.',
	'auth.about.timeline.demo.title': 'Demo a nasazení více instancí',
	'auth.about.timeline.demo.body':
		'Demo instance s nočním resetem, skripty pro nasazení více instancí, stránky podmínek a soukromí, bohatší opakované úkoly a správa verzí.',
	'auth.about.timeline.branding.title': 'Vizuální identita a tmavý motiv',
	'auth.about.timeline.branding.body':
		'Logo a favikony pro oba motivy, opravy barev tmavého motivu, seeder citátů a provisioning skript.',
	'auth.about.timeline.containers.title': 'Kontejnery a open source',
	'auth.about.timeline.containers.body':
		'Kontejnerizace frontendu a backendu, release workflow, README, licence AGPL-3.0, seeder demo dat a jediná úvodní databázová migrace.',
	'auth.about.timeline.automation.title': 'Automatizace, lokalizace a aktualizace',
	'auth.about.timeline.automation.body':
		'Webhooky, notifikace, připomínky, opakované úkoly, Kanban sloupce, štítky úkolů, nahrávání souborů, česká a anglická lokalizace, zamykání/odemykání/mazání uživatelů a velké aktualizace závislostí (NestJS 12, TypeORM 1, SvelteKit 3, Vite 8, Node 26).',
	'auth.about.timeline.hardening.title': 'Zabezpečení a nasazení',
	'auth.about.timeline.hardening.body':
		'Bezpečnostní opravy, několik kol oprav z code review a nasazení za front-door Apache.',
	'auth.about.timeline.theme.title': 'Světlý a tmavý motiv',
	'auth.about.timeline.theme.body': 'Kosmetická vylepšení a přepínatelný světlý/tmavý motiv.',
	'auth.about.timeline.ux.title': 'Refaktoring UX',
	'auth.about.timeline.ux.body':
		'Refaktoring podle Laws of UX, jednotné odsazení a stejně vysoké karty v celé aplikaci, ikony zpět a vpřed.',
	'auth.about.timeline.roles.title': 'Uživatelské role a citáty',
	'auth.about.timeline.roles.body': 'Uživatelské role s řízením přístupu a motivační citáty.',
	'auth.about.timeline.nodes.title': 'Sjednocené uzly',
	'auth.about.timeline.nodes.body':
		'Projekty a úkoly sloučeny do jedné obecné entity uzlu, s opravami vytváření úkolů a podúkolů.',
	'auth.about.timeline.flowbite.title': 'Nový základ UI',
	'auth.about.timeline.flowbite.body':
		'Přechod z vlastního CSS na Flowbite Svelte, Material ikony a první základní funkce.',
	'auth.about.timeline.start.title': 'První commit',
	'auth.about.timeline.start.body':
		'Projekt začíná: backendové moduly, společná základní entita a zjednodušené skripty start/stop.'
};
