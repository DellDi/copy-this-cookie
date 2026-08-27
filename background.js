// Service Worker for Manifest V3
// This file combines the functionality from the original background scripts

// Import necessary functions from other files
// Note: In service workers, we can't use import statements directly
// We need to include the functions inline or use importScripts

// Include object-watch.js functionality
if (typeof Object.prototype.watch === "undefined") {
  Object.defineProperty(Object.prototype, "watch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: function (prop, handler) {
      var oldval = this[prop];
      var newval = oldval;
      var getter = function () {
        return newval;
      };
      var setter = function (val) {
        oldval = newval;
        newval = val;
        handler.call(this, prop, oldval, val);
      };
      if (delete this[prop]) {
        Object.defineProperty(this, prop, {
          get: getter,
          set: setter,
          enumerable: true,
          configurable: true,
        });
      }
    },
  });
}

// Include cookie_helpers.js functions
function buildUrl(domain, path, searchUrl) {
  var secure = searchUrl.indexOf("https://") === 0;
  if (domain.substr(0, 1) === ".") domain = domain.substring(1);
  return "http" + (secure ? "s" : "") + "://" + domain + path;
}

function deleteCookie(url, name, store, callback) {
  chrome.cookies.remove(
    {
      url: url,
      name: name,
      storeId: store,
    },
    function (details) {
      if (typeof callback === "undefined") return;
      if (
        details === "null" ||
        details === undefined ||
        details === "undefined"
      ) {
        callback(false);
      } else {
        callback(true);
      }
    }
  );
}

function cookieForCreationFromFullCookie(fullCookie) {
  var newCookie = {};
  newCookie.url =
    "http" +
    (fullCookie.secure ? "s" : "") +
    "://" +
    fullCookie.domain +
    fullCookie.path;
  newCookie.name = fullCookie.name;
  newCookie.value = fullCookie.value;
  if (!fullCookie.hostOnly) newCookie.domain = fullCookie.domain;
  newCookie.path = fullCookie.path;
  newCookie.secure = fullCookie.secure;
  newCookie.httpOnly = fullCookie.httpOnly;
  if (!fullCookie.session) newCookie.expirationDate = fullCookie.expirationDate;
  newCookie.storeId = fullCookie.storeId;
  return newCookie;
}

function compareCookies(b, a) {
  try {
    if (b.name !== a.name) return false;
    if (b.value !== a.value) return false;
    if (b.path !== a.path) return false;
    if (b.secure !== a.secure) return false;
    if (b.httpOnly !== a.httpOnly) return false;

    var aHostOnly = !!(a.hostOnly || a.domain === undefined);
    var bHostOnly = !!(b.hostOnly || b.domain === undefined);
    if (aHostOnly !== bHostOnly) return false;
    if (!aHostOnly && b.domain !== a.domain) return false;

    var aSession = !!(a.session || a.expirationDate === undefined);
    var bSession = !!(b.session || b.expirationDate === undefined);
    if (aSession !== bSession) return false;
    if (aSession === false && b.expirationDate !== a.expirationDate)
      return false;
  } catch (e) {
    console.error(e.message);
    return false;
  }
  return true;
}

// Include utils.js functions
function _getMessage(string, args) {
  return chrome.i18n.getMessage("editThis_" + string, args);
}

function filterMatchesCookie(rule, name, domain, value) {
  var ruleDomainReg = new RegExp(rule.domain);
  var ruleNameReg = new RegExp(rule.name);
  var ruleValueReg = new RegExp(rule.value);
  if (rule.domain !== undefined && domain.match(ruleDomainReg) === null) {
    return false;
  }
  if (rule.name !== undefined && name.match(ruleNameReg) === null) {
    return false;
  }
  if (rule.value !== undefined && value.match(ruleValueReg) === null) {
    return false;
  }
  return true;
}

function isChristmasPeriod() {
  var nowDate = new Date();
  var isMidDecember = nowDate.getMonth() === 11 && nowDate.getDate() > 5;
  var isStartJanuary = nowDate.getMonth() === 0 && nowDate.getDate() <= 6;
  return isMidDecember || isStartJanuary;
}

// Include data.js functionality
var preferences_template = {
  showAlerts: { default_value: false },
  showCommandsLabels: { default_value: false },
  showDomain: { default_value: true },
  showDomainBeforeName: { default_value: true },
  showFlagAndDeleteAll: { default_value: false },
  showContextMenu: { default_value: true },
  refreshAfterSubmit: { default_value: false },
  skipCacheRefresh: { default_value: true },
  useMaxCookieAge: { default_value: false },
  maxCookieAgeType: { default_value: -1 },
  maxCookieAge: { default_value: 1 },
  useCustomLocale: { default_value: false },
  customLocale: { default_value: "en" },
  copyCookiesType: { default_value: "json" },
  showChristmasIcon: { default_value: true },
  sortCookiesType: { default_value: "domain_alpha" },
  showDevToolsPanel: { default_value: true },
};

var data_template = {
  filters: { default_value: [] },
  readOnly: { default_value: [] },
  nCookiesCreated: { default_value: 0 },
  nCookiesChanged: { default_value: 0 },
  nCookiesDeleted: { default_value: 0 },
  nCookiesProtected: { default_value: 0 },
  nCookiesFlagged: { default_value: 0 },
  nCookiesShortened: { default_value: 0 },
  nPopupClicked: { default_value: 0 },
  nPanelClicked: { default_value: 0 },
  nCookiesImported: { default_value: 0 },
  nCookiesExported: { default_value: 0 },
  lastVersionRun: { default_value: undefined },
};

var preferences = {};
var data = {};

// Initialize data from storage
async function initializeData() {
  try {
    // Load preferences
    for (var key in preferences_template) {
      var result = await chrome.storage.local.get(["options_" + key]);
      preferences[key] =
        result["options_" + key] || preferences_template[key].default_value;
    }

    // Load data
    for (var key in data_template) {
      var result = await chrome.storage.local.get(["data_" + key]);
      data[key] = result["data_" + key] || data_template[key].default_value;
    }
  } catch (error) {
    console.error("Error initializing data:", error);
  }
}

// Save data to storage
async function saveData(key, value, prefix) {
  try {
    await chrome.storage.local.set({ [prefix + key]: value });
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// Main service worker code
var showContextMenu = undefined;

updateCallback = function () {
  if (showContextMenu !== preferences.showContextMenu) {
    showContextMenu = preferences.showContextMenu;
    setContextMenu(showContextMenu);
  }
  setChristmasIcon();
};

function setChristmasIcon() {
  if (isChristmasPeriod() && preferences.showChristmasIcon) {
    chrome.action.setIcon({ path: "/img/cookie_xmas_19x19.png" });
  } else {
    chrome.action.setIcon({ path: "/img/icon_19x19.png" });
  }
}

function setContextMenu(show) {
  chrome.contextMenus.removeAll();
  if (show) {
    chrome.contextMenus.create({
      id: "editThisCookie",
      title: "EditThisCookie",
      contexts: ["page"],
    });
  }
}

function showPopup(info, tab) {
  var tabUrl = encodeURI(tab.url);
  var tabID = encodeURI(tab.id);
  var tabIncognito = encodeURI(tab.incognito);

  var urlToOpen =
    chrome.runtime.getURL("popup.html") +
    "?url=" +
    tabUrl +
    "&id=" +
    tabID +
    "&incognito=" +
    tabIncognito;

  chrome.tabs.query(
    { windowId: chrome.windows.WINDOW_ID_CURRENT },
    function (tabList) {
      for (var x = 0; x < tabList.length; x++) {
        var cTab = tabList[x];
        if (cTab.url.indexOf(urlToOpen) === 0) {
          chrome.tabs.update(cTab.id, {
            selected: true,
          });
          return;
        }
      }
      chrome.tabs.create({
        url: urlToOpen,
      });
    }
  );
}

// Service worker event listeners
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "editThisCookie") {
    showPopup(info, tab);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await initializeData();
  setChristmasIcon();
  setInterval(setChristmasIcon, 60 * 60 * 1000); // Every hour

  var currentVersion = chrome.runtime.getManifest().version;
  var oldVersion = data.lastVersionRun;

  data.lastVersionRun = currentVersion;
  await saveData("lastVersionRun", currentVersion, "data_");

  if (oldVersion !== currentVersion) {
    if (oldVersion === undefined) {
      // Is first run
      chrome.tabs.create({ url: "http://www.editthiscookie.com/start/" });
    } else {
      chrome.notifications.onClicked.addListener(function (notificationId) {
        chrome.tabs.create({
          url: "http://www.editthiscookie.com/changelog/",
        });
        chrome.notifications.clear(notificationId, function (wasCleared) {});
      });
      var opt = {
        type: "basic",
        title: "EditThisCookie",
        message: _getMessage("updated"),
        iconUrl: "/img/icon_128x128.png",
        isClickable: true,
      };
      chrome.notifications.create("", opt, function (notificationId) {});
    }
  }

  setContextMenu(preferences.showContextMenu);
});

chrome.cookies.onChanged.addListener(function (changeInfo) {
  var removed = changeInfo.removed;
  var cookie = changeInfo.cookie;
  var cause = changeInfo.cause;

  var name = cookie.name;
  var domain = cookie.domain;
  var value = cookie.value;

  if (cause === "expired" || cause === "evicted") return;

  for (var i = 0; i < data.readOnly.length; i++) {
    var currentRORule = data.readOnly[i];
    if (compareCookies(cookie, currentRORule)) {
      if (removed) {
        chrome.cookies.get(
          {
            url:
              "http" +
              (currentRORule.secure ? "s" : "") +
              "://" +
              currentRORule.domain +
              currentRORule.path,
            name: currentRORule.name,
            storeId: currentRORule.storeId,
          },
          function (currentCookie) {
            if (compareCookies(currentCookie, currentRORule)) return;
            var newCookie = cookieForCreationFromFullCookie(currentRORule);
            chrome.cookies.set(newCookie);
            ++data.nCookiesProtected;
            saveData("nCookiesProtected", data.nCookiesProtected, "data_");
          }
        );
      }
      return;
    }
  }

  // Check if a blocked cookie was added
  if (!removed) {
    for (var i = 0; i < data.filters.length; i++) {
      var currentFilter = data.filters[i];
      if (filterMatchesCookie(currentFilter, name, domain, value)) {
        chrome.tabs.query({ active: true }, function (tabs) {
          var url = tabs[0].url;
          var toRemove = {};
          toRemove.url = url;
          toRemove.url =
            "http" +
            (cookie.secure ? "s" : "") +
            "://" +
            cookie.domain +
            cookie.path;
          toRemove.name = name;
          chrome.cookies.remove(toRemove);
          ++data.nCookiesFlagged;
          saveData("nCookiesFlagged", data.nCookiesFlagged, "data_");
        });
      }
    }
  }

  if (
    !removed &&
    preferences.useMaxCookieAge &&
    preferences.maxCookieAgeType > 0
  ) {
    var maxAllowedExpiration =
      Math.round(new Date().getTime() / 1000) +
      preferences.maxCookieAge * preferences.maxCookieAgeType;
    if (
      cookie.expirationDate !== undefined &&
      cookie.expirationDate > maxAllowedExpiration + 60
    ) {
      var newCookie = cookieForCreationFromFullCookie(cookie);
      if (!cookie.session) newCookie.expirationDate = maxAllowedExpiration;
      chrome.cookies.set(newCookie);
      ++data.nCookiesShortened;
      saveData("nCookiesShortened", data.nCookiesShortened, "data_");
    }
  }
});

// DevTools connection handling
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name != "devtools-page") {
    return;
  }

  var devToolsListener = function (message, sender, sendResponse) {
    var action = message.action;
    if (action === "getall") {
      getAll(port, message);
    } else if (action === "submitCookie") {
      var cookie = message.cookie;
      var origName = message.origName;
      deleteCookie(cookie.url, origName, cookie.storeId);
      chrome.cookies.set(cookie);
      issueRefresh(port);
    }
  };

  port.onMessage.addListener(devToolsListener);

  port.onDisconnect.addListener(function () {
    port.onMessage.removeListener(devToolsListener);
  });
});

function issueRefresh(port) {
  port.postMessage({
    action: "refresh",
  });
}

function getAll(port, message) {
  chrome.tabs.get(message.tabId, function (tab) {
    var url = tab.url;
    console.log("Looking for cookies on: " + url);
    chrome.cookies.getAll(
      {
        url: url,
      },
      function (cks) {
        console.log("I have " + cks.length + " cookies");
        port.postMessage({
          action: "getall",
          url: url,
          cks: cks,
        });
      }
    );
  });
}
