/* DougHub shared header system
   Keep this file as the single place to tune header spacing, branding, navigation,
   and account-control placement. Page-specific header links/actions remain intact. */
(function () {
  "use strict";
  if (document.getElementById("dh-shared-header-style")) return;

  const style = document.createElement("style");
  style.id = "dh-shared-header-style";
  style.textContent = `
    :root {
      --dh-header-height: 72px;
      --dh-header-pad: clamp(14px, 2.2vw, 30px);
      --dh-header-gap: 12px;
      --dh-header-bg: rgba(4, 5, 15, .86);
      --dh-header-border: rgba(255, 255, 255, .09);
      --dh-header-indigo: #6366f1;
      --dh-header-purple: #a855f7;
    }

    body > header {
      box-sizing: border-box !important;
      min-height: var(--dh-header-height);
      padding-left: var(--dh-header-pad) !important;
      padding-right: var(--dh-header-pad) !important;
      gap: var(--dh-header-gap) !important;
      align-items: center !important;
      flex-wrap: nowrap;
      background-color: var(--dh-header-bg);
      border-bottom: 1px solid var(--dh-header-border);
      z-index: 1000;
    }

    body > header > .logo,
    body > header > .brand,
    body > header > a.logo,
    body > header > a.brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex: 0 0 auto;
      min-width: 0;
      white-space: nowrap;
      text-decoration: none;
    }

    body > header .logo-icon,
    body > header .logo-mark,
    body > header .brand-icon,
    body > header .brand-mark,
    body > header .icon {
      box-sizing: border-box;
      width: 38px;
      height: 38px;
      min-width: 38px;
      min-height: 38px;
      flex: 0 0 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--dh-header-indigo), var(--dh-header-purple));
      box-shadow: 0 8px 25px rgba(99, 102, 241, .25);
      line-height: 1;
    }

    body > header > nav,
    body > header > .nav,
    body > header > .header-buttons,
    body > header > .top-actions,
    body > header > .actions,
    body > header > .account-area,
    body > header > .dh-shared-account {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
      margin-left: auto;
    }

    body > header > nav,
    body > header > .nav {
      flex: 0 1 auto;
      flex-wrap: nowrap;
    }

    body > header > .header-buttons,
    body > header > .top-actions,
    body > header > .actions {
      flex: 0 0 auto;
      flex-wrap: nowrap;
    }

    body > header .account-area,
    body > header .dh-shared-account {
      position: relative;
      flex: 0 0 auto;
    }

    body > header .account-btn,
    body > header .account-button,
    body > header .profile-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 46px;
      padding: 6px 11px;
      border-radius: 12px;
      white-space: nowrap;
    }

    body > header .account-avatar,
    body > header .profile-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      flex: 0 0 32px;
      border-radius: 50%;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    body > header .account-avatar img,
    body > header .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    body > header nav > a,
    body > header .nav > a {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      body > header {
        flex-wrap: wrap;
        min-height: var(--dh-header-height);
        row-gap: 8px !important;
      }

      body > header > nav,
      body > header > .nav {
        max-width: 100%;
        overflow-x: auto;
        justify-content: flex-start;
        scrollbar-width: none;
      }

      body > header > nav::-webkit-scrollbar,
      body > header > .nav::-webkit-scrollbar {
        display: none;
      }

      body > header > .header-buttons,
      body > header > .top-actions,
      body > header > .actions {
        max-width: 100%;
      }
    }

    @media (max-width: 600px) {
      body > header {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }

      body > header > .logo,
      body > header > .brand,
      body > header > a.logo,
      body > header > a.brand {
        gap: 8px;
      }

      body > header .logo-icon,
      body > header .logo-mark,
      body > header .brand-icon,
      body > header .brand-mark,
      body > header .icon {
        width: 34px;
        height: 34px;
        min-width: 34px;
        min-height: 34px;
        flex-basis: 34px;
      }

      body > header .account-btn,
      body > header .account-button,
      body > header .profile-button {
        min-height: 40px;
        padding: 4px 8px;
        gap: 6px;
      }

      body > header .account-avatar,
      body > header .profile-avatar {
        width: 28px;
        height: 28px;
        min-width: 28px;
        flex-basis: 28px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      body > header *,
      body > header *::before,
      body > header *::after {
        scroll-behavior: auto !important;
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
