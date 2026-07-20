import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WebMissionDonateDto } from './dto/web-mission-donate.dto';
import { MissionSharePageData, MissionShareService } from './mission-share.service';

@ApiTags('Deep Links')
@Controller()
export class DeepLinkController {
  constructor(private readonly missionShareService: MissionShareService) {}

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeJs(value: string) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');
  }

  private getAppStoreUrl() {
    return process.env.APP_STORE_URL || 'https://apps.apple.com/us/app/valens-app/id6752780902';
  }

  private getPlayStoreUrl() {
    return process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.valens';
  }

  /** Custom scheme path without scheme, e.g. postshare/uuid.
   *  browserFallbackUrl should be the webpage URL (not Play Store) so users stay on web when app is missing.
   */
  private buildAndroidIntentUrl(schemePath: string, browserFallbackUrl: string) {
    const encodedFallback = encodeURIComponent(browserFallbackUrl);
    return `intent://${schemePath}#Intent;scheme=com.valens.app;package=com.valens;S.browser_fallback_url=${encodedFallback};end`;
  }

  private openAppOrStoreScript(options: {
    deepLinkUrl: string;
    androidIntentUrl: string;
    appStoreUrl: string;
    playStoreUrl: string;
  }) {
    const deepLink = this.escapeJs(options.deepLinkUrl);
    const androidIntent = this.escapeJs(options.androidIntentUrl);
    const appStore = this.escapeJs(options.appStoreUrl);
    const playStore = this.escapeJs(options.playStoreUrl);

    return `
      <script>
        (function () {
          var deepLink = "${deepLink}";
          var androidIntent = "${androidIntent}";
          var appStore = "${appStore}";
          var playStore = "${playStore}";

          function isAndroid() {
            return /Android/i.test(navigator.userAgent || '');
          }

          function tryOpenAppOnly() {
            // Try app once per page load session. If not installed, stay on this webpage.
            var triedKey = 'valens_open_tried:' + window.pathname;
            try {
              if (sessionStorage.getItem(triedKey) === '1') return;
              sessionStorage.setItem(triedKey, '1');
            } catch (e) {}

            if (isAndroid()) {
              window.location.href = androidIntent;
              return;
            }
            window.location.href = deepLink;
          }

          function openStore() {
            window.location.href = isAndroid() ? playStore : appStore;
          }

          function openAppThenStore() {
            if (isAndroid()) {
              window.location.href = androidIntent;
            } else {
              window.location.href = deepLink;
            }
            setTimeout(function () {
              if (!document.hidden) {
                openStore();
              }
            }, 1800);
          }

          var openAppBtn = document.getElementById('openAppBtn');
          var getAppBtn = document.getElementById('getAppBtn');
          if (openAppBtn) {
            openAppBtn.addEventListener('click', function (e) {
              e.preventDefault();
              openAppThenStore();
            });
          }
          if (getAppBtn) {
            getAppBtn.addEventListener('click', function (e) {
              e.preventDefault();
              openStore();
            });
          }

          tryOpenAppOnly();
        })();
      </script>
    `;
  }

  private fallbackLandingBody(appStoreUrl: string, playStoreUrl: string) {
    const safeAppStore = this.escapeHtml(appStoreUrl);
    const safePlayStore = this.escapeHtml(playStoreUrl);
    return `
      <style>
        body {
          margin: 0;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          background: #ffffff;
          color: #111111;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .box {
          width: min(420px, 92vw);
          text-align: center;
          padding: 28px 20px;
        }
        h1 { font-size: 22px; margin: 0 0 10px; }
        p { color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
        .actions { display: grid; gap: 10px; }
        a.btn {
          display: block;
          text-decoration: none;
          border-radius: 12px;
          padding: 14px 16px;
          font-weight: 700;
        }
        a.primary { background: #2fb574; color: #062315; }
        a.secondary { background: #f3f3f3; color: #111111; }
      </style>
      <div class="box">
        <h1>Open in Valens</h1>
        <p>If the app is installed we will try to open it. Otherwise you can stay here or get the app.</p>
        <div class="actions">
          <a class="btn primary" id="openAppBtn" href="#">Open in app</a>
          <a class="btn secondary" id="getAppBtn" href="${safePlayStore}">Get the app</a>
          <a class="btn secondary" href="${safeAppStore}">App Store</a>
        </div>
      </div>
    `;
  }

  private fallbackHtml(route: string, id: string, req: Request) {
    const appStoreUrl = this.getAppStoreUrl();
    const playStoreUrl = this.getPlayStoreUrl();
    const configuredBaseUrl = process.env.BASE_URL;
    const configuredOgImageUrl = process.env.OG_IMAGE_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://api.valens.app');
    const encodedId = encodeURIComponent(id);
    const shareUrl = `${baseUrl}/${route}/${encodedId}`;
    const ogImage = configuredOgImageUrl || `${baseUrl}/share-assets/valens-share.png`;
    const schemePath = `${route}/${encodedId}`;
    const deepLinkUrl = `com.valens.app://${schemePath}`;
    // Fallback to this webpage when Android app is not installed (not Play Store).
    const androidIntentUrl = this.buildAndroidIntentUrl(schemePath, shareUrl);
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeOgImage = this.escapeHtml(ogImage);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Valens</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Join Valens and discover stories, profiles, and content shared with you.">

          <meta property="og:type" content="website">
          <meta property="og:site_name" content="Valens">
          <meta property="og:title" content="Valens">
          <meta property="og:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta property="og:url" content="${safeShareUrl}">
          <meta property="og:image" content="${safeOgImage}">
          <meta property="og:image:secure_url" content="${safeOgImage}">
          <meta property="og:image:type" content="image/png">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:image:alt" content="Valens App Logo">

          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Valens">
          <meta name="twitter:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta name="twitter:image" content="${safeOgImage}">

          <link rel="canonical" href="${safeShareUrl}">
        </head>
        <body>
          ${this.fallbackLandingBody(appStoreUrl, playStoreUrl)}
          ${this.openAppOrStoreScript({
            deepLinkUrl,
            androidIntentUrl,
            appStoreUrl,
            playStoreUrl,
          })}
        </body>
      </html>
    `;
  }

  private callbackFallbackHtml(req: Request) {
    const appStoreUrl = this.getAppStoreUrl();
    const playStoreUrl = this.getPlayStoreUrl();
    const configuredBaseUrl = process.env.BASE_URL;
    const configuredOgImageUrl = process.env.OG_IMAGE_URL;
    const configuredHomeDeepLink = process.env.HOME_DEEP_LINK_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://api.valens.app');
    const shareUrl = `${baseUrl}/callback`;
    const ogImage = configuredOgImageUrl || `${baseUrl}/share-assets/valens-share.png`;
    const deepLinkUrl = configuredHomeDeepLink || 'com.valens.app://callback';
    const androidIntentUrl = this.buildAndroidIntentUrl('callback', shareUrl);
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeOgImage = this.escapeHtml(ogImage);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Valens</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Join Valens and discover stories, profiles, and content shared with you.">

          <meta property="og:type" content="website">
          <meta property="og:site_name" content="Valens">
          <meta property="og:title" content="Valens">
          <meta property="og:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta property="og:url" content="${safeShareUrl}">
          <meta property="og:image" content="${safeOgImage}">
          <meta property="og:image:secure_url" content="${safeOgImage}">
          <meta property="og:image:type" content="image/png">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:image:alt" content="Valens App Logo">

          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Valens">
          <meta name="twitter:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta name="twitter:image" content="${safeOgImage}">

          <link rel="canonical" href="${safeShareUrl}">
        </head>
        <body>
          ${this.fallbackLandingBody(appStoreUrl, playStoreUrl)}
          ${this.openAppOrStoreScript({
            deepLinkUrl,
            androidIntentUrl,
            appStoreUrl,
            playStoreUrl,
          })}
        </body>
      </html>
    `;
  }

  private money(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  private missionDonationHtml(data: MissionSharePageData, req: Request) {
    const configuredBaseUrl = process.env.BASE_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://prod-api.valens.app');
    const shareUrl = `${baseUrl}/postshare/${encodeURIComponent(data.postId)}`;
    const deepLinkUrl = `com.valens.app://postshare/${encodeURIComponent(data.postId)}`;
    const appStoreUrl = this.getAppStoreUrl();
    const playStoreUrl = this.getPlayStoreUrl();
    const androidIntentUrl = this.buildAndroidIntentUrl(
      `postshare/${encodeURIComponent(data.postId)}`,
      shareUrl,
    );
    const ogImage = data.image || process.env.OG_IMAGE_URL || `${baseUrl}/share-assets/valens-share.png`;
    const description = `Support @${data.vendorHandle}'s mission on Valens. ${data.raisedAmount.toFixed(2)} raised of ${data.goalAmount.toFixed(2)} goal.`;

    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeOgImage = this.escapeHtml(ogImage);
    const safeTitle = this.escapeHtml(data.title);
    const safeVendorName = this.escapeHtml(data.vendorName);
    const safeVendorHandle = this.escapeHtml(data.vendorHandle);
    const safeDescription = this.escapeHtml(description);
    const safeStatusMessage = this.escapeHtml(data.statusMessage);
    const safeImage = data.image ? this.escapeHtml(data.image) : '';
    const safeDeepLink = this.escapeJs(deepLinkUrl);
    const safeAndroidIntent = this.escapeJs(androidIntentUrl);
    const safeAppStore = this.escapeJs(appStoreUrl);
    const safePlayStore = this.escapeJs(playStoreUrl);
    const safePostId = this.escapeJs(data.postId);
    const remaining = this.money(data.remainingAmount);
    const raised = this.money(data.raisedAmount);
    const goal = this.money(data.goalAmount);
    const canDonate = data.canDonate;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} · Valens</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Valens">
  <meta property="og:title" content="${this.escapeHtml(`Support @${data.vendorHandle}'s Mission on Valens`)}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeShareUrl}">
  <meta property="og:image" content="${safeOgImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.escapeHtml(`Support @${data.vendorHandle}'s Mission on Valens`)}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeOgImage}">
  <link rel="canonical" href="${safeShareUrl}">
  <style>
    :root {
      --bg: #ffffff;
      --panel: #ffffff;
      --text: #111111;
      --muted: #666666;
      --line: rgba(0,0,0,0.12);
      --accent: #1f9e63;
      --accent-dark: #17804f;
      --danger: #d64545;
      --warn: #b8860b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: var(--text);
      min-height: 100vh;
    }
    .wrap {
      width: min(560px, 100%);
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      gap: 12px;
    }
    .brand strong { letter-spacing: 0.08em; font-size: 14px; color: #111111; }
    .open-app {
      color: var(--accent);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
    }
    .card {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    .hero-frame {
      width: 100%;
      aspect-ratio: 16 / 10;
      background: #f0f0f0;
      overflow: hidden;
      position: relative;
    }
    .hero {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      display: block;
      background: #f0f0f0;
    }
    .hero.hero-cover { object-fit: cover; }
    .hero.hero-contain { object-fit: contain; }
    .hero-fallback {
      width: 100%;
      aspect-ratio: 16 / 10;
      display: grid;
      place-items: center;
      background: #f5f5f5;
      color: var(--muted);
      font-size: 14px;
    }
    .content { padding: 22px 20px 24px; }
    .creator {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      background: #e8e8e8;
    }
    .creator h2 {
      margin: 0;
      font-size: 16px;
      color: #111111;
    }
    .creator p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 26px;
      line-height: 1.25;
      color: #111111;
    }
    .status {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .status.goal_reached { color: var(--accent); }
    .status.closed, .status.unavailable { color: var(--danger); }
    .status.not_started { color: var(--warn); }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat {
      background: #f7f7f7;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px 10px;
      text-align: center;
    }
    .stat span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stat strong { font-size: 15px; color: #111111; }
    .progress {
      height: 10px;
      border-radius: 999px;
      background: #ececec;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .progress > i {
      display: block;
      height: 100%;
      width: ${Math.max(0, Math.min(100, data.fundedPercent))}%;
      background: linear-gradient(90deg, var(--accent-dark), var(--accent));
    }
    .progress-label {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 20px;
    }
    .form label {
      display: block;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .presets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .presets button {
      border: 1px solid var(--line);
      background: #ffffff;
      color: var(--text);
      border-radius: 12px;
      padding: 10px 0;
      cursor: pointer;
      font-weight: 600;
    }
    .presets button.active {
      border-color: var(--accent);
      background: rgba(31,158,99,0.1);
      color: var(--accent);
    }
    input, textarea {
      width: 100%;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: #ffffff;
      color: var(--text);
      padding: 14px 14px;
      font-size: 16px;
      margin-bottom: 12px;
      outline: none;
    }
    input:focus, textarea:focus { border-color: rgba(31,158,99,0.65); }
    textarea { min-height: 88px; resize: vertical; }
    .donate-btn, .disabled-btn {
      width: 100%;
      border: 0;
      border-radius: 14px;
      padding: 15px 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }
    .donate-btn {
      background: linear-gradient(180deg, #49d897, #2fb574);
      color: #062315;
    }
    .donate-btn:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .disabled-btn {
      background: #f0f0f0;
      color: var(--muted);
      cursor: not-allowed;
    }
    .error {
      display: none;
      margin-top: 12px;
      color: var(--danger);
      font-size: 13px;
      line-height: 1.4;
    }
    .hint {
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <strong>VALENS</strong>
      <a class="open-app" id="openAppLink" href="#">Open in app</a>
    </div>
    <div class="card">
      ${
        safeImage
          ? `<div class="hero-frame"><img class="hero" id="heroImage" src="${safeImage}" alt="${safeTitle}"></div>`
          : `<div class="hero-fallback">Mission on Valens</div>`
      }
      <div class="content">
        <div class="creator">
          ${
            data.vendorImage
              ? `<img class="avatar" src="${this.escapeHtml(data.vendorImage)}" alt="${safeVendorName}">`
              : `<div class="avatar"></div>`
          }
          <div>
            <h2>${safeVendorName}</h2>
            <p>@${safeVendorHandle}</p>
          </div>
        </div>
        <h1>${safeTitle}</h1>
        <p class="status ${this.escapeHtml(data.status)}">${safeStatusMessage}</p>
        <div class="stats">
          <div class="stat"><span>Raised</span><strong>${raised}</strong></div>
          <div class="stat"><span>Goal</span><strong>${goal}</strong></div>
          <div class="stat"><span>Left</span><strong>${remaining}</strong></div>
        </div>
        <div class="progress"><i></i></div>
        <div class="progress-label">${data.fundedPercent}% funded</div>
        ${
          canDonate
            ? `<form class="form" id="donateForm">
                <label for="amount">Donation amount (USD)</label>
                <div class="presets">
                  <button type="button" data-amount="5">$5</button>
                  <button type="button" data-amount="10" class="active">$10</button>
                  <button type="button" data-amount="25">$25</button>
                  <button type="button" data-amount="50">$50</button>
                </div>
                <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="10" required>
                <label for="note">Note (optional)</label>
                <textarea id="note" name="note" placeholder="Leave a message of support"></textarea>
                <button class="donate-btn" id="donateBtn" type="submit">Donate securely</button>
                <div class="error" id="errorBox"></div>
                <p class="hint">Secure checkout powered by Stripe. Remaining goal: ${remaining}.</p>
              </form>`
            : `<button class="disabled-btn" type="button" disabled>${safeStatusMessage}</button>
               <p class="hint">Open the Valens app to follow this mission.</p>`
        }
      </div>
    </div>
  </div>
  <script>
    (function () {
      var deepLink = "${safeDeepLink}";
      var androidIntent = "${safeAndroidIntent}";
      var appStore = "${safeAppStore}";
      var playStore = "${safePlayStore}";
      var postId = "${safePostId}";
      var canDonate = ${canDonate ? 'true' : 'false'};
      var remaining = ${Number(data.remainingAmount || 0)};

      function isAndroid() {
        return /Android/i.test(navigator.userAgent || '');
      }

      function openApp(withStoreFallback) {
        // Always try the app first. Stay on this webpage unless user asked for store fallback.
        if (isAndroid()) {
          window.location.href = androidIntent;
        } else {
          window.location.href = deepLink;
        }

        if (!withStoreFallback) return;

        setTimeout(function () {
          if (!document.hidden) {
            window.location.href = isAndroid() ? playStore : appStore;
          }
        }, 1800);
      }

      function applyHeroResizeMode(img) {
        if (!img || !img.naturalWidth || !img.naturalHeight) return;
        var imageRatio = img.naturalWidth / img.naturalHeight;
        var frame = img.parentElement;
        var frameRatio = frame && frame.clientWidth && frame.clientHeight
          ? frame.clientWidth / frame.clientHeight
          : 16 / 10;
        var diff = Math.abs(imageRatio - frameRatio) / frameRatio;

        img.classList.remove('hero-cover', 'hero-contain');

        // Portrait or strongly mismatched aspect → show full image (contain)
        // Close to frame aspect → fill frame (cover)
        if (imageRatio < 0.95 || diff > 0.28) {
          img.classList.add('hero-contain');
          img.style.objectFit = 'contain';
        } else {
          img.classList.add('hero-cover');
          img.style.objectFit = 'cover';
        }
      }

      var heroImage = document.getElementById('heroImage');
      if (heroImage) {
        if (heroImage.complete && heroImage.naturalWidth) {
          applyHeroResizeMode(heroImage);
        } else {
          heroImage.addEventListener('load', function () {
            applyHeroResizeMode(heroImage);
          });
        }
        window.addEventListener('resize', function () {
          applyHeroResizeMode(heroImage);
        });
      }

      function tryOpenApp() {
        var triedKey = 'valens_open_tried:' + location.pathname;
        try {
          if (sessionStorage.getItem(triedKey) === '1') return;
          sessionStorage.setItem(triedKey, '1');
        } catch (e) {}
        openApp(false);
      }

      var openAppLink = document.getElementById('openAppLink');
      if (openAppLink) {
        openAppLink.addEventListener('click', function (e) {
          e.preventDefault();
          openApp(true);
        });
      }

      tryOpenApp();

      if (!canDonate) return;

      var form = document.getElementById('donateForm');
      var amountInput = document.getElementById('amount');
      var noteInput = document.getElementById('note');
      var donateBtn = document.getElementById('donateBtn');
      var errorBox = document.getElementById('errorBox');
      var presetButtons = document.querySelectorAll('.presets button');

      presetButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          presetButtons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          amountInput.value = btn.getAttribute('data-amount');
        });
      });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        errorBox.style.display = 'none';
        errorBox.textContent = '';

        var amount = Number(amountInput.value);
        if (!amount || amount < 0.01) {
          errorBox.textContent = 'Enter a valid donation amount.';
          errorBox.style.display = 'block';
          return;
        }
        if (remaining > 0 && amount > remaining + 0.0001) {
          errorBox.textContent = 'Donation exceeds remaining goal amount of $' + remaining.toFixed(2) + '.';
          errorBox.style.display = 'block';
          return;
        }

        donateBtn.disabled = true;
        donateBtn.textContent = 'Redirecting to checkout...';

        try {
          var response = await fetch('/postshare/' + encodeURIComponent(postId) + '/donate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: amount,
              note: (noteInput.value || '').trim() || undefined
            })
          });
          var payload = await response.json();
          var sessionUrl =
            (payload && payload.data && payload.data.sessionUrl) ||
            (payload && payload.sessionUrl);

          if (!response.ok || !sessionUrl) {
            var message =
              (payload && payload.message) ||
              (payload && payload.data && payload.data.message) ||
              'Unable to start checkout. Please try again.';
            if (Array.isArray(message)) message = message.join(', ');
            throw new Error(message);
          }

          window.location.href = sessionUrl;
        } catch (err) {
          errorBox.textContent = (err && err.message) ? err.message : 'Unable to start checkout.';
          errorBox.style.display = 'block';
          donateBtn.disabled = false;
          donateBtn.textContent = 'Donate securely';
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  @Get('callback')
  callback(@Req() req: Request, @Res() res: Response) {
    return res.send(this.callbackFallbackHtml(req));
  }

  @Get('profile/:id')
  profile(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('profile', id, req));
  }

  @Get('u/:id')
  user(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('u', id, req));
  }

  @Get('share/:id')
  share(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('share', id, req));
  }

  @Get('postshare/:id')
  async postshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    try {
      const missionData = await this.missionShareService.getMissionSharePageData(id);
      if (missionData) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(this.missionDonationHtml(missionData, req));
      }
    } catch (error) {
      // Non-mission or missing post falls back to default deep-link page.
    }

    return res.send(this.fallbackHtml('postshare', id, req));
  }

  @Post('postshare/:id/donate')
  @ApiOperation({
    summary: 'Create Stripe checkout for a shared mission post (public web page)',
  })
  async donateFromSharePage(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: WebMissionDonateDto,
  ) {
    try {
      const donation = await this.missionShareService.createWebDonation(id, dto.amount, dto.note);
      return {
        sessionUrl: donation.sessionUrl,
        donationId: donation.id,
        status: donation.status,
        remainingHint: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw error;
    }
  }

  @Get('reelshare/:id')
  reelshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('reelshare', id, req));
  }

  @Get('storyshare/:id')
  storyshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('storyshare', id, req));
  }
}
