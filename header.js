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
      --dh-header-pad: max(20px, calc((100% - 1200px) / 2));
      --dh-header-gap: 12px;
      --dh-header-bg: rgba(4, 5, 15, .86);
      --dh-header-border: rgba(255, 255, 255, .09);
      --dh-header-indigo: #6366f1;
      --dh-header-purple: #a855f7;
    }

    html body header {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      min-height: var(--dh-header-height);
      padding-top: 15px !important;
      padding-bottom: 15px !important;
      padding-left: var(--dh-header-pad) !important;
      padding-right: var(--dh-header-pad) !important;
      gap: var(--dh-header-gap) !important;
      align-items: center !important;
      flex-wrap: nowrap;
      background-color: var(--dh-header-bg);
      border-bottom: 1px solid var(--dh-header-border);
      z-index: 1000;
    }

    html body header > .logo,
    html body header > .brand,
    html body header > a.logo,
    html body header > a.brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex: 0 0 auto;
      min-width: 0;
      white-space: nowrap;
      text-decoration: none;
    }

    html body header .logo-icon,
    html body header .logo-mark,
    html body header .brand-icon,
    html body header .brand-mark,
    html body header .icon {
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

    html body header > nav,
    html body header > .nav,
    html body header > .header-buttons,
    html body header > .top-actions,
    html body header > .actions,
    html body header > .account-area,
    html body header > .dh-shared-account {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
      margin-left: auto;
    }

    html body header > nav,
    html body header > .nav {
      flex: 0 1 auto;
      flex-wrap: nowrap;
    }

    html body header > .header-buttons,
    html body header > .top-actions,
    html body header > .actions {
      flex: 0 0 auto;
      flex-wrap: nowrap;
    }

    html body header .account-area,
    html body header .dh-shared-account {
      position: relative;
      flex: 0 0 auto;
    }

    html body header .account-btn,
    html body header .account-button,
    html body header .profile-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 46px;
      padding: 6px 11px;
      border-radius: 12px;
      white-space: nowrap;
    }

    html body header .account-avatar,
    html body header .profile-avatar {
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

    html body header .account-avatar img,
    html body header .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    html body header nav > a,
    html body header .nav > a {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      html body header {
        flex-wrap: wrap;
        min-height: var(--dh-header-height);
        row-gap: 8px !important;
      }

      html body header > nav,
      html body header > .nav {
        max-width: 100%;
        overflow-x: auto;
        justify-content: flex-start;
        scrollbar-width: none;
      }

      html body header > nav::-webkit-scrollbar,
      html body header > .nav::-webkit-scrollbar {
        display: none;
      }

      html body header > .header-buttons,
      html body header > .top-actions,
      html body header > .actions {
        max-width: 100%;
      }
    }

    @media (max-width: 600px) {
      html body header {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }

      html body header > .logo,
      html body header > .brand,
      html body header > a.logo,
      html body header > a.brand {
        gap: 8px;
      }

      html body header .logo-icon,
      html body header .logo-mark,
      html body header .brand-icon,
      html body header .brand-mark,
      html body header .icon {
        width: 34px;
        height: 34px;
        min-width: 34px;
        min-height: 34px;
        flex-basis: 34px;
      }

      html body header .account-btn,
      html body header .account-button,
      html body header .profile-button {
        min-height: 40px;
        padding: 4px 8px;
        gap: 6px;
      }

      html body header .account-avatar,
      html body header .profile-avatar {
        width: 28px;
        height: 28px;
        min-width: 28px;
        flex-basis: 28px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html body header *,
      html body header *::before,
      html body header *::after {
        scroll-behavior: auto !important;
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
