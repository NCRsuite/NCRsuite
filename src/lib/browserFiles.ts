function pageShell(title: string, message: string) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title.replace(/[<>]/g, '')}</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f5f5f7; color: #1d1d1f; }
    main { width: min(520px, calc(100% - 32px)); padding: 28px; border-radius: 22px; background: #fff; box-shadow: 0 18px 55px rgba(0,0,0,.10); text-align: center; }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 0; color: #626267; line-height: 1.5; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 22px; }
    a { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border-radius: 999px; text-decoration: none; font-weight: 700; }
    a.primary { background: #2997ff; color: #fff; }
    a.secondary { background: #ececf0; color: #1d1d1f; }
    small { display: block; margin-top: 16px; color: #8a8a90; }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #f5f5f7; }
      main { background: #1c1c1e; }
      p, small { color: #aaaab0; }
      a.secondary { background: #323236; color: #f5f5f7; }
    }
  </style>
</head>
<body><main><h1>${title.replace(/[<>]/g, '')}</h1><p>${message.replace(/[<>]/g, '')}</p></main></body>
</html>`;
}

export function prepareFileWindow(title: string, message: string): Window | null {
  const target = window.open('', '_blank');
  if (!target) return null;
  target.document.open();
  target.document.write(pageShell(title, message));
  target.document.close();
  return target;
}

export function closeFileWindow(target: Window | null) {
  if (target && !target.closed) target.close();
}

export function navigateFileWindow(target: Window | null, url: string) {
  if (target && !target.closed) {
    target.location.replace(url);
    return;
  }
  window.location.assign(url);
}

function isAppleTouchBrowser() {
  const userAgent = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function triggerDownloadInCurrentDocument(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function showBlobDownload(
  target: Window | null,
  url: string,
  filename: string,
  title = 'Téléchargement prêt'
) {
  const appleTouch = isAppleTouchBrowser();
  const host = target && !target.closed ? target : window.open('', '_blank');

  // Sur desktop/Android, déclenche d'abord le vrai téléchargement depuis la
  // fenêtre principale. C'est plus fiable qu'un clic programmatique dans le
  // popup de préparation après une génération PDF asynchrone.
  if (!appleTouch) {
    try {
      triggerDownloadInCurrentDocument(url, filename);
    } catch {
      // Le lien manuel du popup reste le filet de sécurité.
    }
  }

  if (!host) {
    if (appleTouch) window.location.assign(url);
    else triggerDownloadInCurrentDocument(url, filename);
    return;
  }

  host.document.open();
  host.document.write(pageShell(
    title,
    appleTouch
      ? 'Le PDF est prêt. Sur iPhone ou iPad, il va s’ouvrir afin que tu puisses l’enregistrer avec Partager → Enregistrer dans Fichiers.'
      : 'Le téléchargement a été lancé. Si ton navigateur le bloque, utilise le bouton ci-dessous.'
  ));
  host.document.close();

  const main = host.document.querySelector('main');
  if (!main) {
    host.location.replace(url);
    return;
  }

  const actions = host.document.createElement('div');
  actions.className = 'actions';

  const downloadLink = host.document.createElement('a');
  downloadLink.className = 'primary';
  downloadLink.href = url;
  downloadLink.rel = 'noopener';
  if (appleTouch) {
    downloadLink.target = '_self';
    downloadLink.textContent = 'Ouvrir pour enregistrer';
  } else {
    downloadLink.download = filename;
    downloadLink.textContent = 'Télécharger le PDF';
  }

  const openLink = host.document.createElement('a');
  openLink.className = 'secondary';
  openLink.href = url;
  openLink.target = '_self';
  openLink.textContent = 'Ouvrir le PDF';

  const help = host.document.createElement('small');
  help.textContent = appleTouch
    ? 'Sur iPhone/iPad : dans le PDF, touche Partager puis Enregistrer dans Fichiers.'
    : 'Si le téléchargement automatique est bloqué, utilise « Télécharger le PDF ».';

  actions.append(downloadLink, openLink);
  main.append(actions, help);

  if (appleTouch) {
    // Safari iOS ignore fréquemment l’attribut download sur les URL blob.
    // Ouvrir le PDF dans la fenêtre créée par le geste utilisateur est le
    // comportement le plus fiable et donne accès à « Enregistrer dans Fichiers ».
    window.setTimeout(() => {
      try { host.location.replace(url); } catch { /* Le bouton manuel reste disponible. */ }
    }, 180);
  }
}
