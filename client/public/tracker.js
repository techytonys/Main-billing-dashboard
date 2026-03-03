(function() {
  "use strict";
  var ENDPOINT = (document.currentScript && document.currentScript.getAttribute("data-endpoint")) || window.location.origin;
  var SITE_ID = (document.currentScript && document.currentScript.getAttribute("data-site")) || window.location.hostname;

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getVisitorId() {
    var vid = localStorage.getItem("_aips_vid");
    if (!vid) { vid = uuid(); localStorage.setItem("_aips_vid", vid); }
    return vid;
  }

  function getSessionId() {
    var sid = sessionStorage.getItem("_aips_sid");
    if (!sid) { sid = uuid(); sessionStorage.setItem("_aips_sid", sid); }
    return sid;
  }

  var socialPatterns = [
    { platform: "facebook", regex: /facebook\.com|fb\.com|fb\.me|l\.facebook\.com|lm\.facebook\.com/i, details: {
      "reel": /\/reel/i, "group": /\/groups\//i, "story": /\/stories\//i, "watch": /\/watch/i,
      "marketplace": /\/marketplace/i, "page": /\/pages\//i, "event": /\/events\//i, "profile": /\/profile/i
    }},
    { platform: "instagram", regex: /instagram\.com|l\.instagram\.com/i, details: {
      "reel": /\/reel/i, "story": /\/stories\//i, "explore": /\/explore/i, "igtv": /\/tv\//i,
      "profile": /\/[^\/]+\/?$/i, "post": /\/p\//i
    }},
    { platform: "tiktok", regex: /tiktok\.com|vm\.tiktok\.com/i, details: {
      "video": /\/video\//i, "live": /\/live/i, "profile": /\/@/i, "discover": /\/discover/i,
      "sound": /\/music\//i, "hashtag": /\/tag\//i
    }},
    { platform: "pinterest", regex: /pinterest\.com|pin\.it/i, details: {
      "pin": /\/pin\//i, "board": /\/[^\/]+\/[^\/]+\/?$/i, "profile": /\/[^\/]+\/?$/i,
      "idea": /\/idea/i, "search": /\/search/i
    }},
    { platform: "twitter", regex: /twitter\.com|t\.co|x\.com/i, details: {
      "tweet": /\/status\//i, "profile": /\/[^\/]+\/?$/i, "list": /\/lists\//i,
      "space": /\/spaces\//i, "moment": /\/moments\//i
    }},
    { platform: "linkedin", regex: /linkedin\.com|lnkd\.in/i, details: {
      "post": /\/posts\//i, "article": /\/pulse\//i, "company": /\/company\//i,
      "job": /\/jobs\//i, "profile": /\/in\//i, "group": /\/groups\//i
    }},
    { platform: "youtube", regex: /youtube\.com|youtu\.be/i, details: {
      "video": /\/watch/i, "short": /\/shorts\//i, "channel": /\/channel\//i,
      "playlist": /\/playlist/i, "live": /\/live/i
    }},
    { platform: "reddit", regex: /reddit\.com|redd\.it/i, details: {
      "post": /\/comments\//i, "subreddit": /\/r\//i, "profile": /\/user\//i
    }},
    { platform: "snapchat", regex: /snapchat\.com|snap\.com/i, details: { "story": /\/story/i, "spotlight": /\/spotlight/i }},
    { platform: "whatsapp", regex: /whatsapp\.com|wa\.me/i, details: {}},
    { platform: "telegram", regex: /t\.me|telegram\.org/i, details: { "channel": /\/s\//i }},
    { platform: "threads", regex: /threads\.net/i, details: { "post": /\/post\//i }}
  ];

  function detectSource(ref, url) {
    var result = { source: "direct", medium: "none", campaign: null, socialPlatform: null, socialDetail: null };

    var params = new URLSearchParams(new URL(url).search);
    if (params.get("utm_source")) result.source = params.get("utm_source");
    if (params.get("utm_medium")) result.medium = params.get("utm_medium");
    if (params.get("utm_campaign")) result.campaign = params.get("utm_campaign");
    if (params.get("fbclid")) { result.source = "facebook"; result.medium = "social"; }
    if (params.get("gclid")) { result.source = "google"; result.medium = "cpc"; }
    if (params.get("ttclid")) { result.source = "tiktok"; result.medium = "social"; }

    if (ref) {
      if (result.source === "direct") {
        if (/google\./i.test(ref)) { result.source = "google"; result.medium = "organic"; }
        else if (/bing\./i.test(ref)) { result.source = "bing"; result.medium = "organic"; }
        else if (/yahoo\./i.test(ref)) { result.source = "yahoo"; result.medium = "organic"; }
        else if (/duckduckgo/i.test(ref)) { result.source = "duckduckgo"; result.medium = "organic"; }
      }

      for (var i = 0; i < socialPatterns.length; i++) {
        var sp = socialPatterns[i];
        if (sp.regex.test(ref) || result.source === sp.platform) {
          result.socialPlatform = sp.platform;
          result.medium = "social";
          if (result.source === "direct") result.source = sp.platform;
          for (var key in sp.details) {
            if (sp.details[key].test(ref)) { result.socialDetail = key; break; }
          }
          if (!result.socialDetail) result.socialDetail = "link";
          break;
        }
      }
    }

    if (result.source !== "direct" && !result.socialPlatform) {
      for (var j = 0; j < socialPatterns.length; j++) {
        if (result.source === socialPatterns[j].platform) {
          result.socialPlatform = socialPatterns[j].platform;
          result.medium = "social";
          result.socialDetail = "ad";
          break;
        }
      }
    }

    return result;
  }

  function getDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
      if (/iPad|Tablet/i.test(ua)) return "tablet";
      return "mobile";
    }
    return "desktop";
  }

  function getBrowser() {
    var ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/Firefox/i.test(ua)) return "Firefox";
    return "Other";
  }

  function getOS() {
    var ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac OS/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Other";
  }

  function send(path, data) {
    var url = ENDPOINT + path;
    var body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(body);
    }
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var sourceInfo = detectSource(document.referrer, window.location.href);
  var pageStart = Date.now();

  function getTimezone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e) { return ""; }
  }

  function getLanguage() {
    return (navigator.language || navigator.userLanguage || "en").substring(0, 5);
  }

  var isNewSession = !sessionStorage.getItem("_aips_sess_init");
  if (isNewSession) {
    sessionStorage.setItem("_aips_sess_init", "1");
    send("/api/analytics/session", {
      sessionId: sessionId, visitorId: visitorId,
      source: sourceInfo.source, medium: sourceInfo.medium, campaign: sourceInfo.campaign,
      socialPlatform: sourceInfo.socialPlatform, socialDetail: sourceInfo.socialDetail,
      referrer: document.referrer || null,
      device: getDevice(), browser: getBrowser(), os: getOS(),
      entryPage: window.location.pathname,
      screenWidth: screen.width, screenHeight: screen.height,
      timezone: getTimezone(), language: getLanguage()
    });
  }

  send("/api/analytics/heartbeat", {
    visitorId: visitorId, sessionId: sessionId,
    path: window.location.pathname, timezone: getTimezone(), language: getLanguage()
  });
  setInterval(function() {
    send("/api/analytics/heartbeat", {
      visitorId: visitorId, sessionId: sessionId,
      path: window.location.pathname, timezone: getTimezone(), language: getLanguage()
    });
  }, 30000);

  function trackPageView() {
    send("/api/analytics/pageview", {
      sessionId: sessionId, visitorId: visitorId,
      url: window.location.href, path: window.location.pathname,
      title: document.title, referrer: document.referrer || null,
      source: sourceInfo.source, medium: sourceInfo.medium, campaign: sourceInfo.campaign,
      socialPlatform: sourceInfo.socialPlatform, socialDetail: sourceInfo.socialDetail,
      device: getDevice(), browser: getBrowser(), os: getOS(),
      screenWidth: screen.width, screenHeight: screen.height
    });
  }

  trackPageView();

  function trackEvent(type, el, extra) {
    var data = {
      sessionId: sessionId, visitorId: visitorId, eventType: type,
      url: window.location.href, path: window.location.pathname
    };
    if (el) {
      data.elementTag = el.tagName;
      data.elementText = (el.innerText || el.textContent || "").substring(0, 200);
      data.elementId = el.id || null;
      data.elementClass = el.className || null;
      data.href = el.href || el.closest("a")?.href || null;
    }
    if (extra) data.metadata = JSON.stringify(extra);
    send("/api/analytics/event", data);
  }

  document.addEventListener("click", function(e) {
    var target = e.target;
    var link = target.closest("a");
    var button = target.closest("button") || (target.tagName === "BUTTON" ? target : null);
    if (link) {
      var isExternal = link.hostname !== window.location.hostname;
      trackEvent(isExternal ? "outbound_click" : "link_click", link);
    } else if (button) {
      trackEvent("button_click", button);
    }
  }, true);

  document.addEventListener("submit", function(e) {
    var form = e.target;
    if (form.tagName === "FORM") trackEvent("form_submit", form);
  }, true);

  var pushState = history.pushState;
  history.pushState = function() {
    pushState.apply(history, arguments);
    setTimeout(function() { trackPageView(); pageStart = Date.now(); }, 100);
  };
  window.addEventListener("popstate", function() {
    setTimeout(function() { trackPageView(); pageStart = Date.now(); }, 100);
  });

  window.addEventListener("beforeunload", function() {
    var duration = Math.round((Date.now() - pageStart) / 1000);
    send("/api/analytics/duration", { sessionId: sessionId, visitorId: visitorId, path: window.location.pathname, duration: duration });
  });

  window.aips = {
    track: function(eventName, metadata) { trackEvent(eventName, null, metadata); },
    identify: function(userId) { send("/api/analytics/identify", { visitorId: visitorId, userId: userId }); }
  };
})();
