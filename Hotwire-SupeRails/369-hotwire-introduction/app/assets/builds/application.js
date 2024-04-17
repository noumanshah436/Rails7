(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn2, res) => function __init() {
    return fn2 && (res = (0, fn2[__getOwnPropNames(fn2)[0]])(fn2 = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@rails/actioncable/src/adapters.js
  var adapters_default;
  var init_adapters = __esm({
    "node_modules/@rails/actioncable/src/adapters.js"() {
      adapters_default = {
        logger: self.console,
        WebSocket: self.WebSocket
      };
    }
  });

  // node_modules/@rails/actioncable/src/logger.js
  var logger_default;
  var init_logger = __esm({
    "node_modules/@rails/actioncable/src/logger.js"() {
      init_adapters();
      logger_default = {
        log(...messages) {
          if (this.enabled) {
            messages.push(Date.now());
            adapters_default.logger.log("[ActionCable]", ...messages);
          }
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/connection_monitor.js
  var now, secondsSince, ConnectionMonitor, connection_monitor_default;
  var init_connection_monitor = __esm({
    "node_modules/@rails/actioncable/src/connection_monitor.js"() {
      init_logger();
      now = () => new Date().getTime();
      secondsSince = (time) => (now() - time) / 1e3;
      ConnectionMonitor = class {
        constructor(connection) {
          this.visibilityDidChange = this.visibilityDidChange.bind(this);
          this.connection = connection;
          this.reconnectAttempts = 0;
        }
        start() {
          if (!this.isRunning()) {
            this.startedAt = now();
            delete this.stoppedAt;
            this.startPolling();
            addEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
          }
        }
        stop() {
          if (this.isRunning()) {
            this.stoppedAt = now();
            this.stopPolling();
            removeEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log("ConnectionMonitor stopped");
          }
        }
        isRunning() {
          return this.startedAt && !this.stoppedAt;
        }
        recordPing() {
          this.pingedAt = now();
        }
        recordConnect() {
          this.reconnectAttempts = 0;
          this.recordPing();
          delete this.disconnectedAt;
          logger_default.log("ConnectionMonitor recorded connect");
        }
        recordDisconnect() {
          this.disconnectedAt = now();
          logger_default.log("ConnectionMonitor recorded disconnect");
        }
        startPolling() {
          this.stopPolling();
          this.poll();
        }
        stopPolling() {
          clearTimeout(this.pollTimeout);
        }
        poll() {
          this.pollTimeout = setTimeout(
            () => {
              this.reconnectIfStale();
              this.poll();
            },
            this.getPollInterval()
          );
        }
        getPollInterval() {
          const { staleThreshold, reconnectionBackoffRate } = this.constructor;
          const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
          const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
          const jitter = jitterMax * Math.random();
          return staleThreshold * 1e3 * backoff * (1 + jitter);
        }
        reconnectIfStale() {
          if (this.connectionIsStale()) {
            logger_default.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
            this.reconnectAttempts++;
            if (this.disconnectedRecently()) {
              logger_default.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`);
            } else {
              logger_default.log("ConnectionMonitor reopening");
              this.connection.reopen();
            }
          }
        }
        get refreshedAt() {
          return this.pingedAt ? this.pingedAt : this.startedAt;
        }
        connectionIsStale() {
          return secondsSince(this.refreshedAt) > this.constructor.staleThreshold;
        }
        disconnectedRecently() {
          return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
        }
        visibilityDidChange() {
          if (document.visibilityState === "visible") {
            setTimeout(
              () => {
                if (this.connectionIsStale() || !this.connection.isOpen()) {
                  logger_default.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
                  this.connection.reopen();
                }
              },
              200
            );
          }
        }
      };
      ConnectionMonitor.staleThreshold = 6;
      ConnectionMonitor.reconnectionBackoffRate = 0.15;
      connection_monitor_default = ConnectionMonitor;
    }
  });

  // node_modules/@rails/actioncable/src/internal.js
  var internal_default;
  var init_internal = __esm({
    "node_modules/@rails/actioncable/src/internal.js"() {
      internal_default = {
        "message_types": {
          "welcome": "welcome",
          "disconnect": "disconnect",
          "ping": "ping",
          "confirmation": "confirm_subscription",
          "rejection": "reject_subscription"
        },
        "disconnect_reasons": {
          "unauthorized": "unauthorized",
          "invalid_request": "invalid_request",
          "server_restart": "server_restart"
        },
        "default_mount_path": "/cable",
        "protocols": [
          "actioncable-v1-json",
          "actioncable-unsupported"
        ]
      };
    }
  });

  // node_modules/@rails/actioncable/src/connection.js
  var message_types, protocols, supportedProtocols, indexOf, Connection, connection_default;
  var init_connection = __esm({
    "node_modules/@rails/actioncable/src/connection.js"() {
      init_adapters();
      init_connection_monitor();
      init_internal();
      init_logger();
      ({ message_types, protocols } = internal_default);
      supportedProtocols = protocols.slice(0, protocols.length - 1);
      indexOf = [].indexOf;
      Connection = class {
        constructor(consumer2) {
          this.open = this.open.bind(this);
          this.consumer = consumer2;
          this.subscriptions = this.consumer.subscriptions;
          this.monitor = new connection_monitor_default(this);
          this.disconnected = true;
        }
        send(data) {
          if (this.isOpen()) {
            this.webSocket.send(JSON.stringify(data));
            return true;
          } else {
            return false;
          }
        }
        open() {
          if (this.isActive()) {
            logger_default.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
            return false;
          } else {
            logger_default.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`);
            if (this.webSocket) {
              this.uninstallEventHandlers();
            }
            this.webSocket = new adapters_default.WebSocket(this.consumer.url, protocols);
            this.installEventHandlers();
            this.monitor.start();
            return true;
          }
        }
        close({ allowReconnect } = { allowReconnect: true }) {
          if (!allowReconnect) {
            this.monitor.stop();
          }
          if (this.isOpen()) {
            return this.webSocket.close();
          }
        }
        reopen() {
          logger_default.log(`Reopening WebSocket, current state is ${this.getState()}`);
          if (this.isActive()) {
            try {
              return this.close();
            } catch (error2) {
              logger_default.log("Failed to reopen WebSocket", error2);
            } finally {
              logger_default.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
              setTimeout(this.open, this.constructor.reopenDelay);
            }
          } else {
            return this.open();
          }
        }
        getProtocol() {
          if (this.webSocket) {
            return this.webSocket.protocol;
          }
        }
        isOpen() {
          return this.isState("open");
        }
        isActive() {
          return this.isState("open", "connecting");
        }
        isProtocolSupported() {
          return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
        }
        isState(...states) {
          return indexOf.call(states, this.getState()) >= 0;
        }
        getState() {
          if (this.webSocket) {
            for (let state in adapters_default.WebSocket) {
              if (adapters_default.WebSocket[state] === this.webSocket.readyState) {
                return state.toLowerCase();
              }
            }
          }
          return null;
        }
        installEventHandlers() {
          for (let eventName in this.events) {
            const handler = this.events[eventName].bind(this);
            this.webSocket[`on${eventName}`] = handler;
          }
        }
        uninstallEventHandlers() {
          for (let eventName in this.events) {
            this.webSocket[`on${eventName}`] = function() {
            };
          }
        }
      };
      Connection.reopenDelay = 500;
      Connection.prototype.events = {
        message(event) {
          if (!this.isProtocolSupported()) {
            return;
          }
          const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
          switch (type) {
            case message_types.welcome:
              this.monitor.recordConnect();
              return this.subscriptions.reload();
            case message_types.disconnect:
              logger_default.log(`Disconnecting. Reason: ${reason}`);
              return this.close({ allowReconnect: reconnect });
            case message_types.ping:
              return this.monitor.recordPing();
            case message_types.confirmation:
              this.subscriptions.confirmSubscription(identifier);
              return this.subscriptions.notify(identifier, "connected");
            case message_types.rejection:
              return this.subscriptions.reject(identifier);
            default:
              return this.subscriptions.notify(identifier, "received", message);
          }
        },
        open() {
          logger_default.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
          this.disconnected = false;
          if (!this.isProtocolSupported()) {
            logger_default.log("Protocol is unsupported. Stopping monitor and disconnecting.");
            return this.close({ allowReconnect: false });
          }
        },
        close(event) {
          logger_default.log("WebSocket onclose event");
          if (this.disconnected) {
            return;
          }
          this.disconnected = true;
          this.monitor.recordDisconnect();
          return this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
        },
        error() {
          logger_default.log("WebSocket onerror event");
        }
      };
      connection_default = Connection;
    }
  });

  // node_modules/@rails/actioncable/src/subscription.js
  var extend, Subscription;
  var init_subscription = __esm({
    "node_modules/@rails/actioncable/src/subscription.js"() {
      extend = function(object2, properties) {
        if (properties != null) {
          for (let key in properties) {
            const value = properties[key];
            object2[key] = value;
          }
        }
        return object2;
      };
      Subscription = class {
        constructor(consumer2, params = {}, mixin) {
          this.consumer = consumer2;
          this.identifier = JSON.stringify(params);
          extend(this, mixin);
        }
        perform(action, data = {}) {
          data.action = action;
          return this.send(data);
        }
        send(data) {
          return this.consumer.send({ command: "message", identifier: this.identifier, data: JSON.stringify(data) });
        }
        unsubscribe() {
          return this.consumer.subscriptions.remove(this);
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/subscription_guarantor.js
  var SubscriptionGuarantor, subscription_guarantor_default;
  var init_subscription_guarantor = __esm({
    "node_modules/@rails/actioncable/src/subscription_guarantor.js"() {
      init_logger();
      SubscriptionGuarantor = class {
        constructor(subscriptions) {
          this.subscriptions = subscriptions;
          this.pendingSubscriptions = [];
        }
        guarantee(subscription) {
          if (this.pendingSubscriptions.indexOf(subscription) == -1) {
            logger_default.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
            this.pendingSubscriptions.push(subscription);
          } else {
            logger_default.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
          }
          this.startGuaranteeing();
        }
        forget(subscription) {
          logger_default.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
          this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
        }
        startGuaranteeing() {
          this.stopGuaranteeing();
          this.retrySubscribing();
        }
        stopGuaranteeing() {
          clearTimeout(this.retryTimeout);
        }
        retrySubscribing() {
          this.retryTimeout = setTimeout(
            () => {
              if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
                this.pendingSubscriptions.map((subscription) => {
                  logger_default.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
                  this.subscriptions.subscribe(subscription);
                });
              }
            },
            500
          );
        }
      };
      subscription_guarantor_default = SubscriptionGuarantor;
    }
  });

  // node_modules/@rails/actioncable/src/subscriptions.js
  var Subscriptions;
  var init_subscriptions = __esm({
    "node_modules/@rails/actioncable/src/subscriptions.js"() {
      init_subscription();
      init_subscription_guarantor();
      init_logger();
      Subscriptions = class {
        constructor(consumer2) {
          this.consumer = consumer2;
          this.guarantor = new subscription_guarantor_default(this);
          this.subscriptions = [];
        }
        create(channelName, mixin) {
          const channel = channelName;
          const params = typeof channel === "object" ? channel : { channel };
          const subscription = new Subscription(this.consumer, params, mixin);
          return this.add(subscription);
        }
        add(subscription) {
          this.subscriptions.push(subscription);
          this.consumer.ensureActiveConnection();
          this.notify(subscription, "initialized");
          this.subscribe(subscription);
          return subscription;
        }
        remove(subscription) {
          this.forget(subscription);
          if (!this.findAll(subscription.identifier).length) {
            this.sendCommand(subscription, "unsubscribe");
          }
          return subscription;
        }
        reject(identifier) {
          return this.findAll(identifier).map((subscription) => {
            this.forget(subscription);
            this.notify(subscription, "rejected");
            return subscription;
          });
        }
        forget(subscription) {
          this.guarantor.forget(subscription);
          this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
          return subscription;
        }
        findAll(identifier) {
          return this.subscriptions.filter((s) => s.identifier === identifier);
        }
        reload() {
          return this.subscriptions.map((subscription) => this.subscribe(subscription));
        }
        notifyAll(callbackName, ...args) {
          return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
        }
        notify(subscription, callbackName, ...args) {
          let subscriptions;
          if (typeof subscription === "string") {
            subscriptions = this.findAll(subscription);
          } else {
            subscriptions = [subscription];
          }
          return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
        }
        subscribe(subscription) {
          if (this.sendCommand(subscription, "subscribe")) {
            this.guarantor.guarantee(subscription);
          }
        }
        confirmSubscription(identifier) {
          logger_default.log(`Subscription confirmed ${identifier}`);
          this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
        }
        sendCommand(subscription, command) {
          const { identifier } = subscription;
          return this.consumer.send({ command, identifier });
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/consumer.js
  function createWebSocketURL(url) {
    if (typeof url === "function") {
      url = url();
    }
    if (url && !/^wss?:/i.test(url)) {
      const a = document.createElement("a");
      a.href = url;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url;
    }
  }
  var Consumer;
  var init_consumer = __esm({
    "node_modules/@rails/actioncable/src/consumer.js"() {
      init_connection();
      init_subscriptions();
      Consumer = class {
        constructor(url) {
          this._url = url;
          this.subscriptions = new Subscriptions(this);
          this.connection = new connection_default(this);
        }
        get url() {
          return createWebSocketURL(this._url);
        }
        send(data) {
          return this.connection.send(data);
        }
        connect() {
          return this.connection.open();
        }
        disconnect() {
          return this.connection.close({ allowReconnect: false });
        }
        ensureActiveConnection() {
          if (!this.connection.isActive()) {
            return this.connection.open();
          }
        }
      };
    }
  });

  // node_modules/@rails/actioncable/src/index.js
  var src_exports = {};
  __export(src_exports, {
    Connection: () => connection_default,
    ConnectionMonitor: () => connection_monitor_default,
    Consumer: () => Consumer,
    INTERNAL: () => internal_default,
    Subscription: () => Subscription,
    SubscriptionGuarantor: () => subscription_guarantor_default,
    Subscriptions: () => Subscriptions,
    adapters: () => adapters_default,
    createConsumer: () => createConsumer,
    createWebSocketURL: () => createWebSocketURL,
    getConfig: () => getConfig,
    logger: () => logger_default
  });
  function createConsumer(url = getConfig("url") || internal_default.default_mount_path) {
    return new Consumer(url);
  }
  function getConfig(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }
  var init_src = __esm({
    "node_modules/@rails/actioncable/src/index.js"() {
      init_connection();
      init_connection_monitor();
      init_consumer();
      init_internal();
      init_subscription();
      init_subscriptions();
      init_subscription_guarantor();
      init_adapters();
      init_logger();
    }
  });

  // node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js
  (function() {
    if (window.Reflect === void 0 || window.customElements === void 0 || window.customElements.polyfillWrapFlushCallback) {
      return;
    }
    const BuiltInHTMLElement = HTMLElement;
    const wrapperForTheName = {
      HTMLElement: function HTMLElement2() {
        return Reflect.construct(BuiltInHTMLElement, [], this.constructor);
      }
    };
    window.HTMLElement = wrapperForTheName["HTMLElement"];
    HTMLElement.prototype = BuiltInHTMLElement.prototype;
    HTMLElement.prototype.constructor = HTMLElement;
    Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement);
  })();
  (function(prototype) {
    if (typeof prototype.requestSubmit == "function")
      return;
    prototype.requestSubmit = function(submitter) {
      if (submitter) {
        validateSubmitter(submitter, this);
        submitter.click();
      } else {
        submitter = document.createElement("input");
        submitter.type = "submit";
        submitter.hidden = true;
        this.appendChild(submitter);
        submitter.click();
        this.removeChild(submitter);
      }
    };
    function validateSubmitter(submitter, form) {
      submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'");
      submitter.type == "submit" || raise(TypeError, "The specified element is not a submit button");
      submitter.form == form || raise(DOMException, "The specified element is not owned by this form element", "NotFoundError");
    }
    function raise(errorConstructor, message, name) {
      throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + ".", name);
    }
  })(HTMLFormElement.prototype);
  var submittersByForm = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element ? element.closest("input, button") : null;
    return (candidate === null || candidate === void 0 ? void 0 : candidate.type) == "submit" ? candidate : null;
  }
  function clickCaptured(event) {
    const submitter = findSubmitterFromClickTarget(event.target);
    if (submitter && submitter.form) {
      submittersByForm.set(submitter.form, submitter);
    }
  }
  (function() {
    if ("submitter" in Event.prototype)
      return;
    let prototype;
    if ("SubmitEvent" in window && /Apple Computer/.test(navigator.vendor)) {
      prototype = window.SubmitEvent.prototype;
    } else if ("SubmitEvent" in window) {
      return;
    } else {
      prototype = window.Event.prototype;
    }
    addEventListener("click", clickCaptured, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type == "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm.get(this.target);
        }
      }
    });
  })();
  var FrameLoadingStyle;
  (function(FrameLoadingStyle2) {
    FrameLoadingStyle2["eager"] = "eager";
    FrameLoadingStyle2["lazy"] = "lazy";
  })(FrameLoadingStyle || (FrameLoadingStyle = {}));
  var FrameElement = class extends HTMLElement {
    constructor() {
      super();
      this.loaded = Promise.resolve();
      this.delegate = new FrameElement.delegateConstructor(this);
    }
    static get observedAttributes() {
      return ["disabled", "complete", "loading", "src"];
    }
    connectedCallback() {
      this.delegate.connect();
    }
    disconnectedCallback() {
      this.delegate.disconnect();
    }
    reload() {
      const { src } = this;
      this.removeAttribute("complete");
      this.src = null;
      this.src = src;
      return this.loaded;
    }
    attributeChangedCallback(name) {
      if (name == "loading") {
        this.delegate.loadingStyleChanged();
      } else if (name == "complete") {
        this.delegate.completeChanged();
      } else if (name == "src") {
        this.delegate.sourceURLChanged();
      } else {
        this.delegate.disabledChanged();
      }
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
      } else {
        this.removeAttribute("src");
      }
    }
    get loading() {
      return frameLoadingStyleFromString(this.getAttribute("loading") || "");
    }
    set loading(value) {
      if (value) {
        this.setAttribute("loading", value);
      } else {
        this.removeAttribute("loading");
      }
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(value) {
      if (value) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
    }
    get autoscroll() {
      return this.hasAttribute("autoscroll");
    }
    set autoscroll(value) {
      if (value) {
        this.setAttribute("autoscroll", "");
      } else {
        this.removeAttribute("autoscroll");
      }
    }
    get complete() {
      return !this.delegate.isLoading;
    }
    get isActive() {
      return this.ownerDocument === document && !this.isPreview;
    }
    get isPreview() {
      var _a, _b;
      return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
    }
  };
  function frameLoadingStyleFromString(style) {
    switch (style.toLowerCase()) {
      case "lazy":
        return FrameLoadingStyle.lazy;
      default:
        return FrameLoadingStyle.eager;
    }
  }
  function expandURL(locatable) {
    return new URL(locatable.toString(), document.baseURI);
  }
  function getAnchor(url) {
    let anchorMatch;
    if (url.hash) {
      return url.hash.slice(1);
    } else if (anchorMatch = url.href.match(/#(.*)$/)) {
      return anchorMatch[1];
    }
  }
  function getAction(form, submitter) {
    const action = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) || form.getAttribute("action") || form.action;
    return expandURL(action);
  }
  function getExtension(url) {
    return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || "";
  }
  function isHTML(url) {
    return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/);
  }
  function isPrefixedBy(baseURL, url) {
    const prefix = getPrefix(url);
    return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix);
  }
  function locationIsVisitable(location2, rootLocation) {
    return isPrefixedBy(location2, rootLocation) && isHTML(location2);
  }
  function getRequestURL(url) {
    const anchor = getAnchor(url);
    return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href;
  }
  function toCacheKey(url) {
    return getRequestURL(url);
  }
  function urlsAreEqual(left2, right2) {
    return expandURL(left2).href == expandURL(right2).href;
  }
  function getPathComponents(url) {
    return url.pathname.split("/").slice(1);
  }
  function getLastPathComponent(url) {
    return getPathComponents(url).slice(-1)[0];
  }
  function getPrefix(url) {
    return addTrailingSlash(url.origin + url.pathname);
  }
  function addTrailingSlash(value) {
    return value.endsWith("/") ? value : value + "/";
  }
  var FetchResponse = class {
    constructor(response) {
      this.response = response;
    }
    get succeeded() {
      return this.response.ok;
    }
    get failed() {
      return !this.succeeded;
    }
    get clientError() {
      return this.statusCode >= 400 && this.statusCode <= 499;
    }
    get serverError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
    get redirected() {
      return this.response.redirected;
    }
    get location() {
      return expandURL(this.response.url);
    }
    get isHTML() {
      return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
    }
    get statusCode() {
      return this.response.status;
    }
    get contentType() {
      return this.header("Content-Type");
    }
    get responseText() {
      return this.response.clone().text();
    }
    get responseHTML() {
      if (this.isHTML) {
        return this.response.clone().text();
      } else {
        return Promise.resolve(void 0);
      }
    }
    header(name) {
      return this.response.headers.get(name);
    }
  };
  function isAction(action) {
    return action == "advance" || action == "replace" || action == "restore";
  }
  function activateScriptElement(element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element;
    } else {
      const createdScriptElement = document.createElement("script");
      const cspNonce = getMetaContent("csp-nonce");
      if (cspNonce) {
        createdScriptElement.nonce = cspNonce;
      }
      createdScriptElement.textContent = element.textContent;
      createdScriptElement.async = false;
      copyElementAttributes(createdScriptElement, element);
      return createdScriptElement;
    }
  }
  function copyElementAttributes(destinationElement, sourceElement) {
    for (const { name, value } of sourceElement.attributes) {
      destinationElement.setAttribute(name, value);
    }
  }
  function createDocumentFragment(html2) {
    const template = document.createElement("template");
    template.innerHTML = html2;
    return template.content;
  }
  function dispatch(eventName, { target, cancelable, detail } = {}) {
    const event = new CustomEvent(eventName, {
      cancelable,
      bubbles: true,
      detail
    });
    if (target && target.isConnected) {
      target.dispatchEvent(event);
    } else {
      document.documentElement.dispatchEvent(event);
    }
    return event;
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  function nextEventLoopTick() {
    return new Promise((resolve) => setTimeout(() => resolve(), 0));
  }
  function nextMicrotask() {
    return Promise.resolve();
  }
  function parseHTMLDocument(html2 = "") {
    return new DOMParser().parseFromString(html2, "text/html");
  }
  function unindent(strings, ...values) {
    const lines = interpolate(strings, values).replace(/^\n/, "").split("\n");
    const match2 = lines[0].match(/^\s+/);
    const indent = match2 ? match2[0].length : 0;
    return lines.map((line) => line.slice(indent)).join("\n");
  }
  function interpolate(strings, values) {
    return strings.reduce((result, string, i) => {
      const value = values[i] == void 0 ? "" : values[i];
      return result + string + value;
    }, "");
  }
  function uuid() {
    return Array.from({ length: 36 }).map((_2, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-";
      } else if (i == 14) {
        return "4";
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16);
      } else {
        return Math.floor(Math.random() * 15).toString(16);
      }
    }).join("");
  }
  function getAttribute(attributeName, ...elements) {
    for (const value of elements.map((element) => element === null || element === void 0 ? void 0 : element.getAttribute(attributeName))) {
      if (typeof value == "string")
        return value;
    }
    return null;
  }
  function hasAttribute(attributeName, ...elements) {
    return elements.some((element) => element && element.hasAttribute(attributeName));
  }
  function markAsBusy(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.setAttribute("busy", "");
      }
      element.setAttribute("aria-busy", "true");
    }
  }
  function clearBusyState(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.removeAttribute("busy");
      }
      element.removeAttribute("aria-busy");
    }
  }
  function waitForLoad(element, timeoutInMilliseconds = 2e3) {
    return new Promise((resolve) => {
      const onComplete = () => {
        element.removeEventListener("error", onComplete);
        element.removeEventListener("load", onComplete);
        resolve();
      };
      element.addEventListener("load", onComplete, { once: true });
      element.addEventListener("error", onComplete, { once: true });
      setTimeout(resolve, timeoutInMilliseconds);
    });
  }
  function getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState;
      case "advance":
      case "restore":
        return history.pushState;
    }
  }
  function getVisitAction(...elements) {
    const action = getAttribute("data-turbo-action", ...elements);
    return isAction(action) ? action : null;
  }
  function getMetaElement(name) {
    return document.querySelector(`meta[name="${name}"]`);
  }
  function getMetaContent(name) {
    const element = getMetaElement(name);
    return element && element.content;
  }
  function setMetaContent(name, content) {
    let element = getMetaElement(name);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("name", name);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
    return element;
  }
  var FetchMethod;
  (function(FetchMethod2) {
    FetchMethod2[FetchMethod2["get"] = 0] = "get";
    FetchMethod2[FetchMethod2["post"] = 1] = "post";
    FetchMethod2[FetchMethod2["put"] = 2] = "put";
    FetchMethod2[FetchMethod2["patch"] = 3] = "patch";
    FetchMethod2[FetchMethod2["delete"] = 4] = "delete";
  })(FetchMethod || (FetchMethod = {}));
  function fetchMethodFromString(method) {
    switch (method.toLowerCase()) {
      case "get":
        return FetchMethod.get;
      case "post":
        return FetchMethod.post;
      case "put":
        return FetchMethod.put;
      case "patch":
        return FetchMethod.patch;
      case "delete":
        return FetchMethod.delete;
    }
  }
  var FetchRequest = class {
    constructor(delegate, method, location2, body = new URLSearchParams(), target = null) {
      this.abortController = new AbortController();
      this.resolveRequestPromise = (_value) => {
      };
      this.delegate = delegate;
      this.method = method;
      this.headers = this.defaultHeaders;
      this.body = body;
      this.url = location2;
      this.target = target;
    }
    get location() {
      return this.url;
    }
    get params() {
      return this.url.searchParams;
    }
    get entries() {
      return this.body ? Array.from(this.body.entries()) : [];
    }
    cancel() {
      this.abortController.abort();
    }
    async perform() {
      var _a, _b;
      const { fetchOptions } = this;
      (_b = (_a = this.delegate).prepareHeadersForRequest) === null || _b === void 0 ? void 0 : _b.call(_a, this.headers, this);
      await this.allowRequestToBeIntercepted(fetchOptions);
      try {
        this.delegate.requestStarted(this);
        const response = await fetch(this.url.href, fetchOptions);
        return await this.receive(response);
      } catch (error2) {
        if (error2.name !== "AbortError") {
          if (this.willDelegateErrorHandling(error2)) {
            this.delegate.requestErrored(this, error2);
          }
          throw error2;
        }
      } finally {
        this.delegate.requestFinished(this);
      }
    }
    async receive(response) {
      const fetchResponse = new FetchResponse(response);
      const event = dispatch("turbo:before-fetch-response", {
        cancelable: true,
        detail: { fetchResponse },
        target: this.target
      });
      if (event.defaultPrevented) {
        this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
      } else if (fetchResponse.succeeded) {
        this.delegate.requestSucceededWithResponse(this, fetchResponse);
      } else {
        this.delegate.requestFailedWithResponse(this, fetchResponse);
      }
      return fetchResponse;
    }
    get fetchOptions() {
      var _a;
      return {
        method: FetchMethod[this.method].toUpperCase(),
        credentials: "same-origin",
        headers: this.headers,
        redirect: "follow",
        body: this.isIdempotent ? null : this.body,
        signal: this.abortSignal,
        referrer: (_a = this.delegate.referrer) === null || _a === void 0 ? void 0 : _a.href
      };
    }
    get defaultHeaders() {
      return {
        Accept: "text/html, application/xhtml+xml"
      };
    }
    get isIdempotent() {
      return this.method == FetchMethod.get;
    }
    get abortSignal() {
      return this.abortController.signal;
    }
    acceptResponseType(mimeType) {
      this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ");
    }
    async allowRequestToBeIntercepted(fetchOptions) {
      const requestInterception = new Promise((resolve) => this.resolveRequestPromise = resolve);
      const event = dispatch("turbo:before-fetch-request", {
        cancelable: true,
        detail: {
          fetchOptions,
          url: this.url,
          resume: this.resolveRequestPromise
        },
        target: this.target
      });
      if (event.defaultPrevented)
        await requestInterception;
    }
    willDelegateErrorHandling(error2) {
      const event = dispatch("turbo:fetch-request-error", {
        target: this.target,
        cancelable: true,
        detail: { request: this, error: error2 }
      });
      return !event.defaultPrevented;
    }
  };
  var AppearanceObserver = class {
    constructor(delegate, element) {
      this.started = false;
      this.intersect = (entries) => {
        const lastEntry = entries.slice(-1)[0];
        if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
          this.delegate.elementAppearedInViewport(this.element);
        }
      };
      this.delegate = delegate;
      this.element = element;
      this.intersectionObserver = new IntersectionObserver(this.intersect);
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.intersectionObserver.observe(this.element);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.intersectionObserver.unobserve(this.element);
      }
    }
  };
  var StreamMessage = class {
    constructor(fragment) {
      this.fragment = importStreamElements(fragment);
    }
    static wrap(message) {
      if (typeof message == "string") {
        return new this(createDocumentFragment(message));
      } else {
        return message;
      }
    }
  };
  StreamMessage.contentType = "text/vnd.turbo-stream.html";
  function importStreamElements(fragment) {
    for (const element of fragment.querySelectorAll("turbo-stream")) {
      const streamElement = document.importNode(element, true);
      for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
        inertScriptElement.replaceWith(activateScriptElement(inertScriptElement));
      }
      element.replaceWith(streamElement);
    }
    return fragment;
  }
  var FormSubmissionState;
  (function(FormSubmissionState2) {
    FormSubmissionState2[FormSubmissionState2["initialized"] = 0] = "initialized";
    FormSubmissionState2[FormSubmissionState2["requesting"] = 1] = "requesting";
    FormSubmissionState2[FormSubmissionState2["waiting"] = 2] = "waiting";
    FormSubmissionState2[FormSubmissionState2["receiving"] = 3] = "receiving";
    FormSubmissionState2[FormSubmissionState2["stopping"] = 4] = "stopping";
    FormSubmissionState2[FormSubmissionState2["stopped"] = 5] = "stopped";
  })(FormSubmissionState || (FormSubmissionState = {}));
  var FormEnctype;
  (function(FormEnctype2) {
    FormEnctype2["urlEncoded"] = "application/x-www-form-urlencoded";
    FormEnctype2["multipart"] = "multipart/form-data";
    FormEnctype2["plain"] = "text/plain";
  })(FormEnctype || (FormEnctype = {}));
  function formEnctypeFromString(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEnctype.multipart:
        return FormEnctype.multipart;
      case FormEnctype.plain:
        return FormEnctype.plain;
      default:
        return FormEnctype.urlEncoded;
    }
  }
  var FormSubmission = class {
    constructor(delegate, formElement, submitter, mustRedirect = false) {
      this.state = FormSubmissionState.initialized;
      this.delegate = delegate;
      this.formElement = formElement;
      this.submitter = submitter;
      this.formData = buildFormData(formElement, submitter);
      this.location = expandURL(this.action);
      if (this.method == FetchMethod.get) {
        mergeFormDataEntries(this.location, [...this.body.entries()]);
      }
      this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement);
      this.mustRedirect = mustRedirect;
    }
    static confirmMethod(message, _element, _submitter) {
      return Promise.resolve(confirm(message));
    }
    get method() {
      var _a;
      const method = ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formmethod")) || this.formElement.getAttribute("method") || "";
      return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get;
    }
    get action() {
      var _a;
      const formElementAction = typeof this.formElement.action === "string" ? this.formElement.action : null;
      if ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.hasAttribute("formaction")) {
        return this.submitter.getAttribute("formaction") || "";
      } else {
        return this.formElement.getAttribute("action") || formElementAction || "";
      }
    }
    get body() {
      if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
        return new URLSearchParams(this.stringFormData);
      } else {
        return this.formData;
      }
    }
    get enctype() {
      var _a;
      return formEnctypeFromString(((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formenctype")) || this.formElement.enctype);
    }
    get isIdempotent() {
      return this.fetchRequest.isIdempotent;
    }
    get stringFormData() {
      return [...this.formData].reduce((entries, [name, value]) => {
        return entries.concat(typeof value == "string" ? [[name, value]] : []);
      }, []);
    }
    async start() {
      const { initialized, requesting } = FormSubmissionState;
      const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement);
      if (typeof confirmationMessage === "string") {
        const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter);
        if (!answer) {
          return;
        }
      }
      if (this.state == initialized) {
        this.state = requesting;
        return this.fetchRequest.perform();
      }
    }
    stop() {
      const { stopping, stopped } = FormSubmissionState;
      if (this.state != stopping && this.state != stopped) {
        this.state = stopping;
        this.fetchRequest.cancel();
        return true;
      }
    }
    prepareHeadersForRequest(headers, request) {
      if (!request.isIdempotent) {
        const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
        if (token) {
          headers["X-CSRF-Token"] = token;
        }
      }
      if (this.requestAcceptsTurboStreamResponse(request)) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      var _a;
      this.state = FormSubmissionState.waiting;
      (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.setAttribute("disabled", "");
      dispatch("turbo:submit-start", {
        target: this.formElement,
        detail: { formSubmission: this }
      });
      this.delegate.formSubmissionStarted(this);
    }
    requestPreventedHandlingResponse(request, response) {
      this.result = { success: response.succeeded, fetchResponse: response };
    }
    requestSucceededWithResponse(request, response) {
      if (response.clientError || response.serverError) {
        this.delegate.formSubmissionFailedWithResponse(this, response);
      } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
        const error2 = new Error("Form responses must redirect to another location");
        this.delegate.formSubmissionErrored(this, error2);
      } else {
        this.state = FormSubmissionState.receiving;
        this.result = { success: true, fetchResponse: response };
        this.delegate.formSubmissionSucceededWithResponse(this, response);
      }
    }
    requestFailedWithResponse(request, response) {
      this.result = { success: false, fetchResponse: response };
      this.delegate.formSubmissionFailedWithResponse(this, response);
    }
    requestErrored(request, error2) {
      this.result = { success: false, error: error2 };
      this.delegate.formSubmissionErrored(this, error2);
    }
    requestFinished(_request) {
      var _a;
      this.state = FormSubmissionState.stopped;
      (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.removeAttribute("disabled");
      dispatch("turbo:submit-end", {
        target: this.formElement,
        detail: Object.assign({ formSubmission: this }, this.result)
      });
      this.delegate.formSubmissionFinished(this);
    }
    requestMustRedirect(request) {
      return !request.isIdempotent && this.mustRedirect;
    }
    requestAcceptsTurboStreamResponse(request) {
      return !request.isIdempotent || hasAttribute("data-turbo-stream", this.submitter, this.formElement);
    }
  };
  function buildFormData(formElement, submitter) {
    const formData = new FormData(formElement);
    const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
    const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
    if (name) {
      formData.append(name, value || "");
    }
    return formData;
  }
  function getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : void 0;
      }
    }
  }
  function responseSucceededWithoutRedirect(response) {
    return response.statusCode == 200 && !response.redirected;
  }
  function mergeFormDataEntries(url, entries) {
    const searchParams = new URLSearchParams();
    for (const [name, value] of entries) {
      if (value instanceof File)
        continue;
      searchParams.append(name, value);
    }
    url.search = searchParams.toString();
    return url;
  }
  var Snapshot = class {
    constructor(element) {
      this.element = element;
    }
    get activeElement() {
      return this.element.ownerDocument.activeElement;
    }
    get children() {
      return [...this.element.children];
    }
    hasAnchor(anchor) {
      return this.getElementForAnchor(anchor) != null;
    }
    getElementForAnchor(anchor) {
      return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null;
    }
    get isConnected() {
      return this.element.isConnected;
    }
    get firstAutofocusableElement() {
      const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])";
      for (const element of this.element.querySelectorAll("[autofocus]")) {
        if (element.closest(inertDisabledOrHidden) == null)
          return element;
        else
          continue;
      }
      return null;
    }
    get permanentElements() {
      return queryPermanentElementsAll(this.element);
    }
    getPermanentElementById(id2) {
      return getPermanentElementById(this.element, id2);
    }
    getPermanentElementMapForSnapshot(snapshot) {
      const permanentElementMap = {};
      for (const currentPermanentElement of this.permanentElements) {
        const { id: id2 } = currentPermanentElement;
        const newPermanentElement = snapshot.getPermanentElementById(id2);
        if (newPermanentElement) {
          permanentElementMap[id2] = [currentPermanentElement, newPermanentElement];
        }
      }
      return permanentElementMap;
    }
  };
  function getPermanentElementById(node, id2) {
    return node.querySelector(`#${id2}[data-turbo-permanent]`);
  }
  function queryPermanentElementsAll(node) {
    return node.querySelectorAll("[id][data-turbo-permanent]");
  }
  var FormSubmitObserver = class {
    constructor(delegate, eventTarget) {
      this.started = false;
      this.submitCaptured = () => {
        this.eventTarget.removeEventListener("submit", this.submitBubbled, false);
        this.eventTarget.addEventListener("submit", this.submitBubbled, false);
      };
      this.submitBubbled = (event) => {
        if (!event.defaultPrevented) {
          const form = event.target instanceof HTMLFormElement ? event.target : void 0;
          const submitter = event.submitter || void 0;
          if (form && submissionDoesNotDismissDialog(form, submitter) && submissionDoesNotTargetIFrame(form, submitter) && this.delegate.willSubmitForm(form, submitter)) {
            event.preventDefault();
            this.delegate.formSubmitted(form, submitter);
          }
        }
      };
      this.delegate = delegate;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("submit", this.submitCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("submit", this.submitCaptured, true);
        this.started = false;
      }
    }
  };
  function submissionDoesNotDismissDialog(form, submitter) {
    const method = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) || form.getAttribute("method");
    return method != "dialog";
  }
  function submissionDoesNotTargetIFrame(form, submitter) {
    const target = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formtarget")) || form.target;
    for (const element of document.getElementsByName(target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var View = class {
    constructor(delegate, element) {
      this.resolveRenderPromise = (_value) => {
      };
      this.resolveInterceptionPromise = (_value) => {
      };
      this.delegate = delegate;
      this.element = element;
    }
    scrollToAnchor(anchor) {
      const element = this.snapshot.getElementForAnchor(anchor);
      if (element) {
        this.scrollToElement(element);
        this.focusElement(element);
      } else {
        this.scrollToPosition({ x: 0, y: 0 });
      }
    }
    scrollToAnchorFromLocation(location2) {
      this.scrollToAnchor(getAnchor(location2));
    }
    scrollToElement(element) {
      element.scrollIntoView();
    }
    focusElement(element) {
      if (element instanceof HTMLElement) {
        if (element.hasAttribute("tabindex")) {
          element.focus();
        } else {
          element.setAttribute("tabindex", "-1");
          element.focus();
          element.removeAttribute("tabindex");
        }
      }
    }
    scrollToPosition({ x, y }) {
      this.scrollRoot.scrollTo(x, y);
    }
    scrollToTop() {
      this.scrollToPosition({ x: 0, y: 0 });
    }
    get scrollRoot() {
      return window;
    }
    async render(renderer) {
      const { isPreview, shouldRender, newSnapshot: snapshot } = renderer;
      if (shouldRender) {
        try {
          this.renderPromise = new Promise((resolve) => this.resolveRenderPromise = resolve);
          this.renderer = renderer;
          await this.prepareToRenderSnapshot(renderer);
          const renderInterception = new Promise((resolve) => this.resolveInterceptionPromise = resolve);
          const options2 = { resume: this.resolveInterceptionPromise, render: this.renderer.renderElement };
          const immediateRender = this.delegate.allowsImmediateRender(snapshot, options2);
          if (!immediateRender)
            await renderInterception;
          await this.renderSnapshot(renderer);
          this.delegate.viewRenderedSnapshot(snapshot, isPreview);
          this.delegate.preloadOnLoadLinksForView(this.element);
          this.finishRenderingSnapshot(renderer);
        } finally {
          delete this.renderer;
          this.resolveRenderPromise(void 0);
          delete this.renderPromise;
        }
      } else {
        this.invalidate(renderer.reloadReason);
      }
    }
    invalidate(reason) {
      this.delegate.viewInvalidated(reason);
    }
    async prepareToRenderSnapshot(renderer) {
      this.markAsPreview(renderer.isPreview);
      await renderer.prepareToRender();
    }
    markAsPreview(isPreview) {
      if (isPreview) {
        this.element.setAttribute("data-turbo-preview", "");
      } else {
        this.element.removeAttribute("data-turbo-preview");
      }
    }
    async renderSnapshot(renderer) {
      await renderer.render();
    }
    finishRenderingSnapshot(renderer) {
      renderer.finishRendering();
    }
  };
  var FrameView = class extends View {
    invalidate() {
      this.element.innerHTML = "";
    }
    get snapshot() {
      return new Snapshot(this.element);
    }
  };
  var LinkClickObserver = class {
    constructor(delegate, eventTarget) {
      this.started = false;
      this.clickCaptured = () => {
        this.eventTarget.removeEventListener("click", this.clickBubbled, false);
        this.eventTarget.addEventListener("click", this.clickBubbled, false);
      };
      this.clickBubbled = (event) => {
        if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
          const target = event.composedPath && event.composedPath()[0] || event.target;
          const link = this.findLinkFromClickTarget(target);
          if (link && doesNotTargetIFrame(link)) {
            const location2 = this.getLocationForLink(link);
            if (this.delegate.willFollowLinkToLocation(link, location2, event)) {
              event.preventDefault();
              this.delegate.followedLinkToLocation(link, location2);
            }
          }
        }
      };
      this.delegate = delegate;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("click", this.clickCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("click", this.clickCaptured, true);
        this.started = false;
      }
    }
    clickEventIsSignificant(event) {
      return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    findLinkFromClickTarget(target) {
      if (target instanceof Element) {
        return target.closest("a[href]:not([target^=_]):not([download])");
      }
    }
    getLocationForLink(link) {
      return expandURL(link.getAttribute("href") || "");
    }
  };
  function doesNotTargetIFrame(anchor) {
    for (const element of document.getElementsByName(anchor.target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var FormLinkClickObserver = class {
    constructor(delegate, element) {
      this.delegate = delegate;
      this.linkClickObserver = new LinkClickObserver(this, element);
    }
    start() {
      this.linkClickObserver.start();
    }
    stop() {
      this.linkClickObserver.stop();
    }
    willFollowLinkToLocation(link, location2, originalEvent) {
      return this.delegate.willSubmitFormLinkToLocation(link, location2, originalEvent) && link.hasAttribute("data-turbo-method");
    }
    followedLinkToLocation(link, location2) {
      const action = location2.href;
      const form = document.createElement("form");
      form.setAttribute("data-turbo", "true");
      form.setAttribute("action", action);
      form.setAttribute("hidden", "");
      const method = link.getAttribute("data-turbo-method");
      if (method)
        form.setAttribute("method", method);
      const turboFrame = link.getAttribute("data-turbo-frame");
      if (turboFrame)
        form.setAttribute("data-turbo-frame", turboFrame);
      const turboAction = link.getAttribute("data-turbo-action");
      if (turboAction)
        form.setAttribute("data-turbo-action", turboAction);
      const turboConfirm = link.getAttribute("data-turbo-confirm");
      if (turboConfirm)
        form.setAttribute("data-turbo-confirm", turboConfirm);
      const turboStream = link.hasAttribute("data-turbo-stream");
      if (turboStream)
        form.setAttribute("data-turbo-stream", "");
      this.delegate.submittedFormLinkToLocation(link, location2, form);
      document.body.appendChild(form);
      form.addEventListener("turbo:submit-end", () => form.remove(), { once: true });
      requestAnimationFrame(() => form.requestSubmit());
    }
  };
  var Bardo = class {
    constructor(delegate, permanentElementMap) {
      this.delegate = delegate;
      this.permanentElementMap = permanentElementMap;
    }
    static preservingPermanentElements(delegate, permanentElementMap, callback) {
      const bardo = new this(delegate, permanentElementMap);
      bardo.enter();
      callback();
      bardo.leave();
    }
    enter() {
      for (const id2 in this.permanentElementMap) {
        const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id2];
        this.delegate.enteringBardo(currentPermanentElement, newPermanentElement);
        this.replaceNewPermanentElementWithPlaceholder(newPermanentElement);
      }
    }
    leave() {
      for (const id2 in this.permanentElementMap) {
        const [currentPermanentElement] = this.permanentElementMap[id2];
        this.replaceCurrentPermanentElementWithClone(currentPermanentElement);
        this.replacePlaceholderWithPermanentElement(currentPermanentElement);
        this.delegate.leavingBardo(currentPermanentElement);
      }
    }
    replaceNewPermanentElementWithPlaceholder(permanentElement) {
      const placeholder = createPlaceholderForPermanentElement(permanentElement);
      permanentElement.replaceWith(placeholder);
    }
    replaceCurrentPermanentElementWithClone(permanentElement) {
      const clone = permanentElement.cloneNode(true);
      permanentElement.replaceWith(clone);
    }
    replacePlaceholderWithPermanentElement(permanentElement) {
      const placeholder = this.getPlaceholderById(permanentElement.id);
      placeholder === null || placeholder === void 0 ? void 0 : placeholder.replaceWith(permanentElement);
    }
    getPlaceholderById(id2) {
      return this.placeholders.find((element) => element.content == id2);
    }
    get placeholders() {
      return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")];
    }
  };
  function createPlaceholderForPermanentElement(permanentElement) {
    const element = document.createElement("meta");
    element.setAttribute("name", "turbo-permanent-placeholder");
    element.setAttribute("content", permanentElement.id);
    return element;
  }
  var Renderer = class {
    constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      this.activeElement = null;
      this.currentSnapshot = currentSnapshot;
      this.newSnapshot = newSnapshot;
      this.isPreview = isPreview;
      this.willRender = willRender;
      this.renderElement = renderElement;
      this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject });
    }
    get shouldRender() {
      return true;
    }
    get reloadReason() {
      return;
    }
    prepareToRender() {
      return;
    }
    finishRendering() {
      if (this.resolvingFunctions) {
        this.resolvingFunctions.resolve();
        delete this.resolvingFunctions;
      }
    }
    preservingPermanentElements(callback) {
      Bardo.preservingPermanentElements(this, this.permanentElementMap, callback);
    }
    focusFirstAutofocusableElement() {
      const element = this.connectedSnapshot.firstAutofocusableElement;
      if (elementIsFocusable(element)) {
        element.focus();
      }
    }
    enteringBardo(currentPermanentElement) {
      if (this.activeElement)
        return;
      if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
        this.activeElement = this.currentSnapshot.activeElement;
      }
    }
    leavingBardo(currentPermanentElement) {
      if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
        this.activeElement.focus();
        this.activeElement = null;
      }
    }
    get connectedSnapshot() {
      return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot;
    }
    get currentElement() {
      return this.currentSnapshot.element;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    get permanentElementMap() {
      return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot);
    }
  };
  function elementIsFocusable(element) {
    return element && typeof element.focus == "function";
  }
  var FrameRenderer = class extends Renderer {
    constructor(delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender);
      this.delegate = delegate;
    }
    static renderElement(currentElement, newElement) {
      var _a;
      const destinationRange = document.createRange();
      destinationRange.selectNodeContents(currentElement);
      destinationRange.deleteContents();
      const frameElement = newElement;
      const sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange();
      if (sourceRange) {
        sourceRange.selectNodeContents(frameElement);
        currentElement.appendChild(sourceRange.extractContents());
      }
    }
    get shouldRender() {
      return true;
    }
    async render() {
      await nextAnimationFrame();
      this.preservingPermanentElements(() => {
        this.loadFrameElement();
      });
      this.scrollFrameIntoView();
      await nextAnimationFrame();
      this.focusFirstAutofocusableElement();
      await nextAnimationFrame();
      this.activateScriptElements();
    }
    loadFrameElement() {
      this.delegate.willRenderFrame(this.currentElement, this.newElement);
      this.renderElement(this.currentElement, this.newElement);
    }
    scrollFrameIntoView() {
      if (this.currentElement.autoscroll || this.newElement.autoscroll) {
        const element = this.currentElement.firstElementChild;
        const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end");
        const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto");
        if (element) {
          element.scrollIntoView({ block, behavior });
          return true;
        }
      }
      return false;
    }
    activateScriptElements() {
      for (const inertScriptElement of this.newScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    get newScriptElements() {
      return this.currentElement.querySelectorAll("script");
    }
  };
  function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
      return value;
    } else {
      return defaultValue;
    }
  }
  function readScrollBehavior(value, defaultValue) {
    if (value == "auto" || value == "smooth") {
      return value;
    } else {
      return defaultValue;
    }
  }
  var ProgressBar = class {
    constructor() {
      this.hiding = false;
      this.value = 0;
      this.visible = false;
      this.trickle = () => {
        this.setValue(this.value + Math.random() / 100);
      };
      this.stylesheetElement = this.createStylesheetElement();
      this.progressElement = this.createProgressElement();
      this.installStylesheetElement();
      this.setValue(0);
    }
    static get defaultCSS() {
      return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `;
    }
    show() {
      if (!this.visible) {
        this.visible = true;
        this.installProgressElement();
        this.startTrickling();
      }
    }
    hide() {
      if (this.visible && !this.hiding) {
        this.hiding = true;
        this.fadeProgressElement(() => {
          this.uninstallProgressElement();
          this.stopTrickling();
          this.visible = false;
          this.hiding = false;
        });
      }
    }
    setValue(value) {
      this.value = value;
      this.refresh();
    }
    installStylesheetElement() {
      document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
    }
    installProgressElement() {
      this.progressElement.style.width = "0";
      this.progressElement.style.opacity = "1";
      document.documentElement.insertBefore(this.progressElement, document.body);
      this.refresh();
    }
    fadeProgressElement(callback) {
      this.progressElement.style.opacity = "0";
      setTimeout(callback, ProgressBar.animationDuration * 1.5);
    }
    uninstallProgressElement() {
      if (this.progressElement.parentNode) {
        document.documentElement.removeChild(this.progressElement);
      }
    }
    startTrickling() {
      if (!this.trickleInterval) {
        this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration);
      }
    }
    stopTrickling() {
      window.clearInterval(this.trickleInterval);
      delete this.trickleInterval;
    }
    refresh() {
      requestAnimationFrame(() => {
        this.progressElement.style.width = `${10 + this.value * 90}%`;
      });
    }
    createStylesheetElement() {
      const element = document.createElement("style");
      element.type = "text/css";
      element.textContent = ProgressBar.defaultCSS;
      if (this.cspNonce) {
        element.nonce = this.cspNonce;
      }
      return element;
    }
    createProgressElement() {
      const element = document.createElement("div");
      element.className = "turbo-progress-bar";
      return element;
    }
    get cspNonce() {
      return getMetaContent("csp-nonce");
    }
  };
  ProgressBar.animationDuration = 300;
  var HeadSnapshot = class extends Snapshot {
    constructor() {
      super(...arguments);
      this.detailsByOuterHTML = this.children.filter((element) => !elementIsNoscript(element)).map((element) => elementWithoutNonce(element)).reduce((result, element) => {
        const { outerHTML } = element;
        const details = outerHTML in result ? result[outerHTML] : {
          type: elementType(element),
          tracked: elementIsTracked(element),
          elements: []
        };
        return Object.assign(Object.assign({}, result), { [outerHTML]: Object.assign(Object.assign({}, details), { elements: [...details.elements, element] }) });
      }, {});
    }
    get trackedElementSignature() {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked).join("");
    }
    getScriptElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("script", snapshot);
    }
    getStylesheetElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot);
    }
    getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML)).map((outerHTML) => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element);
    }
    get provisionalElements() {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML];
        if (type == null && !tracked) {
          return [...result, ...elements];
        } else if (elements.length > 1) {
          return [...result, ...elements.slice(1)];
        } else {
          return result;
        }
      }, []);
    }
    getMetaValue(name) {
      const element = this.findMetaElementByName(name);
      return element ? element.getAttribute("content") : null;
    }
    findMetaElementByName(name) {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { elements: [element] } = this.detailsByOuterHTML[outerHTML];
        return elementIsMetaElementWithName(element, name) ? element : result;
      }, void 0);
    }
  };
  function elementType(element) {
    if (elementIsScript(element)) {
      return "script";
    } else if (elementIsStylesheet(element)) {
      return "stylesheet";
    }
  }
  function elementIsTracked(element) {
    return element.getAttribute("data-turbo-track") == "reload";
  }
  function elementIsScript(element) {
    const tagName2 = element.localName;
    return tagName2 == "script";
  }
  function elementIsNoscript(element) {
    const tagName2 = element.localName;
    return tagName2 == "noscript";
  }
  function elementIsStylesheet(element) {
    const tagName2 = element.localName;
    return tagName2 == "style" || tagName2 == "link" && element.getAttribute("rel") == "stylesheet";
  }
  function elementIsMetaElementWithName(element, name) {
    const tagName2 = element.localName;
    return tagName2 == "meta" && element.getAttribute("name") == name;
  }
  function elementWithoutNonce(element) {
    if (element.hasAttribute("nonce")) {
      element.setAttribute("nonce", "");
    }
    return element;
  }
  var PageSnapshot = class extends Snapshot {
    constructor(element, headSnapshot) {
      super(element);
      this.headSnapshot = headSnapshot;
    }
    static fromHTMLString(html2 = "") {
      return this.fromDocument(parseHTMLDocument(html2));
    }
    static fromElement(element) {
      return this.fromDocument(element.ownerDocument);
    }
    static fromDocument({ head, body }) {
      return new this(body, new HeadSnapshot(head));
    }
    clone() {
      const clonedElement = this.element.cloneNode(true);
      const selectElements = this.element.querySelectorAll("select");
      const clonedSelectElements = clonedElement.querySelectorAll("select");
      for (const [index, source] of selectElements.entries()) {
        const clone = clonedSelectElements[index];
        for (const option of clone.selectedOptions)
          option.selected = false;
        for (const option of source.selectedOptions)
          clone.options[option.index].selected = true;
      }
      for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
        clonedPasswordInput.value = "";
      }
      return new PageSnapshot(clonedElement, this.headSnapshot);
    }
    get headElement() {
      return this.headSnapshot.element;
    }
    get rootLocation() {
      var _a;
      const root = (_a = this.getSetting("root")) !== null && _a !== void 0 ? _a : "/";
      return expandURL(root);
    }
    get cacheControlValue() {
      return this.getSetting("cache-control");
    }
    get isPreviewable() {
      return this.cacheControlValue != "no-preview";
    }
    get isCacheable() {
      return this.cacheControlValue != "no-cache";
    }
    get isVisitable() {
      return this.getSetting("visit-control") != "reload";
    }
    getSetting(name) {
      return this.headSnapshot.getMetaValue(`turbo-${name}`);
    }
  };
  var TimingMetric;
  (function(TimingMetric2) {
    TimingMetric2["visitStart"] = "visitStart";
    TimingMetric2["requestStart"] = "requestStart";
    TimingMetric2["requestEnd"] = "requestEnd";
    TimingMetric2["visitEnd"] = "visitEnd";
  })(TimingMetric || (TimingMetric = {}));
  var VisitState;
  (function(VisitState2) {
    VisitState2["initialized"] = "initialized";
    VisitState2["started"] = "started";
    VisitState2["canceled"] = "canceled";
    VisitState2["failed"] = "failed";
    VisitState2["completed"] = "completed";
  })(VisitState || (VisitState = {}));
  var defaultOptions = {
    action: "advance",
    historyChanged: false,
    visitCachedSnapshot: () => {
    },
    willRender: true,
    updateHistory: true,
    shouldCacheSnapshot: true,
    acceptsStreamResponse: false
  };
  var SystemStatusCode;
  (function(SystemStatusCode2) {
    SystemStatusCode2[SystemStatusCode2["networkFailure"] = 0] = "networkFailure";
    SystemStatusCode2[SystemStatusCode2["timeoutFailure"] = -1] = "timeoutFailure";
    SystemStatusCode2[SystemStatusCode2["contentTypeMismatch"] = -2] = "contentTypeMismatch";
  })(SystemStatusCode || (SystemStatusCode = {}));
  var Visit = class {
    constructor(delegate, location2, restorationIdentifier, options2 = {}) {
      this.identifier = uuid();
      this.timingMetrics = {};
      this.followedRedirect = false;
      this.historyChanged = false;
      this.scrolled = false;
      this.shouldCacheSnapshot = true;
      this.acceptsStreamResponse = false;
      this.snapshotCached = false;
      this.state = VisitState.initialized;
      this.delegate = delegate;
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier || uuid();
      const { action, historyChanged, referrer, snapshotHTML, response, visitCachedSnapshot, willRender, updateHistory, shouldCacheSnapshot, acceptsStreamResponse } = Object.assign(Object.assign({}, defaultOptions), options2);
      this.action = action;
      this.historyChanged = historyChanged;
      this.referrer = referrer;
      this.snapshotHTML = snapshotHTML;
      this.response = response;
      this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action);
      this.visitCachedSnapshot = visitCachedSnapshot;
      this.willRender = willRender;
      this.updateHistory = updateHistory;
      this.scrolled = !willRender;
      this.shouldCacheSnapshot = shouldCacheSnapshot;
      this.acceptsStreamResponse = acceptsStreamResponse;
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    get restorationData() {
      return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
    }
    get silent() {
      return this.isSamePage;
    }
    start() {
      if (this.state == VisitState.initialized) {
        this.recordTimingMetric(TimingMetric.visitStart);
        this.state = VisitState.started;
        this.adapter.visitStarted(this);
        this.delegate.visitStarted(this);
      }
    }
    cancel() {
      if (this.state == VisitState.started) {
        if (this.request) {
          this.request.cancel();
        }
        this.cancelRender();
        this.state = VisitState.canceled;
      }
    }
    complete() {
      if (this.state == VisitState.started) {
        this.recordTimingMetric(TimingMetric.visitEnd);
        this.state = VisitState.completed;
        this.followRedirect();
        if (!this.followedRedirect) {
          this.adapter.visitCompleted(this);
          this.delegate.visitCompleted(this);
        }
      }
    }
    fail() {
      if (this.state == VisitState.started) {
        this.state = VisitState.failed;
        this.adapter.visitFailed(this);
      }
    }
    changeHistory() {
      var _a;
      if (!this.historyChanged && this.updateHistory) {
        const actionForHistory = this.location.href === ((_a = this.referrer) === null || _a === void 0 ? void 0 : _a.href) ? "replace" : this.action;
        const method = getHistoryMethodForAction(actionForHistory);
        this.history.update(method, this.location, this.restorationIdentifier);
        this.historyChanged = true;
      }
    }
    issueRequest() {
      if (this.hasPreloadedResponse()) {
        this.simulateRequest();
      } else if (this.shouldIssueRequest() && !this.request) {
        this.request = new FetchRequest(this, FetchMethod.get, this.location);
        this.request.perform();
      }
    }
    simulateRequest() {
      if (this.response) {
        this.startRequest();
        this.recordResponse();
        this.finishRequest();
      }
    }
    startRequest() {
      this.recordTimingMetric(TimingMetric.requestStart);
      this.adapter.visitRequestStarted(this);
    }
    recordResponse(response = this.response) {
      this.response = response;
      if (response) {
        const { statusCode } = response;
        if (isSuccessful(statusCode)) {
          this.adapter.visitRequestCompleted(this);
        } else {
          this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
        }
      }
    }
    finishRequest() {
      this.recordTimingMetric(TimingMetric.requestEnd);
      this.adapter.visitRequestFinished(this);
    }
    loadResponse() {
      if (this.response) {
        const { statusCode, responseHTML } = this.response;
        this.render(async () => {
          if (this.shouldCacheSnapshot)
            this.cacheSnapshot();
          if (this.view.renderPromise)
            await this.view.renderPromise;
          if (isSuccessful(statusCode) && responseHTML != null) {
            await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            this.complete();
          } else {
            await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this);
            this.adapter.visitRendered(this);
            this.fail();
          }
        });
      }
    }
    getCachedSnapshot() {
      const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
      if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
        if (this.action == "restore" || snapshot.isPreviewable) {
          return snapshot;
        }
      }
    }
    getPreloadedSnapshot() {
      if (this.snapshotHTML) {
        return PageSnapshot.fromHTMLString(this.snapshotHTML);
      }
    }
    hasCachedSnapshot() {
      return this.getCachedSnapshot() != null;
    }
    loadCachedSnapshot() {
      const snapshot = this.getCachedSnapshot();
      if (snapshot) {
        const isPreview = this.shouldIssueRequest();
        this.render(async () => {
          this.cacheSnapshot();
          if (this.isSamePage) {
            this.adapter.visitRendered(this);
          } else {
            if (this.view.renderPromise)
              await this.view.renderPromise;
            await this.view.renderPage(snapshot, isPreview, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            if (!isPreview) {
              this.complete();
            }
          }
        });
      }
    }
    followRedirect() {
      var _a;
      if (this.redirectedToLocation && !this.followedRedirect && ((_a = this.response) === null || _a === void 0 ? void 0 : _a.redirected)) {
        this.adapter.visitProposedToLocation(this.redirectedToLocation, {
          action: "replace",
          response: this.response
        });
        this.followedRedirect = true;
      }
    }
    goToSamePageAnchor() {
      if (this.isSamePage) {
        this.render(async () => {
          this.cacheSnapshot();
          this.performScroll();
          this.adapter.visitRendered(this);
        });
      }
    }
    prepareHeadersForRequest(headers, request) {
      if (this.acceptsStreamResponse) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted() {
      this.startRequest();
    }
    requestPreventedHandlingResponse(_request, _response) {
    }
    async requestSucceededWithResponse(request, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.redirectedToLocation = response.redirected ? response.location : void 0;
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    async requestFailedWithResponse(request, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    requestErrored(_request, _error) {
      this.recordResponse({
        statusCode: SystemStatusCode.networkFailure,
        redirected: false
      });
    }
    requestFinished() {
      this.finishRequest();
    }
    performScroll() {
      if (!this.scrolled && !this.view.forceReloaded) {
        if (this.action == "restore") {
          this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop();
        } else {
          this.scrollToAnchor() || this.view.scrollToTop();
        }
        if (this.isSamePage) {
          this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location);
        }
        this.scrolled = true;
      }
    }
    scrollToRestoredPosition() {
      const { scrollPosition } = this.restorationData;
      if (scrollPosition) {
        this.view.scrollToPosition(scrollPosition);
        return true;
      }
    }
    scrollToAnchor() {
      const anchor = getAnchor(this.location);
      if (anchor != null) {
        this.view.scrollToAnchor(anchor);
        return true;
      }
    }
    recordTimingMetric(metric) {
      this.timingMetrics[metric] = new Date().getTime();
    }
    getTimingMetrics() {
      return Object.assign({}, this.timingMetrics);
    }
    getHistoryMethodForAction(action) {
      switch (action) {
        case "replace":
          return history.replaceState;
        case "advance":
        case "restore":
          return history.pushState;
      }
    }
    hasPreloadedResponse() {
      return typeof this.response == "object";
    }
    shouldIssueRequest() {
      if (this.isSamePage) {
        return false;
      } else if (this.action == "restore") {
        return !this.hasCachedSnapshot();
      } else {
        return this.willRender;
      }
    }
    cacheSnapshot() {
      if (!this.snapshotCached) {
        this.view.cacheSnapshot().then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot));
        this.snapshotCached = true;
      }
    }
    async render(callback) {
      this.cancelRender();
      await new Promise((resolve) => {
        this.frame = requestAnimationFrame(() => resolve());
      });
      await callback();
      delete this.frame;
    }
    cancelRender() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        delete this.frame;
      }
    }
  };
  function isSuccessful(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }
  var BrowserAdapter = class {
    constructor(session2) {
      this.progressBar = new ProgressBar();
      this.showProgressBar = () => {
        this.progressBar.show();
      };
      this.session = session2;
    }
    visitProposedToLocation(location2, options2) {
      this.navigator.startVisit(location2, (options2 === null || options2 === void 0 ? void 0 : options2.restorationIdentifier) || uuid(), options2);
    }
    visitStarted(visit2) {
      this.location = visit2.location;
      visit2.loadCachedSnapshot();
      visit2.issueRequest();
      visit2.goToSamePageAnchor();
    }
    visitRequestStarted(visit2) {
      this.progressBar.setValue(0);
      if (visit2.hasCachedSnapshot() || visit2.action != "restore") {
        this.showVisitProgressBarAfterDelay();
      } else {
        this.showProgressBar();
      }
    }
    visitRequestCompleted(visit2) {
      visit2.loadResponse();
    }
    visitRequestFailedWithStatusCode(visit2, statusCode) {
      switch (statusCode) {
        case SystemStatusCode.networkFailure:
        case SystemStatusCode.timeoutFailure:
        case SystemStatusCode.contentTypeMismatch:
          return this.reload({
            reason: "request_failed",
            context: {
              statusCode
            }
          });
        default:
          return visit2.loadResponse();
      }
    }
    visitRequestFinished(_visit) {
      this.progressBar.setValue(1);
      this.hideVisitProgressBar();
    }
    visitCompleted(_visit) {
    }
    pageInvalidated(reason) {
      this.reload(reason);
    }
    visitFailed(_visit) {
    }
    visitRendered(_visit) {
    }
    formSubmissionStarted(_formSubmission) {
      this.progressBar.setValue(0);
      this.showFormProgressBarAfterDelay();
    }
    formSubmissionFinished(_formSubmission) {
      this.progressBar.setValue(1);
      this.hideFormProgressBar();
    }
    showVisitProgressBarAfterDelay() {
      this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
    }
    hideVisitProgressBar() {
      this.progressBar.hide();
      if (this.visitProgressBarTimeout != null) {
        window.clearTimeout(this.visitProgressBarTimeout);
        delete this.visitProgressBarTimeout;
      }
    }
    showFormProgressBarAfterDelay() {
      if (this.formProgressBarTimeout == null) {
        this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
      }
    }
    hideFormProgressBar() {
      this.progressBar.hide();
      if (this.formProgressBarTimeout != null) {
        window.clearTimeout(this.formProgressBarTimeout);
        delete this.formProgressBarTimeout;
      }
    }
    reload(reason) {
      dispatch("turbo:reload", { detail: reason });
      if (!this.location)
        return;
      window.location.href = this.location.toString();
    }
    get navigator() {
      return this.session.navigator;
    }
  };
  var CacheObserver = class {
    constructor() {
      this.started = false;
      this.removeStaleElements = (_event) => {
        const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')];
        for (const element of staleElements) {
          element.remove();
        }
      };
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
  };
  var FrameRedirector = class {
    constructor(session2, element) {
      this.session = session2;
      this.element = element;
      this.linkClickObserver = new LinkClickObserver(this, element);
      this.formSubmitObserver = new FormSubmitObserver(this, element);
    }
    start() {
      this.linkClickObserver.start();
      this.formSubmitObserver.start();
    }
    stop() {
      this.linkClickObserver.stop();
      this.formSubmitObserver.stop();
    }
    willFollowLinkToLocation(element, location2, event) {
      return this.shouldRedirect(element) && this.frameAllowsVisitingLocation(element, location2, event);
    }
    followedLinkToLocation(element, url) {
      const frame = this.findFrameElement(element);
      if (frame) {
        frame.delegate.followedLinkToLocation(element, url);
      }
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == null && this.shouldSubmit(element, submitter) && this.shouldRedirect(element, submitter);
    }
    formSubmitted(element, submitter) {
      const frame = this.findFrameElement(element, submitter);
      if (frame) {
        frame.delegate.formSubmitted(element, submitter);
      }
    }
    frameAllowsVisitingLocation(target, { href: url }, originalEvent) {
      const event = dispatch("turbo:click", {
        target,
        detail: { url, originalEvent },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    shouldSubmit(form, submitter) {
      var _a;
      const action = getAction(form, submitter);
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const rootLocation = expandURL((_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : "/");
      return this.shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation);
    }
    shouldRedirect(element, submitter) {
      const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element);
      if (isNavigatable) {
        const frame = this.findFrameElement(element, submitter);
        return frame ? frame != element.closest("turbo-frame") : false;
      } else {
        return false;
      }
    }
    findFrameElement(element, submitter) {
      const id2 = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("data-turbo-frame")) || element.getAttribute("data-turbo-frame");
      if (id2 && id2 != "_top") {
        const frame = this.element.querySelector(`#${id2}:not([disabled])`);
        if (frame instanceof FrameElement) {
          return frame;
        }
      }
    }
  };
  var History = class {
    constructor(delegate) {
      this.restorationIdentifier = uuid();
      this.restorationData = {};
      this.started = false;
      this.pageLoaded = false;
      this.onPopState = (event) => {
        if (this.shouldHandlePopState()) {
          const { turbo } = event.state || {};
          if (turbo) {
            this.location = new URL(window.location.href);
            const { restorationIdentifier } = turbo;
            this.restorationIdentifier = restorationIdentifier;
            this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier);
          }
        }
      };
      this.onPageLoad = async (_event) => {
        await nextMicrotask();
        this.pageLoaded = true;
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        addEventListener("popstate", this.onPopState, false);
        addEventListener("load", this.onPageLoad, false);
        this.started = true;
        this.replace(new URL(window.location.href));
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("popstate", this.onPopState, false);
        removeEventListener("load", this.onPageLoad, false);
        this.started = false;
      }
    }
    push(location2, restorationIdentifier) {
      this.update(history.pushState, location2, restorationIdentifier);
    }
    replace(location2, restorationIdentifier) {
      this.update(history.replaceState, location2, restorationIdentifier);
    }
    update(method, location2, restorationIdentifier = uuid()) {
      const state = { turbo: { restorationIdentifier } };
      method.call(history, state, "", location2.href);
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier;
    }
    getRestorationDataForIdentifier(restorationIdentifier) {
      return this.restorationData[restorationIdentifier] || {};
    }
    updateRestorationData(additionalData) {
      const { restorationIdentifier } = this;
      const restorationData = this.restorationData[restorationIdentifier];
      this.restorationData[restorationIdentifier] = Object.assign(Object.assign({}, restorationData), additionalData);
    }
    assumeControlOfScrollRestoration() {
      var _a;
      if (!this.previousScrollRestoration) {
        this.previousScrollRestoration = (_a = history.scrollRestoration) !== null && _a !== void 0 ? _a : "auto";
        history.scrollRestoration = "manual";
      }
    }
    relinquishControlOfScrollRestoration() {
      if (this.previousScrollRestoration) {
        history.scrollRestoration = this.previousScrollRestoration;
        delete this.previousScrollRestoration;
      }
    }
    shouldHandlePopState() {
      return this.pageIsLoaded();
    }
    pageIsLoaded() {
      return this.pageLoaded || document.readyState == "complete";
    }
  };
  var Navigator = class {
    constructor(delegate) {
      this.delegate = delegate;
    }
    proposeVisit(location2, options2 = {}) {
      if (this.delegate.allowsVisitingLocationWithAction(location2, options2.action)) {
        if (locationIsVisitable(location2, this.view.snapshot.rootLocation)) {
          this.delegate.visitProposedToLocation(location2, options2);
        } else {
          window.location.href = location2.toString();
        }
      }
    }
    startVisit(locatable, restorationIdentifier, options2 = {}) {
      this.lastVisit = this.currentVisit;
      this.stop();
      this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, Object.assign({ referrer: this.location }, options2));
      this.currentVisit.start();
    }
    submitForm(form, submitter) {
      this.stop();
      this.formSubmission = new FormSubmission(this, form, submitter, true);
      this.formSubmission.start();
    }
    stop() {
      if (this.formSubmission) {
        this.formSubmission.stop();
        delete this.formSubmission;
      }
      if (this.currentVisit) {
        this.currentVisit.cancel();
        delete this.currentVisit;
      }
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    formSubmissionStarted(formSubmission) {
      if (typeof this.adapter.formSubmissionStarted === "function") {
        this.adapter.formSubmissionStarted(formSubmission);
      }
    }
    async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
      if (formSubmission == this.formSubmission) {
        const responseHTML = await fetchResponse.responseHTML;
        if (responseHTML) {
          const shouldCacheSnapshot = formSubmission.method == FetchMethod.get;
          if (!shouldCacheSnapshot) {
            this.view.clearSnapshotCache();
          }
          const { statusCode, redirected } = fetchResponse;
          const action = this.getActionForFormSubmission(formSubmission);
          const visitOptions = {
            action,
            shouldCacheSnapshot,
            response: { statusCode, responseHTML, redirected }
          };
          this.proposeVisit(fetchResponse.location, visitOptions);
        }
      }
    }
    async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      const responseHTML = await fetchResponse.responseHTML;
      if (responseHTML) {
        const snapshot = PageSnapshot.fromHTMLString(responseHTML);
        if (fetchResponse.serverError) {
          await this.view.renderError(snapshot, this.currentVisit);
        } else {
          await this.view.renderPage(snapshot, false, true, this.currentVisit);
        }
        this.view.scrollToTop();
        this.view.clearSnapshotCache();
      }
    }
    formSubmissionErrored(formSubmission, error2) {
      console.error(error2);
    }
    formSubmissionFinished(formSubmission) {
      if (typeof this.adapter.formSubmissionFinished === "function") {
        this.adapter.formSubmissionFinished(formSubmission);
      }
    }
    visitStarted(visit2) {
      this.delegate.visitStarted(visit2);
    }
    visitCompleted(visit2) {
      this.delegate.visitCompleted(visit2);
    }
    locationWithActionIsSamePage(location2, action) {
      var _a;
      const anchor = getAnchor(location2);
      const lastLocation = ((_a = this.lastVisit) === null || _a === void 0 ? void 0 : _a.location) || this.view.lastRenderedLocation;
      const currentAnchor = getAnchor(lastLocation);
      const isRestorationToTop = action === "restore" && typeof anchor === "undefined";
      return action !== "replace" && getRequestURL(location2) === getRequestURL(lastLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.delegate.visitScrolledToSamePageLocation(oldURL, newURL);
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    getActionForFormSubmission(formSubmission) {
      const { formElement, submitter } = formSubmission;
      const action = getAttribute("data-turbo-action", submitter, formElement);
      return isAction(action) ? action : "advance";
    }
  };
  var PageStage;
  (function(PageStage2) {
    PageStage2[PageStage2["initial"] = 0] = "initial";
    PageStage2[PageStage2["loading"] = 1] = "loading";
    PageStage2[PageStage2["interactive"] = 2] = "interactive";
    PageStage2[PageStage2["complete"] = 3] = "complete";
  })(PageStage || (PageStage = {}));
  var PageObserver = class {
    constructor(delegate) {
      this.stage = PageStage.initial;
      this.started = false;
      this.interpretReadyState = () => {
        const { readyState } = this;
        if (readyState == "interactive") {
          this.pageIsInteractive();
        } else if (readyState == "complete") {
          this.pageIsComplete();
        }
      };
      this.pageWillUnload = () => {
        this.delegate.pageWillUnload();
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        if (this.stage == PageStage.initial) {
          this.stage = PageStage.loading;
        }
        document.addEventListener("readystatechange", this.interpretReadyState, false);
        addEventListener("pagehide", this.pageWillUnload, false);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        document.removeEventListener("readystatechange", this.interpretReadyState, false);
        removeEventListener("pagehide", this.pageWillUnload, false);
        this.started = false;
      }
    }
    pageIsInteractive() {
      if (this.stage == PageStage.loading) {
        this.stage = PageStage.interactive;
        this.delegate.pageBecameInteractive();
      }
    }
    pageIsComplete() {
      this.pageIsInteractive();
      if (this.stage == PageStage.interactive) {
        this.stage = PageStage.complete;
        this.delegate.pageLoaded();
      }
    }
    get readyState() {
      return document.readyState;
    }
  };
  var ScrollObserver = class {
    constructor(delegate) {
      this.started = false;
      this.onScroll = () => {
        this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        addEventListener("scroll", this.onScroll, false);
        this.onScroll();
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("scroll", this.onScroll, false);
        this.started = false;
      }
    }
    updatePosition(position) {
      this.delegate.scrollPositionChanged(position);
    }
  };
  var StreamMessageRenderer = class {
    render({ fragment }) {
      Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => document.documentElement.appendChild(fragment));
    }
    enteringBardo(currentPermanentElement, newPermanentElement) {
      newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true));
    }
    leavingBardo() {
    }
  };
  function getPermanentElementMapForFragment(fragment) {
    const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement);
    const permanentElementMap = {};
    for (const permanentElementInDocument of permanentElementsInDocument) {
      const { id: id2 } = permanentElementInDocument;
      for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
        const elementInStream = getPermanentElementById(streamElement.templateElement.content, id2);
        if (elementInStream) {
          permanentElementMap[id2] = [permanentElementInDocument, elementInStream];
        }
      }
    }
    return permanentElementMap;
  }
  var StreamObserver = class {
    constructor(delegate) {
      this.sources = /* @__PURE__ */ new Set();
      this.started = false;
      this.inspectFetchResponse = (event) => {
        const response = fetchResponseFromEvent(event);
        if (response && fetchResponseIsStream(response)) {
          event.preventDefault();
          this.receiveMessageResponse(response);
        }
      };
      this.receiveMessageEvent = (event) => {
        if (this.started && typeof event.data == "string") {
          this.receiveMessageHTML(event.data);
        }
      };
      this.delegate = delegate;
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    connectStreamSource(source) {
      if (!this.streamSourceIsConnected(source)) {
        this.sources.add(source);
        source.addEventListener("message", this.receiveMessageEvent, false);
      }
    }
    disconnectStreamSource(source) {
      if (this.streamSourceIsConnected(source)) {
        this.sources.delete(source);
        source.removeEventListener("message", this.receiveMessageEvent, false);
      }
    }
    streamSourceIsConnected(source) {
      return this.sources.has(source);
    }
    async receiveMessageResponse(response) {
      const html2 = await response.responseHTML;
      if (html2) {
        this.receiveMessageHTML(html2);
      }
    }
    receiveMessageHTML(html2) {
      this.delegate.receivedMessageFromStream(StreamMessage.wrap(html2));
    }
  };
  function fetchResponseFromEvent(event) {
    var _a;
    const fetchResponse = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.fetchResponse;
    if (fetchResponse instanceof FetchResponse) {
      return fetchResponse;
    }
  }
  function fetchResponseIsStream(response) {
    var _a;
    const contentType = (_a = response.contentType) !== null && _a !== void 0 ? _a : "";
    return contentType.startsWith(StreamMessage.contentType);
  }
  var ErrorRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      const { documentElement, body } = document;
      documentElement.replaceChild(newElement, body);
    }
    async render() {
      this.replaceHeadAndBody();
      this.activateScriptElements();
    }
    replaceHeadAndBody() {
      const { documentElement, head } = document;
      documentElement.replaceChild(this.newHead, head);
      this.renderElement(this.currentElement, this.newElement);
    }
    activateScriptElements() {
      for (const replaceableElement of this.scriptElements) {
        const parentNode = replaceableElement.parentNode;
        if (parentNode) {
          const element = activateScriptElement(replaceableElement);
          parentNode.replaceChild(element, replaceableElement);
        }
      }
    }
    get newHead() {
      return this.newSnapshot.headSnapshot.element;
    }
    get scriptElements() {
      return document.documentElement.querySelectorAll("script");
    }
  };
  var PageRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      if (document.body && newElement instanceof HTMLBodyElement) {
        document.body.replaceWith(newElement);
      } else {
        document.documentElement.appendChild(newElement);
      }
    }
    get shouldRender() {
      return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical;
    }
    get reloadReason() {
      if (!this.newSnapshot.isVisitable) {
        return {
          reason: "turbo_visit_control_is_reload"
        };
      }
      if (!this.trackedElementsAreIdentical) {
        return {
          reason: "tracked_element_mismatch"
        };
      }
    }
    async prepareToRender() {
      await this.mergeHead();
    }
    async render() {
      if (this.willRender) {
        this.replaceBody();
      }
    }
    finishRendering() {
      super.finishRendering();
      if (!this.isPreview) {
        this.focusFirstAutofocusableElement();
      }
    }
    get currentHeadSnapshot() {
      return this.currentSnapshot.headSnapshot;
    }
    get newHeadSnapshot() {
      return this.newSnapshot.headSnapshot;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    async mergeHead() {
      const newStylesheetElements = this.copyNewHeadStylesheetElements();
      this.copyNewHeadScriptElements();
      this.removeCurrentHeadProvisionalElements();
      this.copyNewHeadProvisionalElements();
      await newStylesheetElements;
    }
    replaceBody() {
      this.preservingPermanentElements(() => {
        this.activateNewBody();
        this.assignNewBody();
      });
    }
    get trackedElementsAreIdentical() {
      return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature;
    }
    async copyNewHeadStylesheetElements() {
      const loadingElements = [];
      for (const element of this.newHeadStylesheetElements) {
        loadingElements.push(waitForLoad(element));
        document.head.appendChild(element);
      }
      await Promise.all(loadingElements);
    }
    copyNewHeadScriptElements() {
      for (const element of this.newHeadScriptElements) {
        document.head.appendChild(activateScriptElement(element));
      }
    }
    removeCurrentHeadProvisionalElements() {
      for (const element of this.currentHeadProvisionalElements) {
        document.head.removeChild(element);
      }
    }
    copyNewHeadProvisionalElements() {
      for (const element of this.newHeadProvisionalElements) {
        document.head.appendChild(element);
      }
    }
    activateNewBody() {
      document.adoptNode(this.newElement);
      this.activateNewBodyScriptElements();
    }
    activateNewBodyScriptElements() {
      for (const inertScriptElement of this.newBodyScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    assignNewBody() {
      this.renderElement(this.currentElement, this.newElement);
    }
    get newHeadStylesheetElements() {
      return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get newHeadScriptElements() {
      return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get currentHeadProvisionalElements() {
      return this.currentHeadSnapshot.provisionalElements;
    }
    get newHeadProvisionalElements() {
      return this.newHeadSnapshot.provisionalElements;
    }
    get newBodyScriptElements() {
      return this.newElement.querySelectorAll("script");
    }
  };
  var SnapshotCache = class {
    constructor(size) {
      this.keys = [];
      this.snapshots = {};
      this.size = size;
    }
    has(location2) {
      return toCacheKey(location2) in this.snapshots;
    }
    get(location2) {
      if (this.has(location2)) {
        const snapshot = this.read(location2);
        this.touch(location2);
        return snapshot;
      }
    }
    put(location2, snapshot) {
      this.write(location2, snapshot);
      this.touch(location2);
      return snapshot;
    }
    clear() {
      this.snapshots = {};
    }
    read(location2) {
      return this.snapshots[toCacheKey(location2)];
    }
    write(location2, snapshot) {
      this.snapshots[toCacheKey(location2)] = snapshot;
    }
    touch(location2) {
      const key = toCacheKey(location2);
      const index = this.keys.indexOf(key);
      if (index > -1)
        this.keys.splice(index, 1);
      this.keys.unshift(key);
      this.trim();
    }
    trim() {
      for (const key of this.keys.splice(this.size)) {
        delete this.snapshots[key];
      }
    }
  };
  var PageView = class extends View {
    constructor() {
      super(...arguments);
      this.snapshotCache = new SnapshotCache(10);
      this.lastRenderedLocation = new URL(location.href);
      this.forceReloaded = false;
    }
    renderPage(snapshot, isPreview = false, willRender = true, visit2) {
      const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender);
      if (!renderer.shouldRender) {
        this.forceReloaded = true;
      } else {
        visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      }
      return this.render(renderer);
    }
    renderError(snapshot, visit2) {
      visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false);
      return this.render(renderer);
    }
    clearSnapshotCache() {
      this.snapshotCache.clear();
    }
    async cacheSnapshot() {
      if (this.shouldCacheSnapshot) {
        this.delegate.viewWillCacheSnapshot();
        const { snapshot, lastRenderedLocation: location2 } = this;
        await nextEventLoopTick();
        const cachedSnapshot = snapshot.clone();
        this.snapshotCache.put(location2, cachedSnapshot);
        return cachedSnapshot;
      }
    }
    getCachedSnapshotForLocation(location2) {
      return this.snapshotCache.get(location2);
    }
    get snapshot() {
      return PageSnapshot.fromElement(this.element);
    }
    get shouldCacheSnapshot() {
      return this.snapshot.isCacheable;
    }
  };
  var Preloader = class {
    constructor(delegate) {
      this.selector = "a[data-turbo-preload]";
      this.delegate = delegate;
    }
    get snapshotCache() {
      return this.delegate.navigator.view.snapshotCache;
    }
    start() {
      if (document.readyState === "loading") {
        return document.addEventListener("DOMContentLoaded", () => {
          this.preloadOnLoadLinksForView(document.body);
        });
      } else {
        this.preloadOnLoadLinksForView(document.body);
      }
    }
    preloadOnLoadLinksForView(element) {
      for (const link of element.querySelectorAll(this.selector)) {
        this.preloadURL(link);
      }
    }
    async preloadURL(link) {
      const location2 = new URL(link.href);
      if (this.snapshotCache.has(location2)) {
        return;
      }
      try {
        const response = await fetch(location2.toString(), { headers: { "VND.PREFETCH": "true", Accept: "text/html" } });
        const responseText = await response.text();
        const snapshot = PageSnapshot.fromHTMLString(responseText);
        this.snapshotCache.put(location2, snapshot);
      } catch (_2) {
      }
    }
  };
  var Session = class {
    constructor() {
      this.navigator = new Navigator(this);
      this.history = new History(this);
      this.preloader = new Preloader(this);
      this.view = new PageView(this, document.documentElement);
      this.adapter = new BrowserAdapter(this);
      this.pageObserver = new PageObserver(this);
      this.cacheObserver = new CacheObserver();
      this.linkClickObserver = new LinkClickObserver(this, window);
      this.formSubmitObserver = new FormSubmitObserver(this, document);
      this.scrollObserver = new ScrollObserver(this);
      this.streamObserver = new StreamObserver(this);
      this.formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement);
      this.frameRedirector = new FrameRedirector(this, document.documentElement);
      this.streamMessageRenderer = new StreamMessageRenderer();
      this.drive = true;
      this.enabled = true;
      this.progressBarDelay = 500;
      this.started = false;
      this.formMode = "on";
    }
    start() {
      if (!this.started) {
        this.pageObserver.start();
        this.cacheObserver.start();
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
        this.scrollObserver.start();
        this.streamObserver.start();
        this.frameRedirector.start();
        this.history.start();
        this.preloader.start();
        this.started = true;
        this.enabled = true;
      }
    }
    disable() {
      this.enabled = false;
    }
    stop() {
      if (this.started) {
        this.pageObserver.stop();
        this.cacheObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
        this.scrollObserver.stop();
        this.streamObserver.stop();
        this.frameRedirector.stop();
        this.history.stop();
        this.started = false;
      }
    }
    registerAdapter(adapter) {
      this.adapter = adapter;
    }
    visit(location2, options2 = {}) {
      const frameElement = options2.frame ? document.getElementById(options2.frame) : null;
      if (frameElement instanceof FrameElement) {
        frameElement.src = location2.toString();
        frameElement.loaded;
      } else {
        this.navigator.proposeVisit(expandURL(location2), options2);
      }
    }
    connectStreamSource(source) {
      this.streamObserver.connectStreamSource(source);
    }
    disconnectStreamSource(source) {
      this.streamObserver.disconnectStreamSource(source);
    }
    renderStreamMessage(message) {
      this.streamMessageRenderer.render(StreamMessage.wrap(message));
    }
    clearCache() {
      this.view.clearSnapshotCache();
    }
    setProgressBarDelay(delay) {
      this.progressBarDelay = delay;
    }
    setFormMode(mode) {
      this.formMode = mode;
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    historyPoppedToLocationWithRestorationIdentifier(location2, restorationIdentifier) {
      if (this.enabled) {
        this.navigator.startVisit(location2, restorationIdentifier, {
          action: "restore",
          historyChanged: true
        });
      } else {
        this.adapter.pageInvalidated({
          reason: "turbo_disabled"
        });
      }
    }
    scrollPositionChanged(position) {
      this.history.updateRestorationData({ scrollPosition: position });
    }
    willSubmitFormLinkToLocation(link, location2) {
      return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation);
    }
    submittedFormLinkToLocation() {
    }
    willFollowLinkToLocation(link, location2, event) {
      return this.elementIsNavigatable(link) && locationIsVisitable(location2, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link, location2, event);
    }
    followedLinkToLocation(link, location2) {
      const action = this.getActionForLink(link);
      const acceptsStreamResponse = link.hasAttribute("data-turbo-stream");
      this.visit(location2.href, { action, acceptsStreamResponse });
    }
    allowsVisitingLocationWithAction(location2, action) {
      return this.locationWithActionIsSamePage(location2, action) || this.applicationAllowsVisitingLocation(location2);
    }
    visitProposedToLocation(location2, options2) {
      extendURLWithDeprecatedProperties(location2);
      this.adapter.visitProposedToLocation(location2, options2);
    }
    visitStarted(visit2) {
      if (!visit2.acceptsStreamResponse) {
        markAsBusy(document.documentElement);
      }
      extendURLWithDeprecatedProperties(visit2.location);
      if (!visit2.silent) {
        this.notifyApplicationAfterVisitingLocation(visit2.location, visit2.action);
      }
    }
    visitCompleted(visit2) {
      clearBusyState(document.documentElement);
      this.notifyApplicationAfterPageLoad(visit2.getTimingMetrics());
    }
    locationWithActionIsSamePage(location2, action) {
      return this.navigator.locationWithActionIsSamePage(location2, action);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL);
    }
    willSubmitForm(form, submitter) {
      const action = getAction(form, submitter);
      return this.submissionIsNavigatable(form, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation);
    }
    formSubmitted(form, submitter) {
      this.navigator.submitForm(form, submitter);
    }
    pageBecameInteractive() {
      this.view.lastRenderedLocation = this.location;
      this.notifyApplicationAfterPageLoad();
    }
    pageLoaded() {
      this.history.assumeControlOfScrollRestoration();
    }
    pageWillUnload() {
      this.history.relinquishControlOfScrollRestoration();
    }
    receivedMessageFromStream(message) {
      this.renderStreamMessage(message);
    }
    viewWillCacheSnapshot() {
      var _a;
      if (!((_a = this.navigator.currentVisit) === null || _a === void 0 ? void 0 : _a.silent)) {
        this.notifyApplicationBeforeCachingSnapshot();
      }
    }
    allowsImmediateRender({ element }, options2) {
      const event = this.notifyApplicationBeforeRender(element, options2);
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
      this.view.lastRenderedLocation = this.history.location;
      this.notifyApplicationAfterRender();
    }
    preloadOnLoadLinksForView(element) {
      this.preloader.preloadOnLoadLinksForView(element);
    }
    viewInvalidated(reason) {
      this.adapter.pageInvalidated(reason);
    }
    frameLoaded(frame) {
      this.notifyApplicationAfterFrameLoad(frame);
    }
    frameRendered(fetchResponse, frame) {
      this.notifyApplicationAfterFrameRender(fetchResponse, frame);
    }
    applicationAllowsFollowingLinkToLocation(link, location2, ev) {
      const event = this.notifyApplicationAfterClickingLinkToLocation(link, location2, ev);
      return !event.defaultPrevented;
    }
    applicationAllowsVisitingLocation(location2) {
      const event = this.notifyApplicationBeforeVisitingLocation(location2);
      return !event.defaultPrevented;
    }
    notifyApplicationAfterClickingLinkToLocation(link, location2, event) {
      return dispatch("turbo:click", {
        target: link,
        detail: { url: location2.href, originalEvent: event },
        cancelable: true
      });
    }
    notifyApplicationBeforeVisitingLocation(location2) {
      return dispatch("turbo:before-visit", {
        detail: { url: location2.href },
        cancelable: true
      });
    }
    notifyApplicationAfterVisitingLocation(location2, action) {
      return dispatch("turbo:visit", { detail: { url: location2.href, action } });
    }
    notifyApplicationBeforeCachingSnapshot() {
      return dispatch("turbo:before-cache");
    }
    notifyApplicationBeforeRender(newBody, options2) {
      return dispatch("turbo:before-render", {
        detail: Object.assign({ newBody }, options2),
        cancelable: true
      });
    }
    notifyApplicationAfterRender() {
      return dispatch("turbo:render");
    }
    notifyApplicationAfterPageLoad(timing = {}) {
      return dispatch("turbo:load", {
        detail: { url: this.location.href, timing }
      });
    }
    notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL) {
      dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString()
      }));
    }
    notifyApplicationAfterFrameLoad(frame) {
      return dispatch("turbo:frame-load", { target: frame });
    }
    notifyApplicationAfterFrameRender(fetchResponse, frame) {
      return dispatch("turbo:frame-render", {
        detail: { fetchResponse },
        target: frame,
        cancelable: true
      });
    }
    submissionIsNavigatable(form, submitter) {
      if (this.formMode == "off") {
        return false;
      } else {
        const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true;
        if (this.formMode == "optin") {
          return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null;
        } else {
          return submitterIsNavigatable && this.elementIsNavigatable(form);
        }
      }
    }
    elementIsNavigatable(element) {
      const container = element.closest("[data-turbo]");
      const withinFrame = element.closest("turbo-frame");
      if (this.drive || withinFrame) {
        if (container) {
          return container.getAttribute("data-turbo") != "false";
        } else {
          return true;
        }
      } else {
        if (container) {
          return container.getAttribute("data-turbo") == "true";
        } else {
          return false;
        }
      }
    }
    getActionForLink(link) {
      const action = link.getAttribute("data-turbo-action");
      return isAction(action) ? action : "advance";
    }
    get snapshot() {
      return this.view.snapshot;
    }
  };
  function extendURLWithDeprecatedProperties(url) {
    Object.defineProperties(url, deprecatedLocationPropertyDescriptors);
  }
  var deprecatedLocationPropertyDescriptors = {
    absoluteURL: {
      get() {
        return this.toString();
      }
    }
  };
  var Cache = class {
    constructor(session2) {
      this.session = session2;
    }
    clear() {
      this.session.clearCache();
    }
    resetCacheControl() {
      this.setCacheControl("");
    }
    exemptPageFromCache() {
      this.setCacheControl("no-cache");
    }
    exemptPageFromPreview() {
      this.setCacheControl("no-preview");
    }
    setCacheControl(value) {
      setMetaContent("turbo-cache-control", value);
    }
  };
  var StreamActions = {
    after() {
      this.targetElements.forEach((e) => {
        var _a;
        return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e.nextSibling);
      });
    },
    append() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.append(this.templateContent));
    },
    before() {
      this.targetElements.forEach((e) => {
        var _a;
        return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e);
      });
    },
    prepend() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.prepend(this.templateContent));
    },
    remove() {
      this.targetElements.forEach((e) => e.remove());
    },
    replace() {
      this.targetElements.forEach((e) => e.replaceWith(this.templateContent));
    },
    update() {
      this.targetElements.forEach((e) => e.replaceChildren(this.templateContent));
    }
  };
  var session = new Session();
  var cache = new Cache(session);
  var { navigator: navigator$1 } = session;
  function start() {
    session.start();
  }
  function registerAdapter(adapter) {
    session.registerAdapter(adapter);
  }
  function visit(location2, options2) {
    session.visit(location2, options2);
  }
  function connectStreamSource(source) {
    session.connectStreamSource(source);
  }
  function disconnectStreamSource(source) {
    session.disconnectStreamSource(source);
  }
  function renderStreamMessage(message) {
    session.renderStreamMessage(message);
  }
  function clearCache() {
    console.warn("Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`");
    session.clearCache();
  }
  function setProgressBarDelay(delay) {
    session.setProgressBarDelay(delay);
  }
  function setConfirmMethod(confirmMethod) {
    FormSubmission.confirmMethod = confirmMethod;
  }
  function setFormMode(mode) {
    session.setFormMode(mode);
  }
  var Turbo2 = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    navigator: navigator$1,
    session,
    cache,
    PageRenderer,
    PageSnapshot,
    FrameRenderer,
    start,
    registerAdapter,
    visit,
    connectStreamSource,
    disconnectStreamSource,
    renderStreamMessage,
    clearCache,
    setProgressBarDelay,
    setConfirmMethod,
    setFormMode,
    StreamActions
  });
  var FrameController = class {
    constructor(element) {
      this.fetchResponseLoaded = (_fetchResponse) => {
      };
      this.currentFetchRequest = null;
      this.resolveVisitPromise = () => {
      };
      this.connected = false;
      this.hasBeenLoaded = false;
      this.ignoredAttributes = /* @__PURE__ */ new Set();
      this.action = null;
      this.visitCachedSnapshot = ({ element: element2 }) => {
        const frame = element2.querySelector("#" + this.element.id);
        if (frame && this.previousFrameElement) {
          frame.replaceChildren(...this.previousFrameElement.children);
        }
        delete this.previousFrameElement;
      };
      this.element = element;
      this.view = new FrameView(this, this.element);
      this.appearanceObserver = new AppearanceObserver(this, this.element);
      this.formLinkClickObserver = new FormLinkClickObserver(this, this.element);
      this.linkClickObserver = new LinkClickObserver(this, this.element);
      this.restorationIdentifier = uuid();
      this.formSubmitObserver = new FormSubmitObserver(this, this.element);
    }
    connect() {
      if (!this.connected) {
        this.connected = true;
        if (this.loadingStyle == FrameLoadingStyle.lazy) {
          this.appearanceObserver.start();
        } else {
          this.loadSourceURL();
        }
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
      }
    }
    disconnect() {
      if (this.connected) {
        this.connected = false;
        this.appearanceObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
      }
    }
    disabledChanged() {
      if (this.loadingStyle == FrameLoadingStyle.eager) {
        this.loadSourceURL();
      }
    }
    sourceURLChanged() {
      if (this.isIgnoringChangesTo("src"))
        return;
      if (this.element.isConnected) {
        this.complete = false;
      }
      if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
        this.loadSourceURL();
      }
    }
    completeChanged() {
      if (this.isIgnoringChangesTo("complete"))
        return;
      this.loadSourceURL();
    }
    loadingStyleChanged() {
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start();
      } else {
        this.appearanceObserver.stop();
        this.loadSourceURL();
      }
    }
    async loadSourceURL() {
      if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
        this.element.loaded = this.visit(expandURL(this.sourceURL));
        this.appearanceObserver.stop();
        await this.element.loaded;
        this.hasBeenLoaded = true;
      }
    }
    async loadResponse(fetchResponse) {
      if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
        this.sourceURL = fetchResponse.response.url;
      }
      try {
        const html2 = await fetchResponse.responseHTML;
        if (html2) {
          const { body } = parseHTMLDocument(html2);
          const newFrameElement = await this.extractForeignFrameElement(body);
          if (newFrameElement) {
            const snapshot = new Snapshot(newFrameElement);
            const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false);
            if (this.view.renderPromise)
              await this.view.renderPromise;
            this.changeHistory();
            await this.view.render(renderer);
            this.complete = true;
            session.frameRendered(fetchResponse, this.element);
            session.frameLoaded(this.element);
            this.fetchResponseLoaded(fetchResponse);
          } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
            console.warn(`A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`);
            this.visitResponse(fetchResponse.response);
          }
        }
      } catch (error2) {
        console.error(error2);
        this.view.invalidate();
      } finally {
        this.fetchResponseLoaded = () => {
        };
      }
    }
    elementAppearedInViewport(_element) {
      this.loadSourceURL();
    }
    willSubmitFormLinkToLocation(link) {
      return link.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(link);
    }
    submittedFormLinkToLocation(link, _location, form) {
      const frame = this.findFrameElement(link);
      if (frame)
        form.setAttribute("data-turbo-frame", frame.id);
    }
    willFollowLinkToLocation(element, location2, event) {
      return this.shouldInterceptNavigation(element) && this.frameAllowsVisitingLocation(element, location2, event);
    }
    followedLinkToLocation(element, location2) {
      this.navigateFrame(element, location2.href);
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(element, submitter);
    }
    formSubmitted(element, submitter) {
      if (this.formSubmission) {
        this.formSubmission.stop();
      }
      this.formSubmission = new FormSubmission(this, element, submitter);
      const { fetchRequest } = this.formSubmission;
      this.prepareHeadersForRequest(fetchRequest.headers, fetchRequest);
      this.formSubmission.start();
    }
    prepareHeadersForRequest(headers, request) {
      var _a;
      headers["Turbo-Frame"] = this.id;
      if ((_a = this.currentNavigationElement) === null || _a === void 0 ? void 0 : _a.hasAttribute("data-turbo-stream")) {
        request.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      markAsBusy(this.element);
    }
    requestPreventedHandlingResponse(_request, _response) {
      this.resolveVisitPromise();
    }
    async requestSucceededWithResponse(request, response) {
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    async requestFailedWithResponse(request, response) {
      console.error(response);
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    requestErrored(request, error2) {
      console.error(error2);
      this.resolveVisitPromise();
    }
    requestFinished(_request) {
      clearBusyState(this.element);
    }
    formSubmissionStarted({ formElement }) {
      markAsBusy(formElement, this.findFrameElement(formElement));
    }
    formSubmissionSucceededWithResponse(formSubmission, response) {
      const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter);
      this.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter);
      frame.delegate.loadResponse(response);
    }
    formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      this.element.delegate.loadResponse(fetchResponse);
    }
    formSubmissionErrored(formSubmission, error2) {
      console.error(error2);
    }
    formSubmissionFinished({ formElement }) {
      clearBusyState(formElement, this.findFrameElement(formElement));
    }
    allowsImmediateRender({ element: newFrame }, options2) {
      const event = dispatch("turbo:before-frame-render", {
        target: this.element,
        detail: Object.assign({ newFrame }, options2),
        cancelable: true
      });
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
    }
    preloadOnLoadLinksForView(element) {
      session.preloadOnLoadLinksForView(element);
    }
    viewInvalidated() {
    }
    willRenderFrame(currentElement, _newElement) {
      this.previousFrameElement = currentElement.cloneNode(true);
    }
    async visit(url) {
      var _a;
      const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element);
      (_a = this.currentFetchRequest) === null || _a === void 0 ? void 0 : _a.cancel();
      this.currentFetchRequest = request;
      return new Promise((resolve) => {
        this.resolveVisitPromise = () => {
          this.resolveVisitPromise = () => {
          };
          this.currentFetchRequest = null;
          resolve();
        };
        request.perform();
      });
    }
    navigateFrame(element, url, submitter) {
      const frame = this.findFrameElement(element, submitter);
      this.proposeVisitIfNavigatedWithAction(frame, element, submitter);
      this.withCurrentNavigationElement(element, () => {
        frame.src = url;
      });
    }
    proposeVisitIfNavigatedWithAction(frame, element, submitter) {
      this.action = getVisitAction(submitter, element, frame);
      this.frame = frame;
      if (isAction(this.action)) {
        const { visitCachedSnapshot } = frame.delegate;
        frame.delegate.fetchResponseLoaded = (fetchResponse) => {
          if (frame.src) {
            const { statusCode, redirected } = fetchResponse;
            const responseHTML = frame.ownerDocument.documentElement.outerHTML;
            const response = { statusCode, redirected, responseHTML };
            const options2 = {
              response,
              visitCachedSnapshot,
              willRender: false,
              updateHistory: false,
              restorationIdentifier: this.restorationIdentifier
            };
            if (this.action)
              options2.action = this.action;
            session.visit(frame.src, options2);
          }
        };
      }
    }
    changeHistory() {
      if (this.action && this.frame) {
        const method = getHistoryMethodForAction(this.action);
        session.history.update(method, expandURL(this.frame.src || ""), this.restorationIdentifier);
      }
    }
    willHandleFrameMissingFromResponse(fetchResponse) {
      this.element.setAttribute("complete", "");
      const response = fetchResponse.response;
      const visit2 = async (url, options2 = {}) => {
        if (url instanceof Response) {
          this.visitResponse(url);
        } else {
          session.visit(url, options2);
        }
      };
      const event = dispatch("turbo:frame-missing", {
        target: this.element,
        detail: { response, visit: visit2 },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    async visitResponse(response) {
      const wrapped = new FetchResponse(response);
      const responseHTML = await wrapped.responseHTML;
      const { location: location2, redirected, statusCode } = wrapped;
      return session.visit(location2, { response: { redirected, statusCode, responseHTML } });
    }
    findFrameElement(element, submitter) {
      var _a;
      const id2 = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      return (_a = getFrameElementById(id2)) !== null && _a !== void 0 ? _a : this.element;
    }
    async extractForeignFrameElement(container) {
      let element;
      const id2 = CSS.escape(this.id);
      try {
        element = activateElement(container.querySelector(`turbo-frame#${id2}`), this.sourceURL);
        if (element) {
          return element;
        }
        element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id2}]`), this.sourceURL);
        if (element) {
          await element.loaded;
          return await this.extractForeignFrameElement(element);
        }
      } catch (error2) {
        console.error(error2);
        return new FrameElement();
      }
      return null;
    }
    formActionIsVisitable(form, submitter) {
      const action = getAction(form, submitter);
      return locationIsVisitable(expandURL(action), this.rootLocation);
    }
    shouldInterceptNavigation(element, submitter) {
      const id2 = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
        return false;
      }
      if (!this.enabled || id2 == "_top") {
        return false;
      }
      if (id2) {
        const frameElement = getFrameElementById(id2);
        if (frameElement) {
          return !frameElement.disabled;
        }
      }
      if (!session.elementIsNavigatable(element)) {
        return false;
      }
      if (submitter && !session.elementIsNavigatable(submitter)) {
        return false;
      }
      return true;
    }
    get id() {
      return this.element.id;
    }
    get enabled() {
      return !this.element.disabled;
    }
    get sourceURL() {
      if (this.element.src) {
        return this.element.src;
      }
    }
    set sourceURL(sourceURL) {
      this.ignoringChangesToAttribute("src", () => {
        this.element.src = sourceURL !== null && sourceURL !== void 0 ? sourceURL : null;
      });
    }
    get loadingStyle() {
      return this.element.loading;
    }
    get isLoading() {
      return this.formSubmission !== void 0 || this.resolveVisitPromise() !== void 0;
    }
    get complete() {
      return this.element.hasAttribute("complete");
    }
    set complete(value) {
      this.ignoringChangesToAttribute("complete", () => {
        if (value) {
          this.element.setAttribute("complete", "");
        } else {
          this.element.removeAttribute("complete");
        }
      });
    }
    get isActive() {
      return this.element.isActive && this.connected;
    }
    get rootLocation() {
      var _a;
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const root = (_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : "/";
      return expandURL(root);
    }
    frameAllowsVisitingLocation(target, { href: url }, originalEvent) {
      const event = dispatch("turbo:click", {
        target,
        detail: { url, originalEvent },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    isIgnoringChangesTo(attributeName) {
      return this.ignoredAttributes.has(attributeName);
    }
    ignoringChangesToAttribute(attributeName, callback) {
      this.ignoredAttributes.add(attributeName);
      callback();
      this.ignoredAttributes.delete(attributeName);
    }
    withCurrentNavigationElement(element, callback) {
      this.currentNavigationElement = element;
      callback();
      delete this.currentNavigationElement;
    }
  };
  function getFrameElementById(id2) {
    if (id2 != null) {
      const element = document.getElementById(id2);
      if (element instanceof FrameElement) {
        return element;
      }
    }
  }
  function activateElement(element, currentURL) {
    if (element) {
      const src = element.getAttribute("src");
      if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
        throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`);
      }
      if (element.ownerDocument !== document) {
        element = document.importNode(element, true);
      }
      if (element instanceof FrameElement) {
        element.connectedCallback();
        element.disconnectedCallback();
        return element;
      }
    }
  }
  var StreamElement = class extends HTMLElement {
    static async renderElement(newElement) {
      await newElement.performAction();
    }
    async connectedCallback() {
      try {
        await this.render();
      } catch (error2) {
        console.error(error2);
      } finally {
        this.disconnect();
      }
    }
    async render() {
      var _a;
      return (_a = this.renderPromise) !== null && _a !== void 0 ? _a : this.renderPromise = (async () => {
        const event = this.beforeRenderEvent;
        if (this.dispatchEvent(event)) {
          await nextAnimationFrame();
          await event.detail.render(this);
        }
      })();
    }
    disconnect() {
      try {
        this.remove();
      } catch (_a) {
      }
    }
    removeDuplicateTargetChildren() {
      this.duplicateChildren.forEach((c) => c.remove());
    }
    get duplicateChildren() {
      var _a;
      const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.id);
      const newChildrenIds = [...((_a = this.templateContent) === null || _a === void 0 ? void 0 : _a.children) || []].filter((c) => !!c.id).map((c) => c.id);
      return existingChildren.filter((c) => newChildrenIds.includes(c.id));
    }
    get performAction() {
      if (this.action) {
        const actionFunction = StreamActions[this.action];
        if (actionFunction) {
          return actionFunction;
        }
        this.raise("unknown action");
      }
      this.raise("action attribute is missing");
    }
    get targetElements() {
      if (this.target) {
        return this.targetElementsById;
      } else if (this.targets) {
        return this.targetElementsByQuery;
      } else {
        this.raise("target or targets attribute is missing");
      }
    }
    get templateContent() {
      return this.templateElement.content.cloneNode(true);
    }
    get templateElement() {
      if (this.firstElementChild === null) {
        const template = this.ownerDocument.createElement("template");
        this.appendChild(template);
        return template;
      } else if (this.firstElementChild instanceof HTMLTemplateElement) {
        return this.firstElementChild;
      }
      this.raise("first child element must be a <template> element");
    }
    get action() {
      return this.getAttribute("action");
    }
    get target() {
      return this.getAttribute("target");
    }
    get targets() {
      return this.getAttribute("targets");
    }
    raise(message) {
      throw new Error(`${this.description}: ${message}`);
    }
    get description() {
      var _a, _b;
      return (_b = ((_a = this.outerHTML.match(/<[^>]+>/)) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
    }
    get beforeRenderEvent() {
      return new CustomEvent("turbo:before-stream-render", {
        bubbles: true,
        cancelable: true,
        detail: { newStream: this, render: StreamElement.renderElement }
      });
    }
    get targetElementsById() {
      var _a;
      const element = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.getElementById(this.target);
      if (element !== null) {
        return [element];
      } else {
        return [];
      }
    }
    get targetElementsByQuery() {
      var _a;
      const elements = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.querySelectorAll(this.targets);
      if (elements.length !== 0) {
        return Array.prototype.slice.call(elements);
      } else {
        return [];
      }
    }
  };
  var StreamSourceElement = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this.streamSource = null;
    }
    connectedCallback() {
      this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src);
      connectStreamSource(this.streamSource);
    }
    disconnectedCallback() {
      if (this.streamSource) {
        disconnectStreamSource(this.streamSource);
      }
    }
    get src() {
      return this.getAttribute("src") || "";
    }
  };
  FrameElement.delegateConstructor = FrameController;
  if (customElements.get("turbo-frame") === void 0) {
    customElements.define("turbo-frame", FrameElement);
  }
  if (customElements.get("turbo-stream") === void 0) {
    customElements.define("turbo-stream", StreamElement);
  }
  if (customElements.get("turbo-stream-source") === void 0) {
    customElements.define("turbo-stream-source", StreamSourceElement);
  }
  (() => {
    let element = document.currentScript;
    if (!element)
      return;
    if (element.hasAttribute("data-turbo-suppress-warning"))
      return;
    element = element.parentElement;
    while (element) {
      if (element == document.body) {
        return console.warn(unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `, element.outerHTML);
      }
      element = element.parentElement;
    }
  })();
  window.Turbo = Turbo2;
  start();

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable.js
  var consumer;
  async function getConsumer() {
    return consumer || setConsumer(createConsumer2().then(setConsumer));
  }
  function setConsumer(newConsumer) {
    return consumer = newConsumer;
  }
  async function createConsumer2() {
    const { createConsumer: createConsumer3 } = await Promise.resolve().then(() => (init_src(), src_exports));
    return createConsumer3();
  }
  async function subscribeTo(channel, mixin) {
    const { subscriptions } = await getConsumer();
    return subscriptions.create(channel, mixin);
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/snakeize.js
  function walk(obj) {
    if (!obj || typeof obj !== "object")
      return obj;
    if (obj instanceof Date || obj instanceof RegExp)
      return obj;
    if (Array.isArray(obj))
      return obj.map(walk);
    return Object.keys(obj).reduce(function(acc, key) {
      var camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function(m, x) {
        return "_" + x.toLowerCase();
      });
      acc[camel] = walk(obj[key]);
      return acc;
    }, {});
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable_stream_source_element.js
  var TurboCableStreamSourceElement = class extends HTMLElement {
    async connectedCallback() {
      connectStreamSource(this);
      this.subscription = await subscribeTo(this.channel, { received: this.dispatchMessageEvent.bind(this) });
    }
    disconnectedCallback() {
      disconnectStreamSource(this);
      if (this.subscription)
        this.subscription.unsubscribe();
    }
    dispatchMessageEvent(data) {
      const event = new MessageEvent("message", { data });
      return this.dispatchEvent(event);
    }
    get channel() {
      const channel = this.getAttribute("channel");
      const signed_stream_name = this.getAttribute("signed-stream-name");
      return { channel, signed_stream_name, ...walk({ ...this.dataset }) };
    }
  };
  customElements.define("turbo-cable-stream-source", TurboCableStreamSourceElement);

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/fetch_requests.js
  function encodeMethodIntoRequestBody(event) {
    if (event.target instanceof HTMLFormElement) {
      const { target: form, detail: { fetchOptions } } = event;
      form.addEventListener("turbo:submit-start", ({ detail: { formSubmission: { submitter } } }) => {
        const method = submitter && submitter.formMethod || fetchOptions.body && fetchOptions.body.get("_method") || form.getAttribute("method");
        if (!/get/i.test(method)) {
          if (/post/i.test(method)) {
            fetchOptions.body.delete("_method");
          } else {
            fetchOptions.body.set("_method", method);
          }
          fetchOptions.method = "post";
        }
      }, { once: true });
    }
  }

  // node_modules/@hotwired/turbo-rails/app/javascript/turbo/index.js
  addEventListener("turbo:before-fetch-request", encodeMethodIntoRequestBody);

  // node_modules/@hotwired/stimulus/dist/stimulus.js
  var EventListener = class {
    constructor(eventTarget, eventName, eventOptions) {
      this.eventTarget = eventTarget;
      this.eventName = eventName;
      this.eventOptions = eventOptions;
      this.unorderedBindings = /* @__PURE__ */ new Set();
    }
    connect() {
      this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
    }
    disconnect() {
      this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
    }
    bindingConnected(binding) {
      this.unorderedBindings.add(binding);
    }
    bindingDisconnected(binding) {
      this.unorderedBindings.delete(binding);
    }
    handleEvent(event) {
      const extendedEvent = extendEvent(event);
      for (const binding of this.bindings) {
        if (extendedEvent.immediatePropagationStopped) {
          break;
        } else {
          binding.handleEvent(extendedEvent);
        }
      }
    }
    get bindings() {
      return Array.from(this.unorderedBindings).sort((left2, right2) => {
        const leftIndex = left2.index, rightIndex = right2.index;
        return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
      });
    }
  };
  function extendEvent(event) {
    if ("immediatePropagationStopped" in event) {
      return event;
    } else {
      const { stopImmediatePropagation } = event;
      return Object.assign(event, {
        immediatePropagationStopped: false,
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
          stopImmediatePropagation.call(this);
        }
      });
    }
  }
  var Dispatcher = class {
    constructor(application2) {
      this.application = application2;
      this.eventListenerMaps = /* @__PURE__ */ new Map();
      this.started = false;
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.eventListeners.forEach((eventListener) => eventListener.connect());
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.eventListeners.forEach((eventListener) => eventListener.disconnect());
      }
    }
    get eventListeners() {
      return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
    }
    bindingConnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingConnected(binding);
    }
    bindingDisconnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
    }
    handleError(error2, message, detail = {}) {
      this.application.handleError(error2, `Error ${message}`, detail);
    }
    fetchEventListenerForBinding(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      return this.fetchEventListener(eventTarget, eventName, eventOptions);
    }
    fetchEventListener(eventTarget, eventName, eventOptions) {
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      let eventListener = eventListenerMap.get(cacheKey);
      if (!eventListener) {
        eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
        eventListenerMap.set(cacheKey, eventListener);
      }
      return eventListener;
    }
    createEventListener(eventTarget, eventName, eventOptions) {
      const eventListener = new EventListener(eventTarget, eventName, eventOptions);
      if (this.started) {
        eventListener.connect();
      }
      return eventListener;
    }
    fetchEventListenerMapForEventTarget(eventTarget) {
      let eventListenerMap = this.eventListenerMaps.get(eventTarget);
      if (!eventListenerMap) {
        eventListenerMap = /* @__PURE__ */ new Map();
        this.eventListenerMaps.set(eventTarget, eventListenerMap);
      }
      return eventListenerMap;
    }
    cacheKey(eventName, eventOptions) {
      const parts = [eventName];
      Object.keys(eventOptions).sort().forEach((key) => {
        parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
      });
      return parts.join(":");
    }
  };
  var descriptorPattern = /^((.+?)(@(window|document))?->)?(.+?)(#([^:]+?))(:(.+))?$/;
  function parseActionDescriptorString(descriptorString) {
    const source = descriptorString.trim();
    const matches = source.match(descriptorPattern) || [];
    return {
      eventTarget: parseEventTarget(matches[4]),
      eventName: matches[2],
      eventOptions: matches[9] ? parseEventOptions(matches[9]) : {},
      identifier: matches[5],
      methodName: matches[7]
    };
  }
  function parseEventTarget(eventTargetName) {
    if (eventTargetName == "window") {
      return window;
    } else if (eventTargetName == "document") {
      return document;
    }
  }
  function parseEventOptions(eventOptions) {
    return eventOptions.split(":").reduce((options2, token) => Object.assign(options2, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
  }
  function stringifyEventTarget(eventTarget) {
    if (eventTarget == window) {
      return "window";
    } else if (eventTarget == document) {
      return "document";
    }
  }
  function camelize(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_2, char) => char.toUpperCase());
  }
  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize(value) {
    return value.replace(/([A-Z])/g, (_2, char) => `-${char.toLowerCase()}`);
  }
  function tokenize(value) {
    return value.match(/[^\s]+/g) || [];
  }
  var Action = class {
    constructor(element, index, descriptor) {
      this.element = element;
      this.index = index;
      this.eventTarget = descriptor.eventTarget || element;
      this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
      this.eventOptions = descriptor.eventOptions || {};
      this.identifier = descriptor.identifier || error("missing identifier");
      this.methodName = descriptor.methodName || error("missing method name");
    }
    static forToken(token) {
      return new this(token.element, token.index, parseActionDescriptorString(token.content));
    }
    toString() {
      const eventNameSuffix = this.eventTargetName ? `@${this.eventTargetName}` : "";
      return `${this.eventName}${eventNameSuffix}->${this.identifier}#${this.methodName}`;
    }
    get params() {
      const params = {};
      const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`);
      for (const { name, value } of Array.from(this.element.attributes)) {
        const match2 = name.match(pattern);
        const key = match2 && match2[1];
        if (key) {
          params[camelize(key)] = typecast(value);
        }
      }
      return params;
    }
    get eventTargetName() {
      return stringifyEventTarget(this.eventTarget);
    }
  };
  var defaultEventNames = {
    "a": (e) => "click",
    "button": (e) => "click",
    "form": (e) => "submit",
    "details": (e) => "toggle",
    "input": (e) => e.getAttribute("type") == "submit" ? "click" : "input",
    "select": (e) => "change",
    "textarea": (e) => "input"
  };
  function getDefaultEventNameForElement(element) {
    const tagName2 = element.tagName.toLowerCase();
    if (tagName2 in defaultEventNames) {
      return defaultEventNames[tagName2](element);
    }
  }
  function error(message) {
    throw new Error(message);
  }
  function typecast(value) {
    try {
      return JSON.parse(value);
    } catch (o_O) {
      return value;
    }
  }
  var Binding = class {
    constructor(context, action) {
      this.context = context;
      this.action = action;
    }
    get index() {
      return this.action.index;
    }
    get eventTarget() {
      return this.action.eventTarget;
    }
    get eventOptions() {
      return this.action.eventOptions;
    }
    get identifier() {
      return this.context.identifier;
    }
    handleEvent(event) {
      if (this.willBeInvokedByEvent(event) && this.shouldBeInvokedPerSelf(event)) {
        this.processStopPropagation(event);
        this.processPreventDefault(event);
        this.invokeWithEvent(event);
      }
    }
    get eventName() {
      return this.action.eventName;
    }
    get method() {
      const method = this.controller[this.methodName];
      if (typeof method == "function") {
        return method;
      }
      throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
    }
    processStopPropagation(event) {
      if (this.eventOptions.stop) {
        event.stopPropagation();
      }
    }
    processPreventDefault(event) {
      if (this.eventOptions.prevent) {
        event.preventDefault();
      }
    }
    invokeWithEvent(event) {
      const { target, currentTarget } = event;
      try {
        const { params } = this.action;
        const actionEvent = Object.assign(event, { params });
        this.method.call(this.controller, actionEvent);
        this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
      } catch (error2) {
        const { identifier, controller, element, index } = this;
        const detail = { identifier, controller, element, index, event };
        this.context.handleError(error2, `invoking action "${this.action}"`, detail);
      }
    }
    shouldBeInvokedPerSelf(event) {
      if (this.action.eventOptions.self === true) {
        return this.action.element === event.target;
      } else {
        return true;
      }
    }
    willBeInvokedByEvent(event) {
      const eventTarget = event.target;
      if (this.element === eventTarget) {
        return true;
      } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
        return this.scope.containsElement(eventTarget);
      } else {
        return this.scope.containsElement(this.action.element);
      }
    }
    get controller() {
      return this.context.controller;
    }
    get methodName() {
      return this.action.methodName;
    }
    get element() {
      return this.scope.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var ElementObserver = class {
    constructor(element, delegate) {
      this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
      this.element = element;
      this.started = false;
      this.delegate = delegate;
      this.elements = /* @__PURE__ */ new Set();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.refresh();
      }
    }
    pause(callback) {
      if (this.started) {
        this.mutationObserver.disconnect();
        this.started = false;
      }
      callback();
      if (!this.started) {
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        const matches = new Set(this.matchElementsInTree());
        for (const element of Array.from(this.elements)) {
          if (!matches.has(element)) {
            this.removeElement(element);
          }
        }
        for (const element of Array.from(matches)) {
          this.addElement(element);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      if (mutation.type == "attributes") {
        this.processAttributeChange(mutation.target, mutation.attributeName);
      } else if (mutation.type == "childList") {
        this.processRemovedNodes(mutation.removedNodes);
        this.processAddedNodes(mutation.addedNodes);
      }
    }
    processAttributeChange(node, attributeName) {
      const element = node;
      if (this.elements.has(element)) {
        if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
          this.delegate.elementAttributeChanged(element, attributeName);
        } else {
          this.removeElement(element);
        }
      } else if (this.matchElement(element)) {
        this.addElement(element);
      }
    }
    processRemovedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element) {
          this.processTree(element, this.removeElement);
        }
      }
    }
    processAddedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element && this.elementIsActive(element)) {
          this.processTree(element, this.addElement);
        }
      }
    }
    matchElement(element) {
      return this.delegate.matchElement(element);
    }
    matchElementsInTree(tree = this.element) {
      return this.delegate.matchElementsInTree(tree);
    }
    processTree(tree, processor) {
      for (const element of this.matchElementsInTree(tree)) {
        processor.call(this, element);
      }
    }
    elementFromNode(node) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        return node;
      }
    }
    elementIsActive(element) {
      if (element.isConnected != this.element.isConnected) {
        return false;
      } else {
        return this.element.contains(element);
      }
    }
    addElement(element) {
      if (!this.elements.has(element)) {
        if (this.elementIsActive(element)) {
          this.elements.add(element);
          if (this.delegate.elementMatched) {
            this.delegate.elementMatched(element);
          }
        }
      }
    }
    removeElement(element) {
      if (this.elements.has(element)) {
        this.elements.delete(element);
        if (this.delegate.elementUnmatched) {
          this.delegate.elementUnmatched(element);
        }
      }
    }
  };
  var AttributeObserver = class {
    constructor(element, attributeName, delegate) {
      this.attributeName = attributeName;
      this.delegate = delegate;
      this.elementObserver = new ElementObserver(element, this);
    }
    get element() {
      return this.elementObserver.element;
    }
    get selector() {
      return `[${this.attributeName}]`;
    }
    start() {
      this.elementObserver.start();
    }
    pause(callback) {
      this.elementObserver.pause(callback);
    }
    stop() {
      this.elementObserver.stop();
    }
    refresh() {
      this.elementObserver.refresh();
    }
    get started() {
      return this.elementObserver.started;
    }
    matchElement(element) {
      return element.hasAttribute(this.attributeName);
    }
    matchElementsInTree(tree) {
      const match2 = this.matchElement(tree) ? [tree] : [];
      const matches = Array.from(tree.querySelectorAll(this.selector));
      return match2.concat(matches);
    }
    elementMatched(element) {
      if (this.delegate.elementMatchedAttribute) {
        this.delegate.elementMatchedAttribute(element, this.attributeName);
      }
    }
    elementUnmatched(element) {
      if (this.delegate.elementUnmatchedAttribute) {
        this.delegate.elementUnmatchedAttribute(element, this.attributeName);
      }
    }
    elementAttributeChanged(element, attributeName) {
      if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
        this.delegate.elementAttributeValueChanged(element, attributeName);
      }
    }
  };
  var StringMapObserver = class {
    constructor(element, delegate) {
      this.element = element;
      this.delegate = delegate;
      this.started = false;
      this.stringMap = /* @__PURE__ */ new Map();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
        this.refresh();
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        for (const attributeName of this.knownAttributeNames) {
          this.refreshAttribute(attributeName, null);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      const attributeName = mutation.attributeName;
      if (attributeName) {
        this.refreshAttribute(attributeName, mutation.oldValue);
      }
    }
    refreshAttribute(attributeName, oldValue) {
      const key = this.delegate.getStringMapKeyForAttribute(attributeName);
      if (key != null) {
        if (!this.stringMap.has(attributeName)) {
          this.stringMapKeyAdded(key, attributeName);
        }
        const value = this.element.getAttribute(attributeName);
        if (this.stringMap.get(attributeName) != value) {
          this.stringMapValueChanged(value, key, oldValue);
        }
        if (value == null) {
          const oldValue2 = this.stringMap.get(attributeName);
          this.stringMap.delete(attributeName);
          if (oldValue2)
            this.stringMapKeyRemoved(key, attributeName, oldValue2);
        } else {
          this.stringMap.set(attributeName, value);
        }
      }
    }
    stringMapKeyAdded(key, attributeName) {
      if (this.delegate.stringMapKeyAdded) {
        this.delegate.stringMapKeyAdded(key, attributeName);
      }
    }
    stringMapValueChanged(value, key, oldValue) {
      if (this.delegate.stringMapValueChanged) {
        this.delegate.stringMapValueChanged(value, key, oldValue);
      }
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      if (this.delegate.stringMapKeyRemoved) {
        this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
      }
    }
    get knownAttributeNames() {
      return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
    }
    get currentAttributeNames() {
      return Array.from(this.element.attributes).map((attribute) => attribute.name);
    }
    get recordedAttributeNames() {
      return Array.from(this.stringMap.keys());
    }
  };
  function add(map, key, value) {
    fetch2(map, key).add(value);
  }
  function del(map, key, value) {
    fetch2(map, key).delete(value);
    prune(map, key);
  }
  function fetch2(map, key) {
    let values = map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      map.set(key, values);
    }
    return values;
  }
  function prune(map, key) {
    const values = map.get(key);
    if (values != null && values.size == 0) {
      map.delete(key);
    }
  }
  var Multimap = class {
    constructor() {
      this.valuesByKey = /* @__PURE__ */ new Map();
    }
    get keys() {
      return Array.from(this.valuesByKey.keys());
    }
    get values() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((values, set) => values.concat(Array.from(set)), []);
    }
    get size() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((size, set) => size + set.size, 0);
    }
    add(key, value) {
      add(this.valuesByKey, key, value);
    }
    delete(key, value) {
      del(this.valuesByKey, key, value);
    }
    has(key, value) {
      const values = this.valuesByKey.get(key);
      return values != null && values.has(value);
    }
    hasKey(key) {
      return this.valuesByKey.has(key);
    }
    hasValue(value) {
      const sets = Array.from(this.valuesByKey.values());
      return sets.some((set) => set.has(value));
    }
    getValuesForKey(key) {
      const values = this.valuesByKey.get(key);
      return values ? Array.from(values) : [];
    }
    getKeysForValue(value) {
      return Array.from(this.valuesByKey).filter(([key, values]) => values.has(value)).map(([key, values]) => key);
    }
  };
  var TokenListObserver = class {
    constructor(element, attributeName, delegate) {
      this.attributeObserver = new AttributeObserver(element, attributeName, this);
      this.delegate = delegate;
      this.tokensByElement = new Multimap();
    }
    get started() {
      return this.attributeObserver.started;
    }
    start() {
      this.attributeObserver.start();
    }
    pause(callback) {
      this.attributeObserver.pause(callback);
    }
    stop() {
      this.attributeObserver.stop();
    }
    refresh() {
      this.attributeObserver.refresh();
    }
    get element() {
      return this.attributeObserver.element;
    }
    get attributeName() {
      return this.attributeObserver.attributeName;
    }
    elementMatchedAttribute(element) {
      this.tokensMatched(this.readTokensForElement(element));
    }
    elementAttributeValueChanged(element) {
      const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
      this.tokensUnmatched(unmatchedTokens);
      this.tokensMatched(matchedTokens);
    }
    elementUnmatchedAttribute(element) {
      this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
    }
    tokensMatched(tokens) {
      tokens.forEach((token) => this.tokenMatched(token));
    }
    tokensUnmatched(tokens) {
      tokens.forEach((token) => this.tokenUnmatched(token));
    }
    tokenMatched(token) {
      this.delegate.tokenMatched(token);
      this.tokensByElement.add(token.element, token);
    }
    tokenUnmatched(token) {
      this.delegate.tokenUnmatched(token);
      this.tokensByElement.delete(token.element, token);
    }
    refreshTokensForElement(element) {
      const previousTokens = this.tokensByElement.getValuesForKey(element);
      const currentTokens = this.readTokensForElement(element);
      const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
      if (firstDifferingIndex == -1) {
        return [[], []];
      } else {
        return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
      }
    }
    readTokensForElement(element) {
      const attributeName = this.attributeName;
      const tokenString = element.getAttribute(attributeName) || "";
      return parseTokenString(tokenString, element, attributeName);
    }
  };
  function parseTokenString(tokenString, element, attributeName) {
    return tokenString.trim().split(/\s+/).filter((content) => content.length).map((content, index) => ({ element, attributeName, content, index }));
  }
  function zip(left2, right2) {
    const length = Math.max(left2.length, right2.length);
    return Array.from({ length }, (_2, index) => [left2[index], right2[index]]);
  }
  function tokensAreEqual(left2, right2) {
    return left2 && right2 && left2.index == right2.index && left2.content == right2.content;
  }
  var ValueListObserver = class {
    constructor(element, attributeName, delegate) {
      this.tokenListObserver = new TokenListObserver(element, attributeName, this);
      this.delegate = delegate;
      this.parseResultsByToken = /* @__PURE__ */ new WeakMap();
      this.valuesByTokenByElement = /* @__PURE__ */ new WeakMap();
    }
    get started() {
      return this.tokenListObserver.started;
    }
    start() {
      this.tokenListObserver.start();
    }
    stop() {
      this.tokenListObserver.stop();
    }
    refresh() {
      this.tokenListObserver.refresh();
    }
    get element() {
      return this.tokenListObserver.element;
    }
    get attributeName() {
      return this.tokenListObserver.attributeName;
    }
    tokenMatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).set(token, value);
        this.delegate.elementMatchedValue(element, value);
      }
    }
    tokenUnmatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).delete(token);
        this.delegate.elementUnmatchedValue(element, value);
      }
    }
    fetchParseResultForToken(token) {
      let parseResult = this.parseResultsByToken.get(token);
      if (!parseResult) {
        parseResult = this.parseToken(token);
        this.parseResultsByToken.set(token, parseResult);
      }
      return parseResult;
    }
    fetchValuesByTokenForElement(element) {
      let valuesByToken = this.valuesByTokenByElement.get(element);
      if (!valuesByToken) {
        valuesByToken = /* @__PURE__ */ new Map();
        this.valuesByTokenByElement.set(element, valuesByToken);
      }
      return valuesByToken;
    }
    parseToken(token) {
      try {
        const value = this.delegate.parseValueForToken(token);
        return { value };
      } catch (error2) {
        return { error: error2 };
      }
    }
  };
  var BindingObserver = class {
    constructor(context, delegate) {
      this.context = context;
      this.delegate = delegate;
      this.bindingsByAction = /* @__PURE__ */ new Map();
    }
    start() {
      if (!this.valueListObserver) {
        this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
        this.valueListObserver.start();
      }
    }
    stop() {
      if (this.valueListObserver) {
        this.valueListObserver.stop();
        delete this.valueListObserver;
        this.disconnectAllActions();
      }
    }
    get element() {
      return this.context.element;
    }
    get identifier() {
      return this.context.identifier;
    }
    get actionAttribute() {
      return this.schema.actionAttribute;
    }
    get schema() {
      return this.context.schema;
    }
    get bindings() {
      return Array.from(this.bindingsByAction.values());
    }
    connectAction(action) {
      const binding = new Binding(this.context, action);
      this.bindingsByAction.set(action, binding);
      this.delegate.bindingConnected(binding);
    }
    disconnectAction(action) {
      const binding = this.bindingsByAction.get(action);
      if (binding) {
        this.bindingsByAction.delete(action);
        this.delegate.bindingDisconnected(binding);
      }
    }
    disconnectAllActions() {
      this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding));
      this.bindingsByAction.clear();
    }
    parseValueForToken(token) {
      const action = Action.forToken(token);
      if (action.identifier == this.identifier) {
        return action;
      }
    }
    elementMatchedValue(element, action) {
      this.connectAction(action);
    }
    elementUnmatchedValue(element, action) {
      this.disconnectAction(action);
    }
  };
  var ValueObserver = class {
    constructor(context, receiver) {
      this.context = context;
      this.receiver = receiver;
      this.stringMapObserver = new StringMapObserver(this.element, this);
      this.valueDescriptorMap = this.controller.valueDescriptorMap;
    }
    start() {
      this.stringMapObserver.start();
      this.invokeChangedCallbacksForDefaultValues();
    }
    stop() {
      this.stringMapObserver.stop();
    }
    get element() {
      return this.context.element;
    }
    get controller() {
      return this.context.controller;
    }
    getStringMapKeyForAttribute(attributeName) {
      if (attributeName in this.valueDescriptorMap) {
        return this.valueDescriptorMap[attributeName].name;
      }
    }
    stringMapKeyAdded(key, attributeName) {
      const descriptor = this.valueDescriptorMap[attributeName];
      if (!this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
      }
    }
    stringMapValueChanged(value, name, oldValue) {
      const descriptor = this.valueDescriptorNameMap[name];
      if (value === null)
        return;
      if (oldValue === null) {
        oldValue = descriptor.writer(descriptor.defaultValue);
      }
      this.invokeChangedCallback(name, value, oldValue);
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      const descriptor = this.valueDescriptorNameMap[key];
      if (this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
      } else {
        this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
      }
    }
    invokeChangedCallbacksForDefaultValues() {
      for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
        if (defaultValue != void 0 && !this.controller.data.has(key)) {
          this.invokeChangedCallback(name, writer(defaultValue), void 0);
        }
      }
    }
    invokeChangedCallback(name, rawValue, rawOldValue) {
      const changedMethodName = `${name}Changed`;
      const changedMethod = this.receiver[changedMethodName];
      if (typeof changedMethod == "function") {
        const descriptor = this.valueDescriptorNameMap[name];
        try {
          const value = descriptor.reader(rawValue);
          let oldValue = rawOldValue;
          if (rawOldValue) {
            oldValue = descriptor.reader(rawOldValue);
          }
          changedMethod.call(this.receiver, value, oldValue);
        } catch (error2) {
          if (!(error2 instanceof TypeError))
            throw error2;
          throw new TypeError(`Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error2.message}`);
        }
      }
    }
    get valueDescriptors() {
      const { valueDescriptorMap } = this;
      return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
    }
    get valueDescriptorNameMap() {
      const descriptors = {};
      Object.keys(this.valueDescriptorMap).forEach((key) => {
        const descriptor = this.valueDescriptorMap[key];
        descriptors[descriptor.name] = descriptor;
      });
      return descriptors;
    }
    hasValue(attributeName) {
      const descriptor = this.valueDescriptorNameMap[attributeName];
      const hasMethodName = `has${capitalize(descriptor.name)}`;
      return this.receiver[hasMethodName];
    }
  };
  var TargetObserver = class {
    constructor(context, delegate) {
      this.context = context;
      this.delegate = delegate;
      this.targetsByName = new Multimap();
    }
    start() {
      if (!this.tokenListObserver) {
        this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
        this.tokenListObserver.start();
      }
    }
    stop() {
      if (this.tokenListObserver) {
        this.disconnectAllTargets();
        this.tokenListObserver.stop();
        delete this.tokenListObserver;
      }
    }
    tokenMatched({ element, content: name }) {
      if (this.scope.containsElement(element)) {
        this.connectTarget(element, name);
      }
    }
    tokenUnmatched({ element, content: name }) {
      this.disconnectTarget(element, name);
    }
    connectTarget(element, name) {
      var _a;
      if (!this.targetsByName.has(name, element)) {
        this.targetsByName.add(name, element);
        (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name));
      }
    }
    disconnectTarget(element, name) {
      var _a;
      if (this.targetsByName.has(name, element)) {
        this.targetsByName.delete(name, element);
        (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name));
      }
    }
    disconnectAllTargets() {
      for (const name of this.targetsByName.keys) {
        for (const element of this.targetsByName.getValuesForKey(name)) {
          this.disconnectTarget(element, name);
        }
      }
    }
    get attributeName() {
      return `data-${this.context.identifier}-target`;
    }
    get element() {
      return this.context.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var Context = class {
    constructor(module, scope) {
      this.logDebugActivity = (functionName, detail = {}) => {
        const { identifier, controller, element } = this;
        detail = Object.assign({ identifier, controller, element }, detail);
        this.application.logDebugActivity(this.identifier, functionName, detail);
      };
      this.module = module;
      this.scope = scope;
      this.controller = new module.controllerConstructor(this);
      this.bindingObserver = new BindingObserver(this, this.dispatcher);
      this.valueObserver = new ValueObserver(this, this.controller);
      this.targetObserver = new TargetObserver(this, this);
      try {
        this.controller.initialize();
        this.logDebugActivity("initialize");
      } catch (error2) {
        this.handleError(error2, "initializing controller");
      }
    }
    connect() {
      this.bindingObserver.start();
      this.valueObserver.start();
      this.targetObserver.start();
      try {
        this.controller.connect();
        this.logDebugActivity("connect");
      } catch (error2) {
        this.handleError(error2, "connecting controller");
      }
    }
    disconnect() {
      try {
        this.controller.disconnect();
        this.logDebugActivity("disconnect");
      } catch (error2) {
        this.handleError(error2, "disconnecting controller");
      }
      this.targetObserver.stop();
      this.valueObserver.stop();
      this.bindingObserver.stop();
    }
    get application() {
      return this.module.application;
    }
    get identifier() {
      return this.module.identifier;
    }
    get schema() {
      return this.application.schema;
    }
    get dispatcher() {
      return this.application.dispatcher;
    }
    get element() {
      return this.scope.element;
    }
    get parentElement() {
      return this.element.parentElement;
    }
    handleError(error2, message, detail = {}) {
      const { identifier, controller, element } = this;
      detail = Object.assign({ identifier, controller, element }, detail);
      this.application.handleError(error2, `Error ${message}`, detail);
    }
    targetConnected(element, name) {
      this.invokeControllerMethod(`${name}TargetConnected`, element);
    }
    targetDisconnected(element, name) {
      this.invokeControllerMethod(`${name}TargetDisconnected`, element);
    }
    invokeControllerMethod(methodName, ...args) {
      const controller = this.controller;
      if (typeof controller[methodName] == "function") {
        controller[methodName](...args);
      }
    }
  };
  function readInheritableStaticArrayValues(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  function bless(constructor) {
    return shadow(constructor, getBlessedProperties(constructor));
  }
  function shadow(constructor, properties) {
    const shadowConstructor = extend2(constructor);
    const shadowProperties = getShadowProperties(constructor.prototype, properties);
    Object.defineProperties(shadowConstructor.prototype, shadowProperties);
    return shadowConstructor;
  }
  function getBlessedProperties(constructor) {
    const blessings = readInheritableStaticArrayValues(constructor, "blessings");
    return blessings.reduce((blessedProperties, blessing) => {
      const properties = blessing(constructor);
      for (const key in properties) {
        const descriptor = blessedProperties[key] || {};
        blessedProperties[key] = Object.assign(descriptor, properties[key]);
      }
      return blessedProperties;
    }, {});
  }
  function getShadowProperties(prototype, properties) {
    return getOwnKeys(properties).reduce((shadowProperties, key) => {
      const descriptor = getShadowedDescriptor(prototype, properties, key);
      if (descriptor) {
        Object.assign(shadowProperties, { [key]: descriptor });
      }
      return shadowProperties;
    }, {});
  }
  function getShadowedDescriptor(prototype, properties, key) {
    const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
    const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
    if (!shadowedByValue) {
      const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
      if (shadowingDescriptor) {
        descriptor.get = shadowingDescriptor.get || descriptor.get;
        descriptor.set = shadowingDescriptor.set || descriptor.set;
      }
      return descriptor;
    }
  }
  var getOwnKeys = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object2) => [
        ...Object.getOwnPropertyNames(object2),
        ...Object.getOwnPropertySymbols(object2)
      ];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend2 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error2) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function blessDefinition(definition) {
    return {
      identifier: definition.identifier,
      controllerConstructor: bless(definition.controllerConstructor)
    };
  }
  var Module = class {
    constructor(application2, definition) {
      this.application = application2;
      this.definition = blessDefinition(definition);
      this.contextsByScope = /* @__PURE__ */ new WeakMap();
      this.connectedContexts = /* @__PURE__ */ new Set();
    }
    get identifier() {
      return this.definition.identifier;
    }
    get controllerConstructor() {
      return this.definition.controllerConstructor;
    }
    get contexts() {
      return Array.from(this.connectedContexts);
    }
    connectContextForScope(scope) {
      const context = this.fetchContextForScope(scope);
      this.connectedContexts.add(context);
      context.connect();
    }
    disconnectContextForScope(scope) {
      const context = this.contextsByScope.get(scope);
      if (context) {
        this.connectedContexts.delete(context);
        context.disconnect();
      }
    }
    fetchContextForScope(scope) {
      let context = this.contextsByScope.get(scope);
      if (!context) {
        context = new Context(this, scope);
        this.contextsByScope.set(scope, context);
      }
      return context;
    }
  };
  var ClassMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    has(name) {
      return this.data.has(this.getDataKey(name));
    }
    get(name) {
      return this.getAll(name)[0];
    }
    getAll(name) {
      const tokenString = this.data.get(this.getDataKey(name)) || "";
      return tokenize(tokenString);
    }
    getAttributeName(name) {
      return this.data.getAttributeNameForKey(this.getDataKey(name));
    }
    getDataKey(name) {
      return `${name}-class`;
    }
    get data() {
      return this.scope.data;
    }
  };
  var DataMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.getAttribute(name);
    }
    set(key, value) {
      const name = this.getAttributeNameForKey(key);
      this.element.setAttribute(name, value);
      return this.get(key);
    }
    has(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.hasAttribute(name);
    }
    delete(key) {
      if (this.has(key)) {
        const name = this.getAttributeNameForKey(key);
        this.element.removeAttribute(name);
        return true;
      } else {
        return false;
      }
    }
    getAttributeNameForKey(key) {
      return `data-${this.identifier}-${dasherize(key)}`;
    }
  };
  var Guide = class {
    constructor(logger) {
      this.warnedKeysByObject = /* @__PURE__ */ new WeakMap();
      this.logger = logger;
    }
    warn(object2, key, message) {
      let warnedKeys = this.warnedKeysByObject.get(object2);
      if (!warnedKeys) {
        warnedKeys = /* @__PURE__ */ new Set();
        this.warnedKeysByObject.set(object2, warnedKeys);
      }
      if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        this.logger.warn(message, object2);
      }
    }
  };
  function attributeValueContainsToken(attributeName, token) {
    return `[${attributeName}~="${token}"]`;
  }
  var TargetSet = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get schema() {
      return this.scope.schema;
    }
    has(targetName) {
      return this.find(targetName) != null;
    }
    find(...targetNames) {
      return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), void 0);
    }
    findAll(...targetNames) {
      return targetNames.reduce((targets, targetName) => [
        ...targets,
        ...this.findAllTargets(targetName),
        ...this.findAllLegacyTargets(targetName)
      ], []);
    }
    findTarget(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findElement(selector);
    }
    findAllTargets(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findAllElements(selector);
    }
    getSelectorForTargetName(targetName) {
      const attributeName = this.schema.targetAttributeForScope(this.identifier);
      return attributeValueContainsToken(attributeName, targetName);
    }
    findLegacyTarget(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.deprecate(this.scope.findElement(selector), targetName);
    }
    findAllLegacyTargets(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
    }
    getLegacySelectorForTargetName(targetName) {
      const targetDescriptor = `${this.identifier}.${targetName}`;
      return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
    }
    deprecate(element, targetName) {
      if (element) {
        const { identifier } = this;
        const attributeName = this.schema.targetAttribute;
        const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
        this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
      }
      return element;
    }
    get guide() {
      return this.scope.guide;
    }
  };
  var Scope = class {
    constructor(schema, element, identifier, logger) {
      this.targets = new TargetSet(this);
      this.classes = new ClassMap(this);
      this.data = new DataMap(this);
      this.containsElement = (element2) => {
        return element2.closest(this.controllerSelector) === this.element;
      };
      this.schema = schema;
      this.element = element;
      this.identifier = identifier;
      this.guide = new Guide(logger);
    }
    findElement(selector) {
      return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
    }
    findAllElements(selector) {
      return [
        ...this.element.matches(selector) ? [this.element] : [],
        ...this.queryElements(selector).filter(this.containsElement)
      ];
    }
    queryElements(selector) {
      return Array.from(this.element.querySelectorAll(selector));
    }
    get controllerSelector() {
      return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
    }
  };
  var ScopeObserver = class {
    constructor(element, schema, delegate) {
      this.element = element;
      this.schema = schema;
      this.delegate = delegate;
      this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
      this.scopesByIdentifierByElement = /* @__PURE__ */ new WeakMap();
      this.scopeReferenceCounts = /* @__PURE__ */ new WeakMap();
    }
    start() {
      this.valueListObserver.start();
    }
    stop() {
      this.valueListObserver.stop();
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    parseValueForToken(token) {
      const { element, content: identifier } = token;
      const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
      let scope = scopesByIdentifier.get(identifier);
      if (!scope) {
        scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
        scopesByIdentifier.set(identifier, scope);
      }
      return scope;
    }
    elementMatchedValue(element, value) {
      const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
      this.scopeReferenceCounts.set(value, referenceCount);
      if (referenceCount == 1) {
        this.delegate.scopeConnected(value);
      }
    }
    elementUnmatchedValue(element, value) {
      const referenceCount = this.scopeReferenceCounts.get(value);
      if (referenceCount) {
        this.scopeReferenceCounts.set(value, referenceCount - 1);
        if (referenceCount == 1) {
          this.delegate.scopeDisconnected(value);
        }
      }
    }
    fetchScopesByIdentifierForElement(element) {
      let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
      if (!scopesByIdentifier) {
        scopesByIdentifier = /* @__PURE__ */ new Map();
        this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
      }
      return scopesByIdentifier;
    }
  };
  var Router = class {
    constructor(application2) {
      this.application = application2;
      this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
      this.scopesByIdentifier = new Multimap();
      this.modulesByIdentifier = /* @__PURE__ */ new Map();
    }
    get element() {
      return this.application.element;
    }
    get schema() {
      return this.application.schema;
    }
    get logger() {
      return this.application.logger;
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    get modules() {
      return Array.from(this.modulesByIdentifier.values());
    }
    get contexts() {
      return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
    }
    start() {
      this.scopeObserver.start();
    }
    stop() {
      this.scopeObserver.stop();
    }
    loadDefinition(definition) {
      this.unloadIdentifier(definition.identifier);
      const module = new Module(this.application, definition);
      this.connectModule(module);
    }
    unloadIdentifier(identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        this.disconnectModule(module);
      }
    }
    getContextForElementAndIdentifier(element, identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        return module.contexts.find((context) => context.element == element);
      }
    }
    handleError(error2, message, detail) {
      this.application.handleError(error2, message, detail);
    }
    createScopeForElementAndIdentifier(element, identifier) {
      return new Scope(this.schema, element, identifier, this.logger);
    }
    scopeConnected(scope) {
      this.scopesByIdentifier.add(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.connectContextForScope(scope);
      }
    }
    scopeDisconnected(scope) {
      this.scopesByIdentifier.delete(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.disconnectContextForScope(scope);
      }
    }
    connectModule(module) {
      this.modulesByIdentifier.set(module.identifier, module);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.connectContextForScope(scope));
    }
    disconnectModule(module) {
      this.modulesByIdentifier.delete(module.identifier);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.disconnectContextForScope(scope));
    }
  };
  var defaultSchema = {
    controllerAttribute: "data-controller",
    actionAttribute: "data-action",
    targetAttribute: "data-target",
    targetAttributeForScope: (identifier) => `data-${identifier}-target`
  };
  var Application = class {
    constructor(element = document.documentElement, schema = defaultSchema) {
      this.logger = console;
      this.debug = false;
      this.logDebugActivity = (identifier, functionName, detail = {}) => {
        if (this.debug) {
          this.logFormattedMessage(identifier, functionName, detail);
        }
      };
      this.element = element;
      this.schema = schema;
      this.dispatcher = new Dispatcher(this);
      this.router = new Router(this);
    }
    static start(element, schema) {
      const application2 = new Application(element, schema);
      application2.start();
      return application2;
    }
    async start() {
      await domReady();
      this.logDebugActivity("application", "starting");
      this.dispatcher.start();
      this.router.start();
      this.logDebugActivity("application", "start");
    }
    stop() {
      this.logDebugActivity("application", "stopping");
      this.dispatcher.stop();
      this.router.stop();
      this.logDebugActivity("application", "stop");
    }
    register(identifier, controllerConstructor) {
      this.load({ identifier, controllerConstructor });
    }
    load(head, ...rest) {
      const definitions = Array.isArray(head) ? head : [head, ...rest];
      definitions.forEach((definition) => {
        if (definition.controllerConstructor.shouldLoad) {
          this.router.loadDefinition(definition);
        }
      });
    }
    unload(head, ...rest) {
      const identifiers = Array.isArray(head) ? head : [head, ...rest];
      identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
    }
    get controllers() {
      return this.router.contexts.map((context) => context.controller);
    }
    getControllerForElementAndIdentifier(element, identifier) {
      const context = this.router.getContextForElementAndIdentifier(element, identifier);
      return context ? context.controller : null;
    }
    handleError(error2, message, detail) {
      var _a;
      this.logger.error(`%s

%o

%o`, message, error2, detail);
      (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, "", 0, 0, error2);
    }
    logFormattedMessage(identifier, functionName, detail = {}) {
      detail = Object.assign({ application: this }, detail);
      this.logger.groupCollapsed(`${identifier} #${functionName}`);
      this.logger.log("details:", Object.assign({}, detail));
      this.logger.groupEnd();
    }
  };
  function domReady() {
    return new Promise((resolve) => {
      if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", () => resolve());
      } else {
        resolve();
      }
    });
  }
  function ClassPropertiesBlessing(constructor) {
    const classes = readInheritableStaticArrayValues(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function TargetPropertiesBlessing(constructor) {
    const targets = readInheritableStaticArrayValues(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
    const { key, name, reader: read2, writer: write2 } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read2(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write2(value));
          }
        }
      },
      [`has${capitalize(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject(payload) {
    const typeFromObject = parseValueTypeConstant(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition(payload) {
    const typeFromObject = parseValueTypeObject({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition(typeDefinition) {
    const constant = parseValueTypeConstant(typeDefinition);
    if (constant)
      return defaultValuesByType[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition(payload) {
    const key = `${dasherize(payload.token)}-value`;
    const type = parseValueTypeDefinition(payload);
    return {
      type,
      key,
      name: camelize(key),
      get defaultValue() {
        return defaultValueForDefinition(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault(payload.typeDefinition) !== void 0;
      },
      reader: readers[type],
      writer: writers[type] || writers.default
    };
  }
  var defaultValuesByType = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object2 = JSON.parse(value);
      if (object2 === null || typeof object2 != "object" || Array.isArray(object2)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object2)}"`);
      }
      return object2;
    },
    string(value) {
      return value;
    }
  };
  var writers = {
    default: writeString,
    array: writeJSON,
    object: writeJSON
  };
  function writeJSON(value) {
    return JSON.stringify(value);
  }
  function writeString(value) {
    return `${value}`;
  }
  var Controller = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix ? `${prefix}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller.blessings = [ClassPropertiesBlessing, TargetPropertiesBlessing, ValuePropertiesBlessing];
  Controller.targets = [];
  Controller.values = {};

  // app/javascript/controllers/application.js
  var application = Application.start();
  application.debug = false;
  window.Stimulus = application;

  // app/javascript/controllers/hello_controller.js
  var hello_controller_default = class extends Controller {
    connect() {
      this.element.textContent = "Hello World!";
    }
  };

  // app/javascript/controllers/search_active_controller.js
  var search_active_controller_default = class extends Controller {
    connect() {
      this.element.setAttribute("data-action", "click->search-active#clicked");
    }
    clicked() {
      let links = document.querySelectorAll("#results a.active");
      console.log(links);
      Array.from(links).forEach((link) => {
        link.classList.remove("active");
      });
      this.element.classList.add("active");
    }
  };

  // app/javascript/controllers/search_controller.js
  var search_controller_default = class extends Controller {
    connect() {
      this.element.setAttribute("data-action", "keyup->search#search");
    }
    search() {
      let params = new URLSearchParams();
      params.append("query", this.element.value);
      fetch(`/?${params}`, {
        method: "GET",
        headers: {
          Accept: "text/vnd.turbo-stream.html"
        }
      }).then((r) => r.text()).then((html2) => Turbo.renderStreamMessage(html2));
    }
  };

  // app/javascript/controllers/index.js
  application.register("hello", hello_controller_default);
  application.register("search-active", search_active_controller_default);
  application.register("search", search_controller_default);

  // node_modules/@popperjs/core/lib/index.js
  var lib_exports = {};
  __export(lib_exports, {
    afterMain: () => afterMain,
    afterRead: () => afterRead,
    afterWrite: () => afterWrite,
    applyStyles: () => applyStyles_default,
    arrow: () => arrow_default,
    auto: () => auto,
    basePlacements: () => basePlacements,
    beforeMain: () => beforeMain,
    beforeRead: () => beforeRead,
    beforeWrite: () => beforeWrite,
    bottom: () => bottom,
    clippingParents: () => clippingParents,
    computeStyles: () => computeStyles_default,
    createPopper: () => createPopper3,
    createPopperBase: () => createPopper,
    createPopperLite: () => createPopper2,
    detectOverflow: () => detectOverflow,
    end: () => end,
    eventListeners: () => eventListeners_default,
    flip: () => flip_default,
    hide: () => hide_default,
    left: () => left,
    main: () => main,
    modifierPhases: () => modifierPhases,
    offset: () => offset_default,
    placements: () => placements,
    popper: () => popper,
    popperGenerator: () => popperGenerator,
    popperOffsets: () => popperOffsets_default,
    preventOverflow: () => preventOverflow_default,
    read: () => read,
    reference: () => reference,
    right: () => right,
    start: () => start2,
    top: () => top,
    variationPlacements: () => variationPlacements,
    viewport: () => viewport,
    write: () => write
  });

  // node_modules/@popperjs/core/lib/enums.js
  var top = "top";
  var bottom = "bottom";
  var right = "right";
  var left = "left";
  var auto = "auto";
  var basePlacements = [top, bottom, right, left];
  var start2 = "start";
  var end = "end";
  var clippingParents = "clippingParents";
  var viewport = "viewport";
  var popper = "popper";
  var reference = "reference";
  var variationPlacements = /* @__PURE__ */ basePlacements.reduce(function(acc, placement) {
    return acc.concat([placement + "-" + start2, placement + "-" + end]);
  }, []);
  var placements = /* @__PURE__ */ [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
    return acc.concat([placement, placement + "-" + start2, placement + "-" + end]);
  }, []);
  var beforeRead = "beforeRead";
  var read = "read";
  var afterRead = "afterRead";
  var beforeMain = "beforeMain";
  var main = "main";
  var afterMain = "afterMain";
  var beforeWrite = "beforeWrite";
  var write = "write";
  var afterWrite = "afterWrite";
  var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

  // node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
  function getNodeName(element) {
    return element ? (element.nodeName || "").toLowerCase() : null;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindow.js
  function getWindow(node) {
    if (node == null) {
      return window;
    }
    if (node.toString() !== "[object Window]") {
      var ownerDocument = node.ownerDocument;
      return ownerDocument ? ownerDocument.defaultView || window : window;
    }
    return node;
  }

  // node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
  function isElement(node) {
    var OwnElement = getWindow(node).Element;
    return node instanceof OwnElement || node instanceof Element;
  }
  function isHTMLElement(node) {
    var OwnElement = getWindow(node).HTMLElement;
    return node instanceof OwnElement || node instanceof HTMLElement;
  }
  function isShadowRoot(node) {
    if (typeof ShadowRoot === "undefined") {
      return false;
    }
    var OwnElement = getWindow(node).ShadowRoot;
    return node instanceof OwnElement || node instanceof ShadowRoot;
  }

  // node_modules/@popperjs/core/lib/modifiers/applyStyles.js
  function applyStyles(_ref) {
    var state = _ref.state;
    Object.keys(state.elements).forEach(function(name) {
      var style = state.styles[name] || {};
      var attributes2 = state.attributes[name] || {};
      var element = state.elements[name];
      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      }
      Object.assign(element.style, style);
      Object.keys(attributes2).forEach(function(name2) {
        var value = attributes2[name2];
        if (value === false) {
          element.removeAttribute(name2);
        } else {
          element.setAttribute(name2, value === true ? "" : value);
        }
      });
    });
  }
  function effect(_ref2) {
    var state = _ref2.state;
    var initialStyles = {
      popper: {
        position: state.options.strategy,
        left: "0",
        top: "0",
        margin: "0"
      },
      arrow: {
        position: "absolute"
      },
      reference: {}
    };
    Object.assign(state.elements.popper.style, initialStyles.popper);
    state.styles = initialStyles;
    if (state.elements.arrow) {
      Object.assign(state.elements.arrow.style, initialStyles.arrow);
    }
    return function() {
      Object.keys(state.elements).forEach(function(name) {
        var element = state.elements[name];
        var attributes2 = state.attributes[name] || {};
        var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]);
        var style = styleProperties.reduce(function(style2, property) {
          style2[property] = "";
          return style2;
        }, {});
        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        }
        Object.assign(element.style, style);
        Object.keys(attributes2).forEach(function(attribute) {
          element.removeAttribute(attribute);
        });
      });
    };
  }
  var applyStyles_default = {
    name: "applyStyles",
    enabled: true,
    phase: "write",
    fn: applyStyles,
    effect,
    requires: ["computeStyles"]
  };

  // node_modules/@popperjs/core/lib/utils/getBasePlacement.js
  function getBasePlacement(placement) {
    return placement.split("-")[0];
  }

  // node_modules/@popperjs/core/lib/utils/math.js
  var max = Math.max;
  var min = Math.min;
  var round = Math.round;

  // node_modules/@popperjs/core/lib/utils/userAgent.js
  function getUAString() {
    var uaData = navigator.userAgentData;
    if (uaData != null && uaData.brands) {
      return uaData.brands.map(function(item) {
        return item.brand + "/" + item.version;
      }).join(" ");
    }
    return navigator.userAgent;
  }

  // node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
  function isLayoutViewport() {
    return !/^((?!chrome|android).)*safari/i.test(getUAString());
  }

  // node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
  function getBoundingClientRect(element, includeScale, isFixedStrategy) {
    if (includeScale === void 0) {
      includeScale = false;
    }
    if (isFixedStrategy === void 0) {
      isFixedStrategy = false;
    }
    var clientRect = element.getBoundingClientRect();
    var scaleX = 1;
    var scaleY = 1;
    if (includeScale && isHTMLElement(element)) {
      scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
      scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
    }
    var _ref = isElement(element) ? getWindow(element) : window, visualViewport = _ref.visualViewport;
    var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
    var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
    var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
    var width = clientRect.width / scaleX;
    var height = clientRect.height / scaleY;
    return {
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
      x,
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
  function getLayoutRect(element) {
    var clientRect = getBoundingClientRect(element);
    var width = element.offsetWidth;
    var height = element.offsetHeight;
    if (Math.abs(clientRect.width - width) <= 1) {
      width = clientRect.width;
    }
    if (Math.abs(clientRect.height - height) <= 1) {
      height = clientRect.height;
    }
    return {
      x: element.offsetLeft,
      y: element.offsetTop,
      width,
      height
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/contains.js
  function contains(parent, child) {
    var rootNode = child.getRootNode && child.getRootNode();
    if (parent.contains(child)) {
      return true;
    } else if (rootNode && isShadowRoot(rootNode)) {
      var next = child;
      do {
        if (next && parent.isSameNode(next)) {
          return true;
        }
        next = next.parentNode || next.host;
      } while (next);
    }
    return false;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
  function getComputedStyle2(element) {
    return getWindow(element).getComputedStyle(element);
  }

  // node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
  function isTableElement(element) {
    return ["table", "td", "th"].indexOf(getNodeName(element)) >= 0;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
  function getDocumentElement(element) {
    return ((isElement(element) ? element.ownerDocument : element.document) || window.document).documentElement;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
  function getParentNode(element) {
    if (getNodeName(element) === "html") {
      return element;
    }
    return element.assignedSlot || element.parentNode || (isShadowRoot(element) ? element.host : null) || getDocumentElement(element);
  }

  // node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
  function getTrueOffsetParent(element) {
    if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
      return null;
    }
    return element.offsetParent;
  }
  function getContainingBlock(element) {
    var isFirefox = /firefox/i.test(getUAString());
    var isIE = /Trident/i.test(getUAString());
    if (isIE && isHTMLElement(element)) {
      var elementCss = getComputedStyle2(element);
      if (elementCss.position === "fixed") {
        return null;
      }
    }
    var currentNode = getParentNode(element);
    if (isShadowRoot(currentNode)) {
      currentNode = currentNode.host;
    }
    while (isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0) {
      var css2 = getComputedStyle2(currentNode);
      if (css2.transform !== "none" || css2.perspective !== "none" || css2.contain === "paint" || ["transform", "perspective"].indexOf(css2.willChange) !== -1 || isFirefox && css2.willChange === "filter" || isFirefox && css2.filter && css2.filter !== "none") {
        return currentNode;
      } else {
        currentNode = currentNode.parentNode;
      }
    }
    return null;
  }
  function getOffsetParent(element) {
    var window2 = getWindow(element);
    var offsetParent = getTrueOffsetParent(element);
    while (offsetParent && isTableElement(offsetParent) && getComputedStyle2(offsetParent).position === "static") {
      offsetParent = getTrueOffsetParent(offsetParent);
    }
    if (offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle2(offsetParent).position === "static")) {
      return window2;
    }
    return offsetParent || getContainingBlock(element) || window2;
  }

  // node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
  function getMainAxisFromPlacement(placement) {
    return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
  }

  // node_modules/@popperjs/core/lib/utils/within.js
  function within(min2, value, max2) {
    return max(min2, min(value, max2));
  }
  function withinMaxClamp(min2, value, max2) {
    var v = within(min2, value, max2);
    return v > max2 ? max2 : v;
  }

  // node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
  function getFreshSideObject() {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  }

  // node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
  function mergePaddingObject(paddingObject) {
    return Object.assign({}, getFreshSideObject(), paddingObject);
  }

  // node_modules/@popperjs/core/lib/utils/expandToHashMap.js
  function expandToHashMap(value, keys) {
    return keys.reduce(function(hashMap, key) {
      hashMap[key] = value;
      return hashMap;
    }, {});
  }

  // node_modules/@popperjs/core/lib/modifiers/arrow.js
  var toPaddingObject = function toPaddingObject2(padding, state) {
    padding = typeof padding === "function" ? padding(Object.assign({}, state.rects, {
      placement: state.placement
    })) : padding;
    return mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
  };
  function arrow(_ref) {
    var _state$modifiersData$;
    var state = _ref.state, name = _ref.name, options2 = _ref.options;
    var arrowElement = state.elements.arrow;
    var popperOffsets2 = state.modifiersData.popperOffsets;
    var basePlacement = getBasePlacement(state.placement);
    var axis = getMainAxisFromPlacement(basePlacement);
    var isVertical = [left, right].indexOf(basePlacement) >= 0;
    var len = isVertical ? "height" : "width";
    if (!arrowElement || !popperOffsets2) {
      return;
    }
    var paddingObject = toPaddingObject(options2.padding, state);
    var arrowRect = getLayoutRect(arrowElement);
    var minProp = axis === "y" ? top : left;
    var maxProp = axis === "y" ? bottom : right;
    var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets2[axis] - state.rects.popper[len];
    var startDiff = popperOffsets2[axis] - state.rects.reference[axis];
    var arrowOffsetParent = getOffsetParent(arrowElement);
    var clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
    var centerToReference = endDiff / 2 - startDiff / 2;
    var min2 = paddingObject[minProp];
    var max2 = clientSize - arrowRect[len] - paddingObject[maxProp];
    var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
    var offset2 = within(min2, center, max2);
    var axisProp = axis;
    state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset2, _state$modifiersData$.centerOffset = offset2 - center, _state$modifiersData$);
  }
  function effect2(_ref2) {
    var state = _ref2.state, options2 = _ref2.options;
    var _options$element = options2.element, arrowElement = _options$element === void 0 ? "[data-popper-arrow]" : _options$element;
    if (arrowElement == null) {
      return;
    }
    if (typeof arrowElement === "string") {
      arrowElement = state.elements.popper.querySelector(arrowElement);
      if (!arrowElement) {
        return;
      }
    }
    if (true) {
      if (!isHTMLElement(arrowElement)) {
        console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', "To use an SVG arrow, wrap it in an HTMLElement that will be used as", "the arrow."].join(" "));
      }
    }
    if (!contains(state.elements.popper, arrowElement)) {
      if (true) {
        console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', "element."].join(" "));
      }
      return;
    }
    state.elements.arrow = arrowElement;
  }
  var arrow_default = {
    name: "arrow",
    enabled: true,
    phase: "main",
    fn: arrow,
    effect: effect2,
    requires: ["popperOffsets"],
    requiresIfExists: ["preventOverflow"]
  };

  // node_modules/@popperjs/core/lib/utils/getVariation.js
  function getVariation(placement) {
    return placement.split("-")[1];
  }

  // node_modules/@popperjs/core/lib/modifiers/computeStyles.js
  var unsetSides = {
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto"
  };
  function roundOffsetsByDPR(_ref) {
    var x = _ref.x, y = _ref.y;
    var win = window;
    var dpr = win.devicePixelRatio || 1;
    return {
      x: round(x * dpr) / dpr || 0,
      y: round(y * dpr) / dpr || 0
    };
  }
  function mapToStyles(_ref2) {
    var _Object$assign2;
    var popper2 = _ref2.popper, popperRect = _ref2.popperRect, placement = _ref2.placement, variation = _ref2.variation, offsets = _ref2.offsets, position = _ref2.position, gpuAcceleration = _ref2.gpuAcceleration, adaptive = _ref2.adaptive, roundOffsets = _ref2.roundOffsets, isFixed = _ref2.isFixed;
    var _offsets$x = offsets.x, x = _offsets$x === void 0 ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === void 0 ? 0 : _offsets$y;
    var _ref3 = typeof roundOffsets === "function" ? roundOffsets({
      x,
      y
    }) : {
      x,
      y
    };
    x = _ref3.x;
    y = _ref3.y;
    var hasX = offsets.hasOwnProperty("x");
    var hasY = offsets.hasOwnProperty("y");
    var sideX = left;
    var sideY = top;
    var win = window;
    if (adaptive) {
      var offsetParent = getOffsetParent(popper2);
      var heightProp = "clientHeight";
      var widthProp = "clientWidth";
      if (offsetParent === getWindow(popper2)) {
        offsetParent = getDocumentElement(popper2);
        if (getComputedStyle2(offsetParent).position !== "static" && position === "absolute") {
          heightProp = "scrollHeight";
          widthProp = "scrollWidth";
        }
      }
      offsetParent = offsetParent;
      if (placement === top || (placement === left || placement === right) && variation === end) {
        sideY = bottom;
        var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : offsetParent[heightProp];
        y -= offsetY - popperRect.height;
        y *= gpuAcceleration ? 1 : -1;
      }
      if (placement === left || (placement === top || placement === bottom) && variation === end) {
        sideX = right;
        var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : offsetParent[widthProp];
        x -= offsetX - popperRect.width;
        x *= gpuAcceleration ? 1 : -1;
      }
    }
    var commonStyles = Object.assign({
      position
    }, adaptive && unsetSides);
    var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
      x,
      y
    }) : {
      x,
      y
    };
    x = _ref4.x;
    y = _ref4.y;
    if (gpuAcceleration) {
      var _Object$assign;
      return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
    }
    return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
  }
  function computeStyles(_ref5) {
    var state = _ref5.state, options2 = _ref5.options;
    var _options$gpuAccelerat = options2.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat, _options$adaptive = options2.adaptive, adaptive = _options$adaptive === void 0 ? true : _options$adaptive, _options$roundOffsets = options2.roundOffsets, roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;
    if (true) {
      var transitionProperty = getComputedStyle2(state.elements.popper).transitionProperty || "";
      if (adaptive && ["transform", "top", "right", "bottom", "left"].some(function(property) {
        return transitionProperty.indexOf(property) >= 0;
      })) {
        console.warn(["Popper: Detected CSS transitions on at least one of the following", 'CSS properties: "transform", "top", "right", "bottom", "left".', "\n\n", 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', "for smooth transitions, or remove these properties from the CSS", "transition declaration on the popper element if only transitioning", "opacity or background-color for example.", "\n\n", "We recommend using the popper element as a wrapper around an inner", "element that can have any CSS property transitioned for animations."].join(" "));
      }
    }
    var commonStyles = {
      placement: getBasePlacement(state.placement),
      variation: getVariation(state.placement),
      popper: state.elements.popper,
      popperRect: state.rects.popper,
      gpuAcceleration,
      isFixed: state.options.strategy === "fixed"
    };
    if (state.modifiersData.popperOffsets != null) {
      state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.popperOffsets,
        position: state.options.strategy,
        adaptive,
        roundOffsets
      })));
    }
    if (state.modifiersData.arrow != null) {
      state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.arrow,
        position: "absolute",
        adaptive: false,
        roundOffsets
      })));
    }
    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      "data-popper-placement": state.placement
    });
  }
  var computeStyles_default = {
    name: "computeStyles",
    enabled: true,
    phase: "beforeWrite",
    fn: computeStyles,
    data: {}
  };

  // node_modules/@popperjs/core/lib/modifiers/eventListeners.js
  var passive = {
    passive: true
  };
  function effect3(_ref) {
    var state = _ref.state, instance = _ref.instance, options2 = _ref.options;
    var _options$scroll = options2.scroll, scroll = _options$scroll === void 0 ? true : _options$scroll, _options$resize = options2.resize, resize = _options$resize === void 0 ? true : _options$resize;
    var window2 = getWindow(state.elements.popper);
    var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
    if (scroll) {
      scrollParents.forEach(function(scrollParent) {
        scrollParent.addEventListener("scroll", instance.update, passive);
      });
    }
    if (resize) {
      window2.addEventListener("resize", instance.update, passive);
    }
    return function() {
      if (scroll) {
        scrollParents.forEach(function(scrollParent) {
          scrollParent.removeEventListener("scroll", instance.update, passive);
        });
      }
      if (resize) {
        window2.removeEventListener("resize", instance.update, passive);
      }
    };
  }
  var eventListeners_default = {
    name: "eventListeners",
    enabled: true,
    phase: "write",
    fn: function fn() {
    },
    effect: effect3,
    data: {}
  };

  // node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
  var hash = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
  };
  function getOppositePlacement(placement) {
    return placement.replace(/left|right|bottom|top/g, function(matched) {
      return hash[matched];
    });
  }

  // node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
  var hash2 = {
    start: "end",
    end: "start"
  };
  function getOppositeVariationPlacement(placement) {
    return placement.replace(/start|end/g, function(matched) {
      return hash2[matched];
    });
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
  function getWindowScroll(node) {
    var win = getWindow(node);
    var scrollLeft = win.pageXOffset;
    var scrollTop = win.pageYOffset;
    return {
      scrollLeft,
      scrollTop
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
  function getWindowScrollBarX(element) {
    return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
  function getViewportRect(element, strategy) {
    var win = getWindow(element);
    var html2 = getDocumentElement(element);
    var visualViewport = win.visualViewport;
    var width = html2.clientWidth;
    var height = html2.clientHeight;
    var x = 0;
    var y = 0;
    if (visualViewport) {
      width = visualViewport.width;
      height = visualViewport.height;
      var layoutViewport = isLayoutViewport();
      if (layoutViewport || !layoutViewport && strategy === "fixed") {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }
    return {
      width,
      height,
      x: x + getWindowScrollBarX(element),
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
  function getDocumentRect(element) {
    var _element$ownerDocumen;
    var html2 = getDocumentElement(element);
    var winScroll = getWindowScroll(element);
    var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
    var width = max(html2.scrollWidth, html2.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
    var height = max(html2.scrollHeight, html2.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
    var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
    var y = -winScroll.scrollTop;
    if (getComputedStyle2(body || html2).direction === "rtl") {
      x += max(html2.clientWidth, body ? body.clientWidth : 0) - width;
    }
    return {
      width,
      height,
      x,
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
  function isScrollParent(element) {
    var _getComputedStyle = getComputedStyle2(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
    return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
  }

  // node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
  function getScrollParent(node) {
    if (["html", "body", "#document"].indexOf(getNodeName(node)) >= 0) {
      return node.ownerDocument.body;
    }
    if (isHTMLElement(node) && isScrollParent(node)) {
      return node;
    }
    return getScrollParent(getParentNode(node));
  }

  // node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
  function listScrollParents(element, list) {
    var _element$ownerDocumen;
    if (list === void 0) {
      list = [];
    }
    var scrollParent = getScrollParent(element);
    var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
    var win = getWindow(scrollParent);
    var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
    var updatedList = list.concat(target);
    return isBody ? updatedList : updatedList.concat(listScrollParents(getParentNode(target)));
  }

  // node_modules/@popperjs/core/lib/utils/rectToClientRect.js
  function rectToClientRect(rect) {
    return Object.assign({}, rect, {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height
    });
  }

  // node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
  function getInnerBoundingClientRect(element, strategy) {
    var rect = getBoundingClientRect(element, false, strategy === "fixed");
    rect.top = rect.top + element.clientTop;
    rect.left = rect.left + element.clientLeft;
    rect.bottom = rect.top + element.clientHeight;
    rect.right = rect.left + element.clientWidth;
    rect.width = element.clientWidth;
    rect.height = element.clientHeight;
    rect.x = rect.left;
    rect.y = rect.top;
    return rect;
  }
  function getClientRectFromMixedType(element, clippingParent, strategy) {
    return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
  }
  function getClippingParents(element) {
    var clippingParents2 = listScrollParents(getParentNode(element));
    var canEscapeClipping = ["absolute", "fixed"].indexOf(getComputedStyle2(element).position) >= 0;
    var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;
    if (!isElement(clipperElement)) {
      return [];
    }
    return clippingParents2.filter(function(clippingParent) {
      return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
    });
  }
  function getClippingRect(element, boundary, rootBoundary, strategy) {
    var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary);
    var clippingParents2 = [].concat(mainClippingParents, [rootBoundary]);
    var firstClippingParent = clippingParents2[0];
    var clippingRect = clippingParents2.reduce(function(accRect, clippingParent) {
      var rect = getClientRectFromMixedType(element, clippingParent, strategy);
      accRect.top = max(rect.top, accRect.top);
      accRect.right = min(rect.right, accRect.right);
      accRect.bottom = min(rect.bottom, accRect.bottom);
      accRect.left = max(rect.left, accRect.left);
      return accRect;
    }, getClientRectFromMixedType(element, firstClippingParent, strategy));
    clippingRect.width = clippingRect.right - clippingRect.left;
    clippingRect.height = clippingRect.bottom - clippingRect.top;
    clippingRect.x = clippingRect.left;
    clippingRect.y = clippingRect.top;
    return clippingRect;
  }

  // node_modules/@popperjs/core/lib/utils/computeOffsets.js
  function computeOffsets(_ref) {
    var reference2 = _ref.reference, element = _ref.element, placement = _ref.placement;
    var basePlacement = placement ? getBasePlacement(placement) : null;
    var variation = placement ? getVariation(placement) : null;
    var commonX = reference2.x + reference2.width / 2 - element.width / 2;
    var commonY = reference2.y + reference2.height / 2 - element.height / 2;
    var offsets;
    switch (basePlacement) {
      case top:
        offsets = {
          x: commonX,
          y: reference2.y - element.height
        };
        break;
      case bottom:
        offsets = {
          x: commonX,
          y: reference2.y + reference2.height
        };
        break;
      case right:
        offsets = {
          x: reference2.x + reference2.width,
          y: commonY
        };
        break;
      case left:
        offsets = {
          x: reference2.x - element.width,
          y: commonY
        };
        break;
      default:
        offsets = {
          x: reference2.x,
          y: reference2.y
        };
    }
    var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
    if (mainAxis != null) {
      var len = mainAxis === "y" ? "height" : "width";
      switch (variation) {
        case start2:
          offsets[mainAxis] = offsets[mainAxis] - (reference2[len] / 2 - element[len] / 2);
          break;
        case end:
          offsets[mainAxis] = offsets[mainAxis] + (reference2[len] / 2 - element[len] / 2);
          break;
        default:
      }
    }
    return offsets;
  }

  // node_modules/@popperjs/core/lib/utils/detectOverflow.js
  function detectOverflow(state, options2) {
    if (options2 === void 0) {
      options2 = {};
    }
    var _options = options2, _options$placement = _options.placement, placement = _options$placement === void 0 ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === void 0 ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === void 0 ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === void 0 ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === void 0 ? 0 : _options$padding;
    var paddingObject = mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
    var altContext = elementContext === popper ? reference : popper;
    var popperRect = state.rects.popper;
    var element = state.elements[altBoundary ? altContext : elementContext];
    var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
    var referenceClientRect = getBoundingClientRect(state.elements.reference);
    var popperOffsets2 = computeOffsets({
      reference: referenceClientRect,
      element: popperRect,
      strategy: "absolute",
      placement
    });
    var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets2));
    var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect;
    var overflowOffsets = {
      top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
      bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
      left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
      right: elementClientRect.right - clippingClientRect.right + paddingObject.right
    };
    var offsetData = state.modifiersData.offset;
    if (elementContext === popper && offsetData) {
      var offset2 = offsetData[placement];
      Object.keys(overflowOffsets).forEach(function(key) {
        var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
        var axis = [top, bottom].indexOf(key) >= 0 ? "y" : "x";
        overflowOffsets[key] += offset2[axis] * multiply;
      });
    }
    return overflowOffsets;
  }

  // node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
  function computeAutoPlacement(state, options2) {
    if (options2 === void 0) {
      options2 = {};
    }
    var _options = options2, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
    var variation = getVariation(placement);
    var placements2 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement2) {
      return getVariation(placement2) === variation;
    }) : basePlacements;
    var allowedPlacements = placements2.filter(function(placement2) {
      return allowedAutoPlacements.indexOf(placement2) >= 0;
    });
    if (allowedPlacements.length === 0) {
      allowedPlacements = placements2;
      if (true) {
        console.error(["Popper: The `allowedAutoPlacements` option did not allow any", "placements. Ensure the `placement` option matches the variation", "of the allowed placements.", 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(" "));
      }
    }
    var overflows = allowedPlacements.reduce(function(acc, placement2) {
      acc[placement2] = detectOverflow(state, {
        placement: placement2,
        boundary,
        rootBoundary,
        padding
      })[getBasePlacement(placement2)];
      return acc;
    }, {});
    return Object.keys(overflows).sort(function(a, b) {
      return overflows[a] - overflows[b];
    });
  }

  // node_modules/@popperjs/core/lib/modifiers/flip.js
  function getExpandedFallbackPlacements(placement) {
    if (getBasePlacement(placement) === auto) {
      return [];
    }
    var oppositePlacement = getOppositePlacement(placement);
    return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
  }
  function flip(_ref) {
    var state = _ref.state, options2 = _ref.options, name = _ref.name;
    if (state.modifiersData[name]._skip) {
      return;
    }
    var _options$mainAxis = options2.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options2.altAxis, checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis, specifiedFallbackPlacements = options2.fallbackPlacements, padding = options2.padding, boundary = options2.boundary, rootBoundary = options2.rootBoundary, altBoundary = options2.altBoundary, _options$flipVariatio = options2.flipVariations, flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio, allowedAutoPlacements = options2.allowedAutoPlacements;
    var preferredPlacement = state.options.placement;
    var basePlacement = getBasePlacement(preferredPlacement);
    var isBasePlacement = basePlacement === preferredPlacement;
    var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
    var placements2 = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement2) {
      return acc.concat(getBasePlacement(placement2) === auto ? computeAutoPlacement(state, {
        placement: placement2,
        boundary,
        rootBoundary,
        padding,
        flipVariations,
        allowedAutoPlacements
      }) : placement2);
    }, []);
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var checksMap = /* @__PURE__ */ new Map();
    var makeFallbackChecks = true;
    var firstFittingPlacement = placements2[0];
    for (var i = 0; i < placements2.length; i++) {
      var placement = placements2[i];
      var _basePlacement = getBasePlacement(placement);
      var isStartVariation = getVariation(placement) === start2;
      var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
      var len = isVertical ? "width" : "height";
      var overflow = detectOverflow(state, {
        placement,
        boundary,
        rootBoundary,
        altBoundary,
        padding
      });
      var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;
      if (referenceRect[len] > popperRect[len]) {
        mainVariationSide = getOppositePlacement(mainVariationSide);
      }
      var altVariationSide = getOppositePlacement(mainVariationSide);
      var checks = [];
      if (checkMainAxis) {
        checks.push(overflow[_basePlacement] <= 0);
      }
      if (checkAltAxis) {
        checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
      }
      if (checks.every(function(check) {
        return check;
      })) {
        firstFittingPlacement = placement;
        makeFallbackChecks = false;
        break;
      }
      checksMap.set(placement, checks);
    }
    if (makeFallbackChecks) {
      var numberOfChecks = flipVariations ? 3 : 1;
      var _loop = function _loop2(_i2) {
        var fittingPlacement = placements2.find(function(placement2) {
          var checks2 = checksMap.get(placement2);
          if (checks2) {
            return checks2.slice(0, _i2).every(function(check) {
              return check;
            });
          }
        });
        if (fittingPlacement) {
          firstFittingPlacement = fittingPlacement;
          return "break";
        }
      };
      for (var _i = numberOfChecks; _i > 0; _i--) {
        var _ret = _loop(_i);
        if (_ret === "break")
          break;
      }
    }
    if (state.placement !== firstFittingPlacement) {
      state.modifiersData[name]._skip = true;
      state.placement = firstFittingPlacement;
      state.reset = true;
    }
  }
  var flip_default = {
    name: "flip",
    enabled: true,
    phase: "main",
    fn: flip,
    requiresIfExists: ["offset"],
    data: {
      _skip: false
    }
  };

  // node_modules/@popperjs/core/lib/modifiers/hide.js
  function getSideOffsets(overflow, rect, preventedOffsets) {
    if (preventedOffsets === void 0) {
      preventedOffsets = {
        x: 0,
        y: 0
      };
    }
    return {
      top: overflow.top - rect.height - preventedOffsets.y,
      right: overflow.right - rect.width + preventedOffsets.x,
      bottom: overflow.bottom - rect.height + preventedOffsets.y,
      left: overflow.left - rect.width - preventedOffsets.x
    };
  }
  function isAnySideFullyClipped(overflow) {
    return [top, right, bottom, left].some(function(side) {
      return overflow[side] >= 0;
    });
  }
  function hide(_ref) {
    var state = _ref.state, name = _ref.name;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var preventedOffsets = state.modifiersData.preventOverflow;
    var referenceOverflow = detectOverflow(state, {
      elementContext: "reference"
    });
    var popperAltOverflow = detectOverflow(state, {
      altBoundary: true
    });
    var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
    var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
    var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
    var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
    state.modifiersData[name] = {
      referenceClippingOffsets,
      popperEscapeOffsets,
      isReferenceHidden,
      hasPopperEscaped
    };
    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      "data-popper-reference-hidden": isReferenceHidden,
      "data-popper-escaped": hasPopperEscaped
    });
  }
  var hide_default = {
    name: "hide",
    enabled: true,
    phase: "main",
    requiresIfExists: ["preventOverflow"],
    fn: hide
  };

  // node_modules/@popperjs/core/lib/modifiers/offset.js
  function distanceAndSkiddingToXY(placement, rects, offset2) {
    var basePlacement = getBasePlacement(placement);
    var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;
    var _ref = typeof offset2 === "function" ? offset2(Object.assign({}, rects, {
      placement
    })) : offset2, skidding = _ref[0], distance = _ref[1];
    skidding = skidding || 0;
    distance = (distance || 0) * invertDistance;
    return [left, right].indexOf(basePlacement) >= 0 ? {
      x: distance,
      y: skidding
    } : {
      x: skidding,
      y: distance
    };
  }
  function offset(_ref2) {
    var state = _ref2.state, options2 = _ref2.options, name = _ref2.name;
    var _options$offset = options2.offset, offset2 = _options$offset === void 0 ? [0, 0] : _options$offset;
    var data = placements.reduce(function(acc, placement) {
      acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset2);
      return acc;
    }, {});
    var _data$state$placement = data[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
    if (state.modifiersData.popperOffsets != null) {
      state.modifiersData.popperOffsets.x += x;
      state.modifiersData.popperOffsets.y += y;
    }
    state.modifiersData[name] = data;
  }
  var offset_default = {
    name: "offset",
    enabled: true,
    phase: "main",
    requires: ["popperOffsets"],
    fn: offset
  };

  // node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
  function popperOffsets(_ref) {
    var state = _ref.state, name = _ref.name;
    state.modifiersData[name] = computeOffsets({
      reference: state.rects.reference,
      element: state.rects.popper,
      strategy: "absolute",
      placement: state.placement
    });
  }
  var popperOffsets_default = {
    name: "popperOffsets",
    enabled: true,
    phase: "read",
    fn: popperOffsets,
    data: {}
  };

  // node_modules/@popperjs/core/lib/utils/getAltAxis.js
  function getAltAxis(axis) {
    return axis === "x" ? "y" : "x";
  }

  // node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
  function preventOverflow(_ref) {
    var state = _ref.state, options2 = _ref.options, name = _ref.name;
    var _options$mainAxis = options2.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options2.altAxis, checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis, boundary = options2.boundary, rootBoundary = options2.rootBoundary, altBoundary = options2.altBoundary, padding = options2.padding, _options$tether = options2.tether, tether = _options$tether === void 0 ? true : _options$tether, _options$tetherOffset = options2.tetherOffset, tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
    var overflow = detectOverflow(state, {
      boundary,
      rootBoundary,
      padding,
      altBoundary
    });
    var basePlacement = getBasePlacement(state.placement);
    var variation = getVariation(state.placement);
    var isBasePlacement = !variation;
    var mainAxis = getMainAxisFromPlacement(basePlacement);
    var altAxis = getAltAxis(mainAxis);
    var popperOffsets2 = state.modifiersData.popperOffsets;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var tetherOffsetValue = typeof tetherOffset === "function" ? tetherOffset(Object.assign({}, state.rects, {
      placement: state.placement
    })) : tetherOffset;
    var normalizedTetherOffsetValue = typeof tetherOffsetValue === "number" ? {
      mainAxis: tetherOffsetValue,
      altAxis: tetherOffsetValue
    } : Object.assign({
      mainAxis: 0,
      altAxis: 0
    }, tetherOffsetValue);
    var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
    var data = {
      x: 0,
      y: 0
    };
    if (!popperOffsets2) {
      return;
    }
    if (checkMainAxis) {
      var _offsetModifierState$;
      var mainSide = mainAxis === "y" ? top : left;
      var altSide = mainAxis === "y" ? bottom : right;
      var len = mainAxis === "y" ? "height" : "width";
      var offset2 = popperOffsets2[mainAxis];
      var min2 = offset2 + overflow[mainSide];
      var max2 = offset2 - overflow[altSide];
      var additive = tether ? -popperRect[len] / 2 : 0;
      var minLen = variation === start2 ? referenceRect[len] : popperRect[len];
      var maxLen = variation === start2 ? -popperRect[len] : -referenceRect[len];
      var arrowElement = state.elements.arrow;
      var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
        width: 0,
        height: 0
      };
      var arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject();
      var arrowPaddingMin = arrowPaddingObject[mainSide];
      var arrowPaddingMax = arrowPaddingObject[altSide];
      var arrowLen = within(0, referenceRect[len], arrowRect[len]);
      var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
      var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
      var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
      var clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
      var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
      var tetherMin = offset2 + minOffset - offsetModifierValue - clientOffset;
      var tetherMax = offset2 + maxOffset - offsetModifierValue;
      var preventedOffset = within(tether ? min(min2, tetherMin) : min2, offset2, tether ? max(max2, tetherMax) : max2);
      popperOffsets2[mainAxis] = preventedOffset;
      data[mainAxis] = preventedOffset - offset2;
    }
    if (checkAltAxis) {
      var _offsetModifierState$2;
      var _mainSide = mainAxis === "x" ? top : left;
      var _altSide = mainAxis === "x" ? bottom : right;
      var _offset = popperOffsets2[altAxis];
      var _len = altAxis === "y" ? "height" : "width";
      var _min = _offset + overflow[_mainSide];
      var _max = _offset - overflow[_altSide];
      var isOriginSide = [top, left].indexOf(basePlacement) !== -1;
      var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;
      var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;
      var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;
      var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
      popperOffsets2[altAxis] = _preventedOffset;
      data[altAxis] = _preventedOffset - _offset;
    }
    state.modifiersData[name] = data;
  }
  var preventOverflow_default = {
    name: "preventOverflow",
    enabled: true,
    phase: "main",
    fn: preventOverflow,
    requiresIfExists: ["offset"]
  };

  // node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
  function getHTMLElementScroll(element) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
  function getNodeScroll(node) {
    if (node === getWindow(node) || !isHTMLElement(node)) {
      return getWindowScroll(node);
    } else {
      return getHTMLElementScroll(node);
    }
  }

  // node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
  function isElementScaled(element) {
    var rect = element.getBoundingClientRect();
    var scaleX = round(rect.width) / element.offsetWidth || 1;
    var scaleY = round(rect.height) / element.offsetHeight || 1;
    return scaleX !== 1 || scaleY !== 1;
  }
  function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
    if (isFixed === void 0) {
      isFixed = false;
    }
    var isOffsetParentAnElement = isHTMLElement(offsetParent);
    var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
    var documentElement = getDocumentElement(offsetParent);
    var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
    var scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    var offsets = {
      x: 0,
      y: 0
    };
    if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
      if (getNodeName(offsetParent) !== "body" || isScrollParent(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isHTMLElement(offsetParent)) {
        offsets = getBoundingClientRect(offsetParent, true);
        offsets.x += offsetParent.clientLeft;
        offsets.y += offsetParent.clientTop;
      } else if (documentElement) {
        offsets.x = getWindowScrollBarX(documentElement);
      }
    }
    return {
      x: rect.left + scroll.scrollLeft - offsets.x,
      y: rect.top + scroll.scrollTop - offsets.y,
      width: rect.width,
      height: rect.height
    };
  }

  // node_modules/@popperjs/core/lib/utils/orderModifiers.js
  function order(modifiers) {
    var map = /* @__PURE__ */ new Map();
    var visited = /* @__PURE__ */ new Set();
    var result = [];
    modifiers.forEach(function(modifier) {
      map.set(modifier.name, modifier);
    });
    function sort(modifier) {
      visited.add(modifier.name);
      var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
      requires.forEach(function(dep) {
        if (!visited.has(dep)) {
          var depModifier = map.get(dep);
          if (depModifier) {
            sort(depModifier);
          }
        }
      });
      result.push(modifier);
    }
    modifiers.forEach(function(modifier) {
      if (!visited.has(modifier.name)) {
        sort(modifier);
      }
    });
    return result;
  }
  function orderModifiers(modifiers) {
    var orderedModifiers = order(modifiers);
    return modifierPhases.reduce(function(acc, phase) {
      return acc.concat(orderedModifiers.filter(function(modifier) {
        return modifier.phase === phase;
      }));
    }, []);
  }

  // node_modules/@popperjs/core/lib/utils/debounce.js
  function debounce(fn2) {
    var pending;
    return function() {
      if (!pending) {
        pending = new Promise(function(resolve) {
          Promise.resolve().then(function() {
            pending = void 0;
            resolve(fn2());
          });
        });
      }
      return pending;
    };
  }

  // node_modules/@popperjs/core/lib/utils/format.js
  function format(str) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return [].concat(args).reduce(function(p, c) {
      return p.replace(/%s/, c);
    }, str);
  }

  // node_modules/@popperjs/core/lib/utils/validateModifiers.js
  var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
  var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
  var VALID_PROPERTIES = ["name", "enabled", "phase", "fn", "effect", "requires", "options"];
  function validateModifiers(modifiers) {
    modifiers.forEach(function(modifier) {
      [].concat(Object.keys(modifier), VALID_PROPERTIES).filter(function(value, index, self2) {
        return self2.indexOf(value) === index;
      }).forEach(function(key) {
        switch (key) {
          case "name":
            if (typeof modifier.name !== "string") {
              console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', '"' + String(modifier.name) + '"'));
            }
            break;
          case "enabled":
            if (typeof modifier.enabled !== "boolean") {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', '"' + String(modifier.enabled) + '"'));
            }
            break;
          case "phase":
            if (modifierPhases.indexOf(modifier.phase) < 0) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(", "), '"' + String(modifier.phase) + '"'));
            }
            break;
          case "fn":
            if (typeof modifier.fn !== "function") {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', '"' + String(modifier.fn) + '"'));
            }
            break;
          case "effect":
            if (modifier.effect != null && typeof modifier.effect !== "function") {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', '"' + String(modifier.fn) + '"'));
            }
            break;
          case "requires":
            if (modifier.requires != null && !Array.isArray(modifier.requires)) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', '"' + String(modifier.requires) + '"'));
            }
            break;
          case "requiresIfExists":
            if (!Array.isArray(modifier.requiresIfExists)) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', '"' + String(modifier.requiresIfExists) + '"'));
            }
            break;
          case "options":
          case "data":
            break;
          default:
            console.error('PopperJS: an invalid property has been provided to the "' + modifier.name + '" modifier, valid properties are ' + VALID_PROPERTIES.map(function(s) {
              return '"' + s + '"';
            }).join(", ") + '; but "' + key + '" was provided.');
        }
        modifier.requires && modifier.requires.forEach(function(requirement) {
          if (modifiers.find(function(mod) {
            return mod.name === requirement;
          }) == null) {
            console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
          }
        });
      });
    });
  }

  // node_modules/@popperjs/core/lib/utils/uniqueBy.js
  function uniqueBy(arr, fn2) {
    var identifiers = /* @__PURE__ */ new Set();
    return arr.filter(function(item) {
      var identifier = fn2(item);
      if (!identifiers.has(identifier)) {
        identifiers.add(identifier);
        return true;
      }
    });
  }

  // node_modules/@popperjs/core/lib/utils/mergeByName.js
  function mergeByName(modifiers) {
    var merged = modifiers.reduce(function(merged2, current) {
      var existing = merged2[current.name];
      merged2[current.name] = existing ? Object.assign({}, existing, current, {
        options: Object.assign({}, existing.options, current.options),
        data: Object.assign({}, existing.data, current.data)
      }) : current;
      return merged2;
    }, {});
    return Object.keys(merged).map(function(key) {
      return merged[key];
    });
  }

  // node_modules/@popperjs/core/lib/createPopper.js
  var INVALID_ELEMENT_ERROR = "Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.";
  var INFINITE_LOOP_ERROR = "Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.";
  var DEFAULT_OPTIONS = {
    placement: "bottom",
    modifiers: [],
    strategy: "absolute"
  };
  function areValidElements() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return !args.some(function(element) {
      return !(element && typeof element.getBoundingClientRect === "function");
    });
  }
  function popperGenerator(generatorOptions) {
    if (generatorOptions === void 0) {
      generatorOptions = {};
    }
    var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers3 = _generatorOptions$def === void 0 ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions2 = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
    return function createPopper4(reference2, popper2, options2) {
      if (options2 === void 0) {
        options2 = defaultOptions2;
      }
      var state = {
        placement: "bottom",
        orderedModifiers: [],
        options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions2),
        modifiersData: {},
        elements: {
          reference: reference2,
          popper: popper2
        },
        attributes: {},
        styles: {}
      };
      var effectCleanupFns = [];
      var isDestroyed = false;
      var instance = {
        state,
        setOptions: function setOptions(setOptionsAction) {
          var options3 = typeof setOptionsAction === "function" ? setOptionsAction(state.options) : setOptionsAction;
          cleanupModifierEffects();
          state.options = Object.assign({}, defaultOptions2, state.options, options3);
          state.scrollParents = {
            reference: isElement(reference2) ? listScrollParents(reference2) : reference2.contextElement ? listScrollParents(reference2.contextElement) : [],
            popper: listScrollParents(popper2)
          };
          var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers3, state.options.modifiers)));
          state.orderedModifiers = orderedModifiers.filter(function(m) {
            return m.enabled;
          });
          if (true) {
            var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function(_ref) {
              var name = _ref.name;
              return name;
            });
            validateModifiers(modifiers);
            if (getBasePlacement(state.options.placement) === auto) {
              var flipModifier = state.orderedModifiers.find(function(_ref2) {
                var name = _ref2.name;
                return name === "flip";
              });
              if (!flipModifier) {
                console.error(['Popper: "auto" placements require the "flip" modifier be', "present and enabled to work."].join(" "));
              }
            }
            var _getComputedStyle = getComputedStyle2(popper2), marginTop = _getComputedStyle.marginTop, marginRight = _getComputedStyle.marginRight, marginBottom = _getComputedStyle.marginBottom, marginLeft = _getComputedStyle.marginLeft;
            if ([marginTop, marginRight, marginBottom, marginLeft].some(function(margin) {
              return parseFloat(margin);
            })) {
              console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', "between the popper and its reference element or boundary.", "To replicate margin, use the `offset` modifier, as well as", "the `padding` option in the `preventOverflow` and `flip`", "modifiers."].join(" "));
            }
          }
          runModifierEffects();
          return instance.update();
        },
        forceUpdate: function forceUpdate() {
          if (isDestroyed) {
            return;
          }
          var _state$elements = state.elements, reference3 = _state$elements.reference, popper3 = _state$elements.popper;
          if (!areValidElements(reference3, popper3)) {
            if (true) {
              console.error(INVALID_ELEMENT_ERROR);
            }
            return;
          }
          state.rects = {
            reference: getCompositeRect(reference3, getOffsetParent(popper3), state.options.strategy === "fixed"),
            popper: getLayoutRect(popper3)
          };
          state.reset = false;
          state.placement = state.options.placement;
          state.orderedModifiers.forEach(function(modifier) {
            return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
          });
          var __debug_loops__ = 0;
          for (var index = 0; index < state.orderedModifiers.length; index++) {
            if (true) {
              __debug_loops__ += 1;
              if (__debug_loops__ > 100) {
                console.error(INFINITE_LOOP_ERROR);
                break;
              }
            }
            if (state.reset === true) {
              state.reset = false;
              index = -1;
              continue;
            }
            var _state$orderedModifie = state.orderedModifiers[index], fn2 = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
            if (typeof fn2 === "function") {
              state = fn2({
                state,
                options: _options,
                name,
                instance
              }) || state;
            }
          }
        },
        update: debounce(function() {
          return new Promise(function(resolve) {
            instance.forceUpdate();
            resolve(state);
          });
        }),
        destroy: function destroy() {
          cleanupModifierEffects();
          isDestroyed = true;
        }
      };
      if (!areValidElements(reference2, popper2)) {
        if (true) {
          console.error(INVALID_ELEMENT_ERROR);
        }
        return instance;
      }
      instance.setOptions(options2).then(function(state2) {
        if (!isDestroyed && options2.onFirstUpdate) {
          options2.onFirstUpdate(state2);
        }
      });
      function runModifierEffects() {
        state.orderedModifiers.forEach(function(_ref3) {
          var name = _ref3.name, _ref3$options = _ref3.options, options3 = _ref3$options === void 0 ? {} : _ref3$options, effect4 = _ref3.effect;
          if (typeof effect4 === "function") {
            var cleanupFn = effect4({
              state,
              name,
              instance,
              options: options3
            });
            var noopFn = function noopFn2() {
            };
            effectCleanupFns.push(cleanupFn || noopFn);
          }
        });
      }
      function cleanupModifierEffects() {
        effectCleanupFns.forEach(function(fn2) {
          return fn2();
        });
        effectCleanupFns = [];
      }
      return instance;
    };
  }
  var createPopper = /* @__PURE__ */ popperGenerator();

  // node_modules/@popperjs/core/lib/popper-lite.js
  var defaultModifiers = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default];
  var createPopper2 = /* @__PURE__ */ popperGenerator({
    defaultModifiers
  });

  // node_modules/@popperjs/core/lib/popper.js
  var defaultModifiers2 = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default, offset_default, flip_default, preventOverflow_default, arrow_default, hide_default];
  var createPopper3 = /* @__PURE__ */ popperGenerator({
    defaultModifiers: defaultModifiers2
  });

  // node_modules/bootstrap/dist/js/bootstrap.esm.js
  var MAX_UID = 1e6;
  var MILLISECONDS_MULTIPLIER = 1e3;
  var TRANSITION_END = "transitionend";
  var toType = (object2) => {
    if (object2 === null || object2 === void 0) {
      return `${object2}`;
    }
    return Object.prototype.toString.call(object2).match(/\s([a-z]+)/i)[1].toLowerCase();
  };
  var getUID = (prefix) => {
    do {
      prefix += Math.floor(Math.random() * MAX_UID);
    } while (document.getElementById(prefix));
    return prefix;
  };
  var getSelector = (element) => {
    let selector = element.getAttribute("data-bs-target");
    if (!selector || selector === "#") {
      let hrefAttribute = element.getAttribute("href");
      if (!hrefAttribute || !hrefAttribute.includes("#") && !hrefAttribute.startsWith(".")) {
        return null;
      }
      if (hrefAttribute.includes("#") && !hrefAttribute.startsWith("#")) {
        hrefAttribute = `#${hrefAttribute.split("#")[1]}`;
      }
      selector = hrefAttribute && hrefAttribute !== "#" ? hrefAttribute.trim() : null;
    }
    return selector;
  };
  var getSelectorFromElement = (element) => {
    const selector = getSelector(element);
    if (selector) {
      return document.querySelector(selector) ? selector : null;
    }
    return null;
  };
  var getElementFromSelector = (element) => {
    const selector = getSelector(element);
    return selector ? document.querySelector(selector) : null;
  };
  var getTransitionDurationFromElement = (element) => {
    if (!element) {
      return 0;
    }
    let {
      transitionDuration,
      transitionDelay
    } = window.getComputedStyle(element);
    const floatTransitionDuration = Number.parseFloat(transitionDuration);
    const floatTransitionDelay = Number.parseFloat(transitionDelay);
    if (!floatTransitionDuration && !floatTransitionDelay) {
      return 0;
    }
    transitionDuration = transitionDuration.split(",")[0];
    transitionDelay = transitionDelay.split(",")[0];
    return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
  };
  var triggerTransitionEnd = (element) => {
    element.dispatchEvent(new Event(TRANSITION_END));
  };
  var isElement2 = (object2) => {
    if (!object2 || typeof object2 !== "object") {
      return false;
    }
    if (typeof object2.jquery !== "undefined") {
      object2 = object2[0];
    }
    return typeof object2.nodeType !== "undefined";
  };
  var getElement = (object2) => {
    if (isElement2(object2)) {
      return object2.jquery ? object2[0] : object2;
    }
    if (typeof object2 === "string" && object2.length > 0) {
      return document.querySelector(object2);
    }
    return null;
  };
  var isVisible = (element) => {
    if (!isElement2(element) || element.getClientRects().length === 0) {
      return false;
    }
    const elementIsVisible = getComputedStyle(element).getPropertyValue("visibility") === "visible";
    const closedDetails = element.closest("details:not([open])");
    if (!closedDetails) {
      return elementIsVisible;
    }
    if (closedDetails !== element) {
      const summary = element.closest("summary");
      if (summary && summary.parentNode !== closedDetails) {
        return false;
      }
      if (summary === null) {
        return false;
      }
    }
    return elementIsVisible;
  };
  var isDisabled = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }
    if (element.classList.contains("disabled")) {
      return true;
    }
    if (typeof element.disabled !== "undefined") {
      return element.disabled;
    }
    return element.hasAttribute("disabled") && element.getAttribute("disabled") !== "false";
  };
  var findShadowRoot = (element) => {
    if (!document.documentElement.attachShadow) {
      return null;
    }
    if (typeof element.getRootNode === "function") {
      const root = element.getRootNode();
      return root instanceof ShadowRoot ? root : null;
    }
    if (element instanceof ShadowRoot) {
      return element;
    }
    if (!element.parentNode) {
      return null;
    }
    return findShadowRoot(element.parentNode);
  };
  var noop = () => {
  };
  var reflow = (element) => {
    element.offsetHeight;
  };
  var getjQuery = () => {
    if (window.jQuery && !document.body.hasAttribute("data-bs-no-jquery")) {
      return window.jQuery;
    }
    return null;
  };
  var DOMContentLoadedCallbacks = [];
  var onDOMContentLoaded = (callback) => {
    if (document.readyState === "loading") {
      if (!DOMContentLoadedCallbacks.length) {
        document.addEventListener("DOMContentLoaded", () => {
          for (const callback2 of DOMContentLoadedCallbacks) {
            callback2();
          }
        });
      }
      DOMContentLoadedCallbacks.push(callback);
    } else {
      callback();
    }
  };
  var isRTL = () => document.documentElement.dir === "rtl";
  var defineJQueryPlugin = (plugin) => {
    onDOMContentLoaded(() => {
      const $ = getjQuery();
      if ($) {
        const name = plugin.NAME;
        const JQUERY_NO_CONFLICT = $.fn[name];
        $.fn[name] = plugin.jQueryInterface;
        $.fn[name].Constructor = plugin;
        $.fn[name].noConflict = () => {
          $.fn[name] = JQUERY_NO_CONFLICT;
          return plugin.jQueryInterface;
        };
      }
    });
  };
  var execute = (callback) => {
    if (typeof callback === "function") {
      callback();
    }
  };
  var executeAfterTransition = (callback, transitionElement, waitForTransition = true) => {
    if (!waitForTransition) {
      execute(callback);
      return;
    }
    const durationPadding = 5;
    const emulatedDuration = getTransitionDurationFromElement(transitionElement) + durationPadding;
    let called = false;
    const handler = ({
      target
    }) => {
      if (target !== transitionElement) {
        return;
      }
      called = true;
      transitionElement.removeEventListener(TRANSITION_END, handler);
      execute(callback);
    };
    transitionElement.addEventListener(TRANSITION_END, handler);
    setTimeout(() => {
      if (!called) {
        triggerTransitionEnd(transitionElement);
      }
    }, emulatedDuration);
  };
  var getNextActiveElement = (list, activeElement, shouldGetNext, isCycleAllowed) => {
    const listLength = list.length;
    let index = list.indexOf(activeElement);
    if (index === -1) {
      return !shouldGetNext && isCycleAllowed ? list[listLength - 1] : list[0];
    }
    index += shouldGetNext ? 1 : -1;
    if (isCycleAllowed) {
      index = (index + listLength) % listLength;
    }
    return list[Math.max(0, Math.min(index, listLength - 1))];
  };
  var namespaceRegex = /[^.]*(?=\..*)\.|.*/;
  var stripNameRegex = /\..*/;
  var stripUidRegex = /::\d+$/;
  var eventRegistry = {};
  var uidEvent = 1;
  var customEvents = {
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  };
  var nativeEvents = /* @__PURE__ */ new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel", "gesturestart", "gesturechange", "gestureend", "focus", "blur", "change", "reset", "select", "submit", "focusin", "focusout", "load", "unload", "beforeunload", "resize", "move", "DOMContentLoaded", "readystatechange", "error", "abort", "scroll"]);
  function makeEventUid(element, uid) {
    return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++;
  }
  function getElementEvents(element) {
    const uid = makeEventUid(element);
    element.uidEvent = uid;
    eventRegistry[uid] = eventRegistry[uid] || {};
    return eventRegistry[uid];
  }
  function bootstrapHandler(element, fn2) {
    return function handler(event) {
      hydrateObj(event, {
        delegateTarget: element
      });
      if (handler.oneOff) {
        EventHandler.off(element, event.type, fn2);
      }
      return fn2.apply(element, [event]);
    };
  }
  function bootstrapDelegationHandler(element, selector, fn2) {
    return function handler(event) {
      const domElements = element.querySelectorAll(selector);
      for (let {
        target
      } = event; target && target !== this; target = target.parentNode) {
        for (const domElement of domElements) {
          if (domElement !== target) {
            continue;
          }
          hydrateObj(event, {
            delegateTarget: target
          });
          if (handler.oneOff) {
            EventHandler.off(element, event.type, selector, fn2);
          }
          return fn2.apply(target, [event]);
        }
      }
    };
  }
  function findHandler(events, callable, delegationSelector = null) {
    return Object.values(events).find((event) => event.callable === callable && event.delegationSelector === delegationSelector);
  }
  function normalizeParameters(originalTypeEvent, handler, delegationFunction) {
    const isDelegated = typeof handler === "string";
    const callable = isDelegated ? delegationFunction : handler || delegationFunction;
    let typeEvent = getTypeEvent(originalTypeEvent);
    if (!nativeEvents.has(typeEvent)) {
      typeEvent = originalTypeEvent;
    }
    return [isDelegated, callable, typeEvent];
  }
  function addHandler(element, originalTypeEvent, handler, delegationFunction, oneOff) {
    if (typeof originalTypeEvent !== "string" || !element) {
      return;
    }
    let [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
    if (originalTypeEvent in customEvents) {
      const wrapFunction = (fn3) => {
        return function(event) {
          if (!event.relatedTarget || event.relatedTarget !== event.delegateTarget && !event.delegateTarget.contains(event.relatedTarget)) {
            return fn3.call(this, event);
          }
        };
      };
      callable = wrapFunction(callable);
    }
    const events = getElementEvents(element);
    const handlers = events[typeEvent] || (events[typeEvent] = {});
    const previousFunction = findHandler(handlers, callable, isDelegated ? handler : null);
    if (previousFunction) {
      previousFunction.oneOff = previousFunction.oneOff && oneOff;
      return;
    }
    const uid = makeEventUid(callable, originalTypeEvent.replace(namespaceRegex, ""));
    const fn2 = isDelegated ? bootstrapDelegationHandler(element, handler, callable) : bootstrapHandler(element, callable);
    fn2.delegationSelector = isDelegated ? handler : null;
    fn2.callable = callable;
    fn2.oneOff = oneOff;
    fn2.uidEvent = uid;
    handlers[uid] = fn2;
    element.addEventListener(typeEvent, fn2, isDelegated);
  }
  function removeHandler(element, events, typeEvent, handler, delegationSelector) {
    const fn2 = findHandler(events[typeEvent], handler, delegationSelector);
    if (!fn2) {
      return;
    }
    element.removeEventListener(typeEvent, fn2, Boolean(delegationSelector));
    delete events[typeEvent][fn2.uidEvent];
  }
  function removeNamespacedHandlers(element, events, typeEvent, namespace) {
    const storeElementEvent = events[typeEvent] || {};
    for (const handlerKey of Object.keys(storeElementEvent)) {
      if (handlerKey.includes(namespace)) {
        const event = storeElementEvent[handlerKey];
        removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
      }
    }
  }
  function getTypeEvent(event) {
    event = event.replace(stripNameRegex, "");
    return customEvents[event] || event;
  }
  var EventHandler = {
    on(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, false);
    },
    one(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, true);
    },
    off(element, originalTypeEvent, handler, delegationFunction) {
      if (typeof originalTypeEvent !== "string" || !element) {
        return;
      }
      const [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
      const inNamespace = typeEvent !== originalTypeEvent;
      const events = getElementEvents(element);
      const storeElementEvent = events[typeEvent] || {};
      const isNamespace = originalTypeEvent.startsWith(".");
      if (typeof callable !== "undefined") {
        if (!Object.keys(storeElementEvent).length) {
          return;
        }
        removeHandler(element, events, typeEvent, callable, isDelegated ? handler : null);
        return;
      }
      if (isNamespace) {
        for (const elementEvent of Object.keys(events)) {
          removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
        }
      }
      for (const keyHandlers of Object.keys(storeElementEvent)) {
        const handlerKey = keyHandlers.replace(stripUidRegex, "");
        if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
          const event = storeElementEvent[keyHandlers];
          removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
        }
      }
    },
    trigger(element, event, args) {
      if (typeof event !== "string" || !element) {
        return null;
      }
      const $ = getjQuery();
      const typeEvent = getTypeEvent(event);
      const inNamespace = event !== typeEvent;
      let jQueryEvent = null;
      let bubbles = true;
      let nativeDispatch = true;
      let defaultPrevented = false;
      if (inNamespace && $) {
        jQueryEvent = $.Event(event, args);
        $(element).trigger(jQueryEvent);
        bubbles = !jQueryEvent.isPropagationStopped();
        nativeDispatch = !jQueryEvent.isImmediatePropagationStopped();
        defaultPrevented = jQueryEvent.isDefaultPrevented();
      }
      let evt = new Event(event, {
        bubbles,
        cancelable: true
      });
      evt = hydrateObj(evt, args);
      if (defaultPrevented) {
        evt.preventDefault();
      }
      if (nativeDispatch) {
        element.dispatchEvent(evt);
      }
      if (evt.defaultPrevented && jQueryEvent) {
        jQueryEvent.preventDefault();
      }
      return evt;
    }
  };
  function hydrateObj(obj, meta) {
    for (const [key, value] of Object.entries(meta || {})) {
      try {
        obj[key] = value;
      } catch (_unused) {
        Object.defineProperty(obj, key, {
          configurable: true,
          get() {
            return value;
          }
        });
      }
    }
    return obj;
  }
  var elementMap = /* @__PURE__ */ new Map();
  var Data = {
    set(element, key, instance) {
      if (!elementMap.has(element)) {
        elementMap.set(element, /* @__PURE__ */ new Map());
      }
      const instanceMap = elementMap.get(element);
      if (!instanceMap.has(key) && instanceMap.size !== 0) {
        console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(instanceMap.keys())[0]}.`);
        return;
      }
      instanceMap.set(key, instance);
    },
    get(element, key) {
      if (elementMap.has(element)) {
        return elementMap.get(element).get(key) || null;
      }
      return null;
    },
    remove(element, key) {
      if (!elementMap.has(element)) {
        return;
      }
      const instanceMap = elementMap.get(element);
      instanceMap.delete(key);
      if (instanceMap.size === 0) {
        elementMap.delete(element);
      }
    }
  };
  function normalizeData(value) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    if (value === Number(value).toString()) {
      return Number(value);
    }
    if (value === "" || value === "null") {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (_unused) {
      return value;
    }
  }
  function normalizeDataKey(key) {
    return key.replace(/[A-Z]/g, (chr) => `-${chr.toLowerCase()}`);
  }
  var Manipulator = {
    setDataAttribute(element, key, value) {
      element.setAttribute(`data-bs-${normalizeDataKey(key)}`, value);
    },
    removeDataAttribute(element, key) {
      element.removeAttribute(`data-bs-${normalizeDataKey(key)}`);
    },
    getDataAttributes(element) {
      if (!element) {
        return {};
      }
      const attributes2 = {};
      const bsKeys = Object.keys(element.dataset).filter((key) => key.startsWith("bs") && !key.startsWith("bsConfig"));
      for (const key of bsKeys) {
        let pureKey = key.replace(/^bs/, "");
        pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1, pureKey.length);
        attributes2[pureKey] = normalizeData(element.dataset[key]);
      }
      return attributes2;
    },
    getDataAttribute(element, key) {
      return normalizeData(element.getAttribute(`data-bs-${normalizeDataKey(key)}`));
    }
  };
  var Config = class {
    static get Default() {
      return {};
    }
    static get DefaultType() {
      return {};
    }
    static get NAME() {
      throw new Error('You have to implement the static method "NAME", for each component!');
    }
    _getConfig(config2) {
      config2 = this._mergeConfigObj(config2);
      config2 = this._configAfterMerge(config2);
      this._typeCheckConfig(config2);
      return config2;
    }
    _configAfterMerge(config2) {
      return config2;
    }
    _mergeConfigObj(config2, element) {
      const jsonConfig = isElement2(element) ? Manipulator.getDataAttribute(element, "config") : {};
      return {
        ...this.constructor.Default,
        ...typeof jsonConfig === "object" ? jsonConfig : {},
        ...isElement2(element) ? Manipulator.getDataAttributes(element) : {},
        ...typeof config2 === "object" ? config2 : {}
      };
    }
    _typeCheckConfig(config2, configTypes = this.constructor.DefaultType) {
      for (const property of Object.keys(configTypes)) {
        const expectedTypes = configTypes[property];
        const value = config2[property];
        const valueType = isElement2(value) ? "element" : toType(value);
        if (!new RegExp(expectedTypes).test(valueType)) {
          throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${property}" provided type "${valueType}" but expected type "${expectedTypes}".`);
        }
      }
    }
  };
  var VERSION = "5.2.1";
  var BaseComponent = class extends Config {
    constructor(element, config2) {
      super();
      element = getElement(element);
      if (!element) {
        return;
      }
      this._element = element;
      this._config = this._getConfig(config2);
      Data.set(this._element, this.constructor.DATA_KEY, this);
    }
    dispose() {
      Data.remove(this._element, this.constructor.DATA_KEY);
      EventHandler.off(this._element, this.constructor.EVENT_KEY);
      for (const propertyName of Object.getOwnPropertyNames(this)) {
        this[propertyName] = null;
      }
    }
    _queueCallback(callback, element, isAnimated = true) {
      executeAfterTransition(callback, element, isAnimated);
    }
    _getConfig(config2) {
      config2 = this._mergeConfigObj(config2, this._element);
      config2 = this._configAfterMerge(config2);
      this._typeCheckConfig(config2);
      return config2;
    }
    static getInstance(element) {
      return Data.get(getElement(element), this.DATA_KEY);
    }
    static getOrCreateInstance(element, config2 = {}) {
      return this.getInstance(element) || new this(element, typeof config2 === "object" ? config2 : null);
    }
    static get VERSION() {
      return VERSION;
    }
    static get DATA_KEY() {
      return `bs.${this.NAME}`;
    }
    static get EVENT_KEY() {
      return `.${this.DATA_KEY}`;
    }
    static eventName(name) {
      return `${name}${this.EVENT_KEY}`;
    }
  };
  var enableDismissTrigger = (component, method = "hide") => {
    const clickEvent = `click.dismiss${component.EVENT_KEY}`;
    const name = component.NAME;
    EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function(event) {
      if (["A", "AREA"].includes(this.tagName)) {
        event.preventDefault();
      }
      if (isDisabled(this)) {
        return;
      }
      const target = getElementFromSelector(this) || this.closest(`.${name}`);
      const instance = component.getOrCreateInstance(target);
      instance[method]();
    });
  };
  var NAME$f = "alert";
  var DATA_KEY$a = "bs.alert";
  var EVENT_KEY$b = `.${DATA_KEY$a}`;
  var EVENT_CLOSE = `close${EVENT_KEY$b}`;
  var EVENT_CLOSED = `closed${EVENT_KEY$b}`;
  var CLASS_NAME_FADE$5 = "fade";
  var CLASS_NAME_SHOW$8 = "show";
  var Alert = class extends BaseComponent {
    static get NAME() {
      return NAME$f;
    }
    close() {
      const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE);
      if (closeEvent.defaultPrevented) {
        return;
      }
      this._element.classList.remove(CLASS_NAME_SHOW$8);
      const isAnimated = this._element.classList.contains(CLASS_NAME_FADE$5);
      this._queueCallback(() => this._destroyElement(), this._element, isAnimated);
    }
    _destroyElement() {
      this._element.remove();
      EventHandler.trigger(this._element, EVENT_CLOSED);
      this.dispose();
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Alert.getOrCreateInstance(this);
        if (typeof config2 !== "string") {
          return;
        }
        if (data[config2] === void 0 || config2.startsWith("_") || config2 === "constructor") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2](this);
      });
    }
  };
  enableDismissTrigger(Alert, "close");
  defineJQueryPlugin(Alert);
  var NAME$e = "button";
  var DATA_KEY$9 = "bs.button";
  var EVENT_KEY$a = `.${DATA_KEY$9}`;
  var DATA_API_KEY$6 = ".data-api";
  var CLASS_NAME_ACTIVE$3 = "active";
  var SELECTOR_DATA_TOGGLE$5 = '[data-bs-toggle="button"]';
  var EVENT_CLICK_DATA_API$6 = `click${EVENT_KEY$a}${DATA_API_KEY$6}`;
  var Button = class extends BaseComponent {
    static get NAME() {
      return NAME$e;
    }
    toggle() {
      this._element.setAttribute("aria-pressed", this._element.classList.toggle(CLASS_NAME_ACTIVE$3));
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Button.getOrCreateInstance(this);
        if (config2 === "toggle") {
          data[config2]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$6, SELECTOR_DATA_TOGGLE$5, (event) => {
    event.preventDefault();
    const button = event.target.closest(SELECTOR_DATA_TOGGLE$5);
    const data = Button.getOrCreateInstance(button);
    data.toggle();
  });
  defineJQueryPlugin(Button);
  var SelectorEngine = {
    find(selector, element = document.documentElement) {
      return [].concat(...Element.prototype.querySelectorAll.call(element, selector));
    },
    findOne(selector, element = document.documentElement) {
      return Element.prototype.querySelector.call(element, selector);
    },
    children(element, selector) {
      return [].concat(...element.children).filter((child) => child.matches(selector));
    },
    parents(element, selector) {
      const parents = [];
      let ancestor = element.parentNode.closest(selector);
      while (ancestor) {
        parents.push(ancestor);
        ancestor = ancestor.parentNode.closest(selector);
      }
      return parents;
    },
    prev(element, selector) {
      let previous = element.previousElementSibling;
      while (previous) {
        if (previous.matches(selector)) {
          return [previous];
        }
        previous = previous.previousElementSibling;
      }
      return [];
    },
    next(element, selector) {
      let next = element.nextElementSibling;
      while (next) {
        if (next.matches(selector)) {
          return [next];
        }
        next = next.nextElementSibling;
      }
      return [];
    },
    focusableChildren(element) {
      const focusables = ["a", "button", "input", "textarea", "select", "details", "[tabindex]", '[contenteditable="true"]'].map((selector) => `${selector}:not([tabindex^="-"])`).join(",");
      return this.find(focusables, element).filter((el) => !isDisabled(el) && isVisible(el));
    }
  };
  var NAME$d = "swipe";
  var EVENT_KEY$9 = ".bs.swipe";
  var EVENT_TOUCHSTART = `touchstart${EVENT_KEY$9}`;
  var EVENT_TOUCHMOVE = `touchmove${EVENT_KEY$9}`;
  var EVENT_TOUCHEND = `touchend${EVENT_KEY$9}`;
  var EVENT_POINTERDOWN = `pointerdown${EVENT_KEY$9}`;
  var EVENT_POINTERUP = `pointerup${EVENT_KEY$9}`;
  var POINTER_TYPE_TOUCH = "touch";
  var POINTER_TYPE_PEN = "pen";
  var CLASS_NAME_POINTER_EVENT = "pointer-event";
  var SWIPE_THRESHOLD = 40;
  var Default$c = {
    endCallback: null,
    leftCallback: null,
    rightCallback: null
  };
  var DefaultType$c = {
    endCallback: "(function|null)",
    leftCallback: "(function|null)",
    rightCallback: "(function|null)"
  };
  var Swipe = class extends Config {
    constructor(element, config2) {
      super();
      this._element = element;
      if (!element || !Swipe.isSupported()) {
        return;
      }
      this._config = this._getConfig(config2);
      this._deltaX = 0;
      this._supportPointerEvents = Boolean(window.PointerEvent);
      this._initEvents();
    }
    static get Default() {
      return Default$c;
    }
    static get DefaultType() {
      return DefaultType$c;
    }
    static get NAME() {
      return NAME$d;
    }
    dispose() {
      EventHandler.off(this._element, EVENT_KEY$9);
    }
    _start(event) {
      if (!this._supportPointerEvents) {
        this._deltaX = event.touches[0].clientX;
        return;
      }
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX;
      }
    }
    _end(event) {
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX - this._deltaX;
      }
      this._handleSwipe();
      execute(this._config.endCallback);
    }
    _move(event) {
      this._deltaX = event.touches && event.touches.length > 1 ? 0 : event.touches[0].clientX - this._deltaX;
    }
    _handleSwipe() {
      const absDeltaX = Math.abs(this._deltaX);
      if (absDeltaX <= SWIPE_THRESHOLD) {
        return;
      }
      const direction = absDeltaX / this._deltaX;
      this._deltaX = 0;
      if (!direction) {
        return;
      }
      execute(direction > 0 ? this._config.rightCallback : this._config.leftCallback);
    }
    _initEvents() {
      if (this._supportPointerEvents) {
        EventHandler.on(this._element, EVENT_POINTERDOWN, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_POINTERUP, (event) => this._end(event));
        this._element.classList.add(CLASS_NAME_POINTER_EVENT);
      } else {
        EventHandler.on(this._element, EVENT_TOUCHSTART, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_TOUCHMOVE, (event) => this._move(event));
        EventHandler.on(this._element, EVENT_TOUCHEND, (event) => this._end(event));
      }
    }
    _eventIsPointerPenTouch(event) {
      return this._supportPointerEvents && (event.pointerType === POINTER_TYPE_PEN || event.pointerType === POINTER_TYPE_TOUCH);
    }
    static isSupported() {
      return "ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0;
    }
  };
  var NAME$c = "carousel";
  var DATA_KEY$8 = "bs.carousel";
  var EVENT_KEY$8 = `.${DATA_KEY$8}`;
  var DATA_API_KEY$5 = ".data-api";
  var ARROW_LEFT_KEY$1 = "ArrowLeft";
  var ARROW_RIGHT_KEY$1 = "ArrowRight";
  var TOUCHEVENT_COMPAT_WAIT = 500;
  var ORDER_NEXT = "next";
  var ORDER_PREV = "prev";
  var DIRECTION_LEFT = "left";
  var DIRECTION_RIGHT = "right";
  var EVENT_SLIDE = `slide${EVENT_KEY$8}`;
  var EVENT_SLID = `slid${EVENT_KEY$8}`;
  var EVENT_KEYDOWN$1 = `keydown${EVENT_KEY$8}`;
  var EVENT_MOUSEENTER$1 = `mouseenter${EVENT_KEY$8}`;
  var EVENT_MOUSELEAVE$1 = `mouseleave${EVENT_KEY$8}`;
  var EVENT_DRAG_START = `dragstart${EVENT_KEY$8}`;
  var EVENT_LOAD_DATA_API$3 = `load${EVENT_KEY$8}${DATA_API_KEY$5}`;
  var EVENT_CLICK_DATA_API$5 = `click${EVENT_KEY$8}${DATA_API_KEY$5}`;
  var CLASS_NAME_CAROUSEL = "carousel";
  var CLASS_NAME_ACTIVE$2 = "active";
  var CLASS_NAME_SLIDE = "slide";
  var CLASS_NAME_END = "carousel-item-end";
  var CLASS_NAME_START = "carousel-item-start";
  var CLASS_NAME_NEXT = "carousel-item-next";
  var CLASS_NAME_PREV = "carousel-item-prev";
  var SELECTOR_ACTIVE = ".active";
  var SELECTOR_ITEM = ".carousel-item";
  var SELECTOR_ACTIVE_ITEM = SELECTOR_ACTIVE + SELECTOR_ITEM;
  var SELECTOR_ITEM_IMG = ".carousel-item img";
  var SELECTOR_INDICATORS = ".carousel-indicators";
  var SELECTOR_DATA_SLIDE = "[data-bs-slide], [data-bs-slide-to]";
  var SELECTOR_DATA_RIDE = '[data-bs-ride="carousel"]';
  var KEY_TO_DIRECTION = {
    [ARROW_LEFT_KEY$1]: DIRECTION_RIGHT,
    [ARROW_RIGHT_KEY$1]: DIRECTION_LEFT
  };
  var Default$b = {
    interval: 5e3,
    keyboard: true,
    pause: "hover",
    ride: false,
    touch: true,
    wrap: true
  };
  var DefaultType$b = {
    interval: "(number|boolean)",
    keyboard: "boolean",
    pause: "(string|boolean)",
    ride: "(boolean|string)",
    touch: "boolean",
    wrap: "boolean"
  };
  var Carousel = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._interval = null;
      this._activeElement = null;
      this._isSliding = false;
      this.touchTimeout = null;
      this._swipeHelper = null;
      this._indicatorsElement = SelectorEngine.findOne(SELECTOR_INDICATORS, this._element);
      this._addEventListeners();
      if (this._config.ride === CLASS_NAME_CAROUSEL) {
        this.cycle();
      }
    }
    static get Default() {
      return Default$b;
    }
    static get DefaultType() {
      return DefaultType$b;
    }
    static get NAME() {
      return NAME$c;
    }
    next() {
      this._slide(ORDER_NEXT);
    }
    nextWhenVisible() {
      if (!document.hidden && isVisible(this._element)) {
        this.next();
      }
    }
    prev() {
      this._slide(ORDER_PREV);
    }
    pause() {
      if (this._isSliding) {
        triggerTransitionEnd(this._element);
      }
      this._clearInterval();
    }
    cycle() {
      this._clearInterval();
      this._updateInterval();
      this._interval = setInterval(() => this.nextWhenVisible(), this._config.interval);
    }
    _maybeEnableCycle() {
      if (!this._config.ride) {
        return;
      }
      if (this._isSliding) {
        EventHandler.one(this._element, EVENT_SLID, () => this.cycle());
        return;
      }
      this.cycle();
    }
    to(index) {
      const items = this._getItems();
      if (index > items.length - 1 || index < 0) {
        return;
      }
      if (this._isSliding) {
        EventHandler.one(this._element, EVENT_SLID, () => this.to(index));
        return;
      }
      const activeIndex = this._getItemIndex(this._getActive());
      if (activeIndex === index) {
        return;
      }
      const order2 = index > activeIndex ? ORDER_NEXT : ORDER_PREV;
      this._slide(order2, items[index]);
    }
    dispose() {
      if (this._swipeHelper) {
        this._swipeHelper.dispose();
      }
      super.dispose();
    }
    _configAfterMerge(config2) {
      config2.defaultInterval = config2.interval;
      return config2;
    }
    _addEventListeners() {
      if (this._config.keyboard) {
        EventHandler.on(this._element, EVENT_KEYDOWN$1, (event) => this._keydown(event));
      }
      if (this._config.pause === "hover") {
        EventHandler.on(this._element, EVENT_MOUSEENTER$1, () => this.pause());
        EventHandler.on(this._element, EVENT_MOUSELEAVE$1, () => this._maybeEnableCycle());
      }
      if (this._config.touch && Swipe.isSupported()) {
        this._addTouchEventListeners();
      }
    }
    _addTouchEventListeners() {
      for (const img of SelectorEngine.find(SELECTOR_ITEM_IMG, this._element)) {
        EventHandler.on(img, EVENT_DRAG_START, (event) => event.preventDefault());
      }
      const endCallBack = () => {
        if (this._config.pause !== "hover") {
          return;
        }
        this.pause();
        if (this.touchTimeout) {
          clearTimeout(this.touchTimeout);
        }
        this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), TOUCHEVENT_COMPAT_WAIT + this._config.interval);
      };
      const swipeConfig = {
        leftCallback: () => this._slide(this._directionToOrder(DIRECTION_LEFT)),
        rightCallback: () => this._slide(this._directionToOrder(DIRECTION_RIGHT)),
        endCallback: endCallBack
      };
      this._swipeHelper = new Swipe(this._element, swipeConfig);
    }
    _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) {
        return;
      }
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        this._slide(this._directionToOrder(direction));
      }
    }
    _getItemIndex(element) {
      return this._getItems().indexOf(element);
    }
    _setActiveIndicatorElement(index) {
      if (!this._indicatorsElement) {
        return;
      }
      const activeIndicator = SelectorEngine.findOne(SELECTOR_ACTIVE, this._indicatorsElement);
      activeIndicator.classList.remove(CLASS_NAME_ACTIVE$2);
      activeIndicator.removeAttribute("aria-current");
      const newActiveIndicator = SelectorEngine.findOne(`[data-bs-slide-to="${index}"]`, this._indicatorsElement);
      if (newActiveIndicator) {
        newActiveIndicator.classList.add(CLASS_NAME_ACTIVE$2);
        newActiveIndicator.setAttribute("aria-current", "true");
      }
    }
    _updateInterval() {
      const element = this._activeElement || this._getActive();
      if (!element) {
        return;
      }
      const elementInterval = Number.parseInt(element.getAttribute("data-bs-interval"), 10);
      this._config.interval = elementInterval || this._config.defaultInterval;
    }
    _slide(order2, element = null) {
      if (this._isSliding) {
        return;
      }
      const activeElement = this._getActive();
      const isNext = order2 === ORDER_NEXT;
      const nextElement = element || getNextActiveElement(this._getItems(), activeElement, isNext, this._config.wrap);
      if (nextElement === activeElement) {
        return;
      }
      const nextElementIndex = this._getItemIndex(nextElement);
      const triggerEvent2 = (eventName) => {
        return EventHandler.trigger(this._element, eventName, {
          relatedTarget: nextElement,
          direction: this._orderToDirection(order2),
          from: this._getItemIndex(activeElement),
          to: nextElementIndex
        });
      };
      const slideEvent = triggerEvent2(EVENT_SLIDE);
      if (slideEvent.defaultPrevented) {
        return;
      }
      if (!activeElement || !nextElement) {
        return;
      }
      const isCycling = Boolean(this._interval);
      this.pause();
      this._isSliding = true;
      this._setActiveIndicatorElement(nextElementIndex);
      this._activeElement = nextElement;
      const directionalClassName = isNext ? CLASS_NAME_START : CLASS_NAME_END;
      const orderClassName = isNext ? CLASS_NAME_NEXT : CLASS_NAME_PREV;
      nextElement.classList.add(orderClassName);
      reflow(nextElement);
      activeElement.classList.add(directionalClassName);
      nextElement.classList.add(directionalClassName);
      const completeCallBack = () => {
        nextElement.classList.remove(directionalClassName, orderClassName);
        nextElement.classList.add(CLASS_NAME_ACTIVE$2);
        activeElement.classList.remove(CLASS_NAME_ACTIVE$2, orderClassName, directionalClassName);
        this._isSliding = false;
        triggerEvent2(EVENT_SLID);
      };
      this._queueCallback(completeCallBack, activeElement, this._isAnimated());
      if (isCycling) {
        this.cycle();
      }
    }
    _isAnimated() {
      return this._element.classList.contains(CLASS_NAME_SLIDE);
    }
    _getActive() {
      return SelectorEngine.findOne(SELECTOR_ACTIVE_ITEM, this._element);
    }
    _getItems() {
      return SelectorEngine.find(SELECTOR_ITEM, this._element);
    }
    _clearInterval() {
      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }
    }
    _directionToOrder(direction) {
      if (isRTL()) {
        return direction === DIRECTION_LEFT ? ORDER_PREV : ORDER_NEXT;
      }
      return direction === DIRECTION_LEFT ? ORDER_NEXT : ORDER_PREV;
    }
    _orderToDirection(order2) {
      if (isRTL()) {
        return order2 === ORDER_PREV ? DIRECTION_LEFT : DIRECTION_RIGHT;
      }
      return order2 === ORDER_PREV ? DIRECTION_RIGHT : DIRECTION_LEFT;
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Carousel.getOrCreateInstance(this, config2);
        if (typeof config2 === "number") {
          data.to(config2);
          return;
        }
        if (typeof config2 === "string") {
          if (data[config2] === void 0 || config2.startsWith("_") || config2 === "constructor") {
            throw new TypeError(`No method named "${config2}"`);
          }
          data[config2]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$5, SELECTOR_DATA_SLIDE, function(event) {
    const target = getElementFromSelector(this);
    if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) {
      return;
    }
    event.preventDefault();
    const carousel = Carousel.getOrCreateInstance(target);
    const slideIndex = this.getAttribute("data-bs-slide-to");
    if (slideIndex) {
      carousel.to(slideIndex);
      carousel._maybeEnableCycle();
      return;
    }
    if (Manipulator.getDataAttribute(this, "slide") === "next") {
      carousel.next();
      carousel._maybeEnableCycle();
      return;
    }
    carousel.prev();
    carousel._maybeEnableCycle();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API$3, () => {
    const carousels = SelectorEngine.find(SELECTOR_DATA_RIDE);
    for (const carousel of carousels) {
      Carousel.getOrCreateInstance(carousel);
    }
  });
  defineJQueryPlugin(Carousel);
  var NAME$b = "collapse";
  var DATA_KEY$7 = "bs.collapse";
  var EVENT_KEY$7 = `.${DATA_KEY$7}`;
  var DATA_API_KEY$4 = ".data-api";
  var EVENT_SHOW$6 = `show${EVENT_KEY$7}`;
  var EVENT_SHOWN$6 = `shown${EVENT_KEY$7}`;
  var EVENT_HIDE$6 = `hide${EVENT_KEY$7}`;
  var EVENT_HIDDEN$6 = `hidden${EVENT_KEY$7}`;
  var EVENT_CLICK_DATA_API$4 = `click${EVENT_KEY$7}${DATA_API_KEY$4}`;
  var CLASS_NAME_SHOW$7 = "show";
  var CLASS_NAME_COLLAPSE = "collapse";
  var CLASS_NAME_COLLAPSING = "collapsing";
  var CLASS_NAME_COLLAPSED = "collapsed";
  var CLASS_NAME_DEEPER_CHILDREN = `:scope .${CLASS_NAME_COLLAPSE} .${CLASS_NAME_COLLAPSE}`;
  var CLASS_NAME_HORIZONTAL = "collapse-horizontal";
  var WIDTH = "width";
  var HEIGHT = "height";
  var SELECTOR_ACTIVES = ".collapse.show, .collapse.collapsing";
  var SELECTOR_DATA_TOGGLE$4 = '[data-bs-toggle="collapse"]';
  var Default$a = {
    parent: null,
    toggle: true
  };
  var DefaultType$a = {
    parent: "(null|element)",
    toggle: "boolean"
  };
  var Collapse = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._isTransitioning = false;
      this._triggerArray = [];
      const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE$4);
      for (const elem of toggleList) {
        const selector = getSelectorFromElement(elem);
        const filterElement = SelectorEngine.find(selector).filter((foundElement) => foundElement === this._element);
        if (selector !== null && filterElement.length) {
          this._triggerArray.push(elem);
        }
      }
      this._initializeChildren();
      if (!this._config.parent) {
        this._addAriaAndCollapsedClass(this._triggerArray, this._isShown());
      }
      if (this._config.toggle) {
        this.toggle();
      }
    }
    static get Default() {
      return Default$a;
    }
    static get DefaultType() {
      return DefaultType$a;
    }
    static get NAME() {
      return NAME$b;
    }
    toggle() {
      if (this._isShown()) {
        this.hide();
      } else {
        this.show();
      }
    }
    show() {
      if (this._isTransitioning || this._isShown()) {
        return;
      }
      let activeChildren = [];
      if (this._config.parent) {
        activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES).filter((element) => element !== this._element).map((element) => Collapse.getOrCreateInstance(element, {
          toggle: false
        }));
      }
      if (activeChildren.length && activeChildren[0]._isTransitioning) {
        return;
      }
      const startEvent = EventHandler.trigger(this._element, EVENT_SHOW$6);
      if (startEvent.defaultPrevented) {
        return;
      }
      for (const activeInstance of activeChildren) {
        activeInstance.hide();
      }
      const dimension = this._getDimension();
      this._element.classList.remove(CLASS_NAME_COLLAPSE);
      this._element.classList.add(CLASS_NAME_COLLAPSING);
      this._element.style[dimension] = 0;
      this._addAriaAndCollapsedClass(this._triggerArray, true);
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        this._element.classList.remove(CLASS_NAME_COLLAPSING);
        this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);
        this._element.style[dimension] = "";
        EventHandler.trigger(this._element, EVENT_SHOWN$6);
      };
      const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
      const scrollSize = `scroll${capitalizedDimension}`;
      this._queueCallback(complete, this._element, true);
      this._element.style[dimension] = `${this._element[scrollSize]}px`;
    }
    hide() {
      if (this._isTransitioning || !this._isShown()) {
        return;
      }
      const startEvent = EventHandler.trigger(this._element, EVENT_HIDE$6);
      if (startEvent.defaultPrevented) {
        return;
      }
      const dimension = this._getDimension();
      this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`;
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_COLLAPSING);
      this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);
      for (const trigger of this._triggerArray) {
        const element = getElementFromSelector(trigger);
        if (element && !this._isShown(element)) {
          this._addAriaAndCollapsedClass([trigger], false);
        }
      }
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        this._element.classList.remove(CLASS_NAME_COLLAPSING);
        this._element.classList.add(CLASS_NAME_COLLAPSE);
        EventHandler.trigger(this._element, EVENT_HIDDEN$6);
      };
      this._element.style[dimension] = "";
      this._queueCallback(complete, this._element, true);
    }
    _isShown(element = this._element) {
      return element.classList.contains(CLASS_NAME_SHOW$7);
    }
    _configAfterMerge(config2) {
      config2.toggle = Boolean(config2.toggle);
      config2.parent = getElement(config2.parent);
      return config2;
    }
    _getDimension() {
      return this._element.classList.contains(CLASS_NAME_HORIZONTAL) ? WIDTH : HEIGHT;
    }
    _initializeChildren() {
      if (!this._config.parent) {
        return;
      }
      const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE$4);
      for (const element of children) {
        const selected = getElementFromSelector(element);
        if (selected) {
          this._addAriaAndCollapsedClass([element], this._isShown(selected));
        }
      }
    }
    _getFirstLevelChildren(selector) {
      const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent);
      return SelectorEngine.find(selector, this._config.parent).filter((element) => !children.includes(element));
    }
    _addAriaAndCollapsedClass(triggerArray, isOpen) {
      if (!triggerArray.length) {
        return;
      }
      for (const element of triggerArray) {
        element.classList.toggle(CLASS_NAME_COLLAPSED, !isOpen);
        element.setAttribute("aria-expanded", isOpen);
      }
    }
    static jQueryInterface(config2) {
      const _config = {};
      if (typeof config2 === "string" && /show|hide/.test(config2)) {
        _config.toggle = false;
      }
      return this.each(function() {
        const data = Collapse.getOrCreateInstance(this, _config);
        if (typeof config2 === "string") {
          if (typeof data[config2] === "undefined") {
            throw new TypeError(`No method named "${config2}"`);
          }
          data[config2]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$4, SELECTOR_DATA_TOGGLE$4, function(event) {
    if (event.target.tagName === "A" || event.delegateTarget && event.delegateTarget.tagName === "A") {
      event.preventDefault();
    }
    const selector = getSelectorFromElement(this);
    const selectorElements = SelectorEngine.find(selector);
    for (const element of selectorElements) {
      Collapse.getOrCreateInstance(element, {
        toggle: false
      }).toggle();
    }
  });
  defineJQueryPlugin(Collapse);
  var NAME$a = "dropdown";
  var DATA_KEY$6 = "bs.dropdown";
  var EVENT_KEY$6 = `.${DATA_KEY$6}`;
  var DATA_API_KEY$3 = ".data-api";
  var ESCAPE_KEY$2 = "Escape";
  var TAB_KEY$1 = "Tab";
  var ARROW_UP_KEY$1 = "ArrowUp";
  var ARROW_DOWN_KEY$1 = "ArrowDown";
  var RIGHT_MOUSE_BUTTON = 2;
  var EVENT_HIDE$5 = `hide${EVENT_KEY$6}`;
  var EVENT_HIDDEN$5 = `hidden${EVENT_KEY$6}`;
  var EVENT_SHOW$5 = `show${EVENT_KEY$6}`;
  var EVENT_SHOWN$5 = `shown${EVENT_KEY$6}`;
  var EVENT_CLICK_DATA_API$3 = `click${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var CLASS_NAME_SHOW$6 = "show";
  var CLASS_NAME_DROPUP = "dropup";
  var CLASS_NAME_DROPEND = "dropend";
  var CLASS_NAME_DROPSTART = "dropstart";
  var CLASS_NAME_DROPUP_CENTER = "dropup-center";
  var CLASS_NAME_DROPDOWN_CENTER = "dropdown-center";
  var SELECTOR_DATA_TOGGLE$3 = '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)';
  var SELECTOR_DATA_TOGGLE_SHOWN = `${SELECTOR_DATA_TOGGLE$3}.${CLASS_NAME_SHOW$6}`;
  var SELECTOR_MENU = ".dropdown-menu";
  var SELECTOR_NAVBAR = ".navbar";
  var SELECTOR_NAVBAR_NAV = ".navbar-nav";
  var SELECTOR_VISIBLE_ITEMS = ".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)";
  var PLACEMENT_TOP = isRTL() ? "top-end" : "top-start";
  var PLACEMENT_TOPEND = isRTL() ? "top-start" : "top-end";
  var PLACEMENT_BOTTOM = isRTL() ? "bottom-end" : "bottom-start";
  var PLACEMENT_BOTTOMEND = isRTL() ? "bottom-start" : "bottom-end";
  var PLACEMENT_RIGHT = isRTL() ? "left-start" : "right-start";
  var PLACEMENT_LEFT = isRTL() ? "right-start" : "left-start";
  var PLACEMENT_TOPCENTER = "top";
  var PLACEMENT_BOTTOMCENTER = "bottom";
  var Default$9 = {
    autoClose: true,
    boundary: "clippingParents",
    display: "dynamic",
    offset: [0, 2],
    popperConfig: null,
    reference: "toggle"
  };
  var DefaultType$9 = {
    autoClose: "(boolean|string)",
    boundary: "(string|element)",
    display: "string",
    offset: "(array|string|function)",
    popperConfig: "(null|object|function)",
    reference: "(string|element|object)"
  };
  var Dropdown = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._popper = null;
      this._parent = this._element.parentNode;
      this._menu = SelectorEngine.next(this._element, SELECTOR_MENU)[0] || SelectorEngine.prev(this._element, SELECTOR_MENU)[0];
      this._inNavbar = this._detectNavbar();
    }
    static get Default() {
      return Default$9;
    }
    static get DefaultType() {
      return DefaultType$9;
    }
    static get NAME() {
      return NAME$a;
    }
    toggle() {
      return this._isShown() ? this.hide() : this.show();
    }
    show() {
      if (isDisabled(this._element) || this._isShown()) {
        return;
      }
      const relatedTarget = {
        relatedTarget: this._element
      };
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$5, relatedTarget);
      if (showEvent.defaultPrevented) {
        return;
      }
      this._createPopper();
      if ("ontouchstart" in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.on(element, "mouseover", noop);
        }
      }
      this._element.focus();
      this._element.setAttribute("aria-expanded", true);
      this._menu.classList.add(CLASS_NAME_SHOW$6);
      this._element.classList.add(CLASS_NAME_SHOW$6);
      EventHandler.trigger(this._element, EVENT_SHOWN$5, relatedTarget);
    }
    hide() {
      if (isDisabled(this._element) || !this._isShown()) {
        return;
      }
      const relatedTarget = {
        relatedTarget: this._element
      };
      this._completeHide(relatedTarget);
    }
    dispose() {
      if (this._popper) {
        this._popper.destroy();
      }
      super.dispose();
    }
    update() {
      this._inNavbar = this._detectNavbar();
      if (this._popper) {
        this._popper.update();
      }
    }
    _completeHide(relatedTarget) {
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$5, relatedTarget);
      if (hideEvent.defaultPrevented) {
        return;
      }
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.off(element, "mouseover", noop);
        }
      }
      if (this._popper) {
        this._popper.destroy();
      }
      this._menu.classList.remove(CLASS_NAME_SHOW$6);
      this._element.classList.remove(CLASS_NAME_SHOW$6);
      this._element.setAttribute("aria-expanded", "false");
      Manipulator.removeDataAttribute(this._menu, "popper");
      EventHandler.trigger(this._element, EVENT_HIDDEN$5, relatedTarget);
    }
    _getConfig(config2) {
      config2 = super._getConfig(config2);
      if (typeof config2.reference === "object" && !isElement2(config2.reference) && typeof config2.reference.getBoundingClientRect !== "function") {
        throw new TypeError(`${NAME$a.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
      }
      return config2;
    }
    _createPopper() {
      if (typeof lib_exports === "undefined") {
        throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)");
      }
      let referenceElement = this._element;
      if (this._config.reference === "parent") {
        referenceElement = this._parent;
      } else if (isElement2(this._config.reference)) {
        referenceElement = getElement(this._config.reference);
      } else if (typeof this._config.reference === "object") {
        referenceElement = this._config.reference;
      }
      const popperConfig = this._getPopperConfig();
      this._popper = createPopper3(referenceElement, this._menu, popperConfig);
    }
    _isShown() {
      return this._menu.classList.contains(CLASS_NAME_SHOW$6);
    }
    _getPlacement() {
      const parentDropdown = this._parent;
      if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
        return PLACEMENT_RIGHT;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
        return PLACEMENT_LEFT;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPUP_CENTER)) {
        return PLACEMENT_TOPCENTER;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPDOWN_CENTER)) {
        return PLACEMENT_BOTTOMCENTER;
      }
      const isEnd = getComputedStyle(this._menu).getPropertyValue("--bs-position").trim() === "end";
      if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
        return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP;
      }
      return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM;
    }
    _detectNavbar() {
      return this._element.closest(SELECTOR_NAVBAR) !== null;
    }
    _getOffset() {
      const {
        offset: offset2
      } = this._config;
      if (typeof offset2 === "string") {
        return offset2.split(",").map((value) => Number.parseInt(value, 10));
      }
      if (typeof offset2 === "function") {
        return (popperData) => offset2(popperData, this._element);
      }
      return offset2;
    }
    _getPopperConfig() {
      const defaultBsPopperConfig = {
        placement: this._getPlacement(),
        modifiers: [{
          name: "preventOverflow",
          options: {
            boundary: this._config.boundary
          }
        }, {
          name: "offset",
          options: {
            offset: this._getOffset()
          }
        }]
      };
      if (this._inNavbar || this._config.display === "static") {
        Manipulator.setDataAttribute(this._menu, "popper", "static");
        defaultBsPopperConfig.modifiers = [{
          name: "applyStyles",
          enabled: false
        }];
      }
      return {
        ...defaultBsPopperConfig,
        ...typeof this._config.popperConfig === "function" ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig
      };
    }
    _selectMenuItem({
      key,
      target
    }) {
      const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, this._menu).filter((element) => isVisible(element));
      if (!items.length) {
        return;
      }
      getNextActiveElement(items, target, key === ARROW_DOWN_KEY$1, !items.includes(target)).focus();
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Dropdown.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (typeof data[config2] === "undefined") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2]();
      });
    }
    static clearMenus(event) {
      if (event.button === RIGHT_MOUSE_BUTTON || event.type === "keyup" && event.key !== TAB_KEY$1) {
        return;
      }
      const openToggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE_SHOWN);
      for (const toggle of openToggles) {
        const context = Dropdown.getInstance(toggle);
        if (!context || context._config.autoClose === false) {
          continue;
        }
        const composedPath = event.composedPath();
        const isMenuTarget = composedPath.includes(context._menu);
        if (composedPath.includes(context._element) || context._config.autoClose === "inside" && !isMenuTarget || context._config.autoClose === "outside" && isMenuTarget) {
          continue;
        }
        if (context._menu.contains(event.target) && (event.type === "keyup" && event.key === TAB_KEY$1 || /input|select|option|textarea|form/i.test(event.target.tagName))) {
          continue;
        }
        const relatedTarget = {
          relatedTarget: context._element
        };
        if (event.type === "click") {
          relatedTarget.clickEvent = event;
        }
        context._completeHide(relatedTarget);
      }
    }
    static dataApiKeydownHandler(event) {
      const isInput = /input|textarea/i.test(event.target.tagName);
      const isEscapeEvent = event.key === ESCAPE_KEY$2;
      const isUpOrDownEvent = [ARROW_UP_KEY$1, ARROW_DOWN_KEY$1].includes(event.key);
      if (!isUpOrDownEvent && !isEscapeEvent) {
        return;
      }
      if (isInput && !isEscapeEvent) {
        return;
      }
      event.preventDefault();
      const getToggleButton = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.next(this, SELECTOR_DATA_TOGGLE$3)[0];
      const instance = Dropdown.getOrCreateInstance(getToggleButton);
      if (isUpOrDownEvent) {
        event.stopPropagation();
        instance.show();
        instance._selectMenuItem(event);
        return;
      }
      if (instance._isShown()) {
        event.stopPropagation();
        instance.hide();
        getToggleButton.focus();
      }
    }
  };
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE$3, Dropdown.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Dropdown.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_CLICK_DATA_API$3, Dropdown.clearMenus);
  EventHandler.on(document, EVENT_KEYUP_DATA_API, Dropdown.clearMenus);
  EventHandler.on(document, EVENT_CLICK_DATA_API$3, SELECTOR_DATA_TOGGLE$3, function(event) {
    event.preventDefault();
    Dropdown.getOrCreateInstance(this).toggle();
  });
  defineJQueryPlugin(Dropdown);
  var SELECTOR_FIXED_CONTENT = ".fixed-top, .fixed-bottom, .is-fixed, .sticky-top";
  var SELECTOR_STICKY_CONTENT = ".sticky-top";
  var PROPERTY_PADDING = "padding-right";
  var PROPERTY_MARGIN = "margin-right";
  var ScrollBarHelper = class {
    constructor() {
      this._element = document.body;
    }
    getWidth() {
      const documentWidth = document.documentElement.clientWidth;
      return Math.abs(window.innerWidth - documentWidth);
    }
    hide() {
      const width = this.getWidth();
      this._disableOverFlow();
      this._setElementAttributes(this._element, PROPERTY_PADDING, (calculatedValue) => calculatedValue + width);
      this._setElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING, (calculatedValue) => calculatedValue + width);
      this._setElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN, (calculatedValue) => calculatedValue - width);
    }
    reset() {
      this._resetElementAttributes(this._element, "overflow");
      this._resetElementAttributes(this._element, PROPERTY_PADDING);
      this._resetElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING);
      this._resetElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN);
    }
    isOverflowing() {
      return this.getWidth() > 0;
    }
    _disableOverFlow() {
      this._saveInitialAttribute(this._element, "overflow");
      this._element.style.overflow = "hidden";
    }
    _setElementAttributes(selector, styleProperty, callback) {
      const scrollbarWidth = this.getWidth();
      const manipulationCallBack = (element) => {
        if (element !== this._element && window.innerWidth > element.clientWidth + scrollbarWidth) {
          return;
        }
        this._saveInitialAttribute(element, styleProperty);
        const calculatedValue = window.getComputedStyle(element).getPropertyValue(styleProperty);
        element.style.setProperty(styleProperty, `${callback(Number.parseFloat(calculatedValue))}px`);
      };
      this._applyManipulationCallback(selector, manipulationCallBack);
    }
    _saveInitialAttribute(element, styleProperty) {
      const actualValue = element.style.getPropertyValue(styleProperty);
      if (actualValue) {
        Manipulator.setDataAttribute(element, styleProperty, actualValue);
      }
    }
    _resetElementAttributes(selector, styleProperty) {
      const manipulationCallBack = (element) => {
        const value = Manipulator.getDataAttribute(element, styleProperty);
        if (value === null) {
          element.style.removeProperty(styleProperty);
          return;
        }
        Manipulator.removeDataAttribute(element, styleProperty);
        element.style.setProperty(styleProperty, value);
      };
      this._applyManipulationCallback(selector, manipulationCallBack);
    }
    _applyManipulationCallback(selector, callBack) {
      if (isElement2(selector)) {
        callBack(selector);
        return;
      }
      for (const sel of SelectorEngine.find(selector, this._element)) {
        callBack(sel);
      }
    }
  };
  var NAME$9 = "backdrop";
  var CLASS_NAME_FADE$4 = "fade";
  var CLASS_NAME_SHOW$5 = "show";
  var EVENT_MOUSEDOWN = `mousedown.bs.${NAME$9}`;
  var Default$8 = {
    className: "modal-backdrop",
    clickCallback: null,
    isAnimated: false,
    isVisible: true,
    rootElement: "body"
  };
  var DefaultType$8 = {
    className: "string",
    clickCallback: "(function|null)",
    isAnimated: "boolean",
    isVisible: "boolean",
    rootElement: "(element|string)"
  };
  var Backdrop = class extends Config {
    constructor(config2) {
      super();
      this._config = this._getConfig(config2);
      this._isAppended = false;
      this._element = null;
    }
    static get Default() {
      return Default$8;
    }
    static get DefaultType() {
      return DefaultType$8;
    }
    static get NAME() {
      return NAME$9;
    }
    show(callback) {
      if (!this._config.isVisible) {
        execute(callback);
        return;
      }
      this._append();
      const element = this._getElement();
      if (this._config.isAnimated) {
        reflow(element);
      }
      element.classList.add(CLASS_NAME_SHOW$5);
      this._emulateAnimation(() => {
        execute(callback);
      });
    }
    hide(callback) {
      if (!this._config.isVisible) {
        execute(callback);
        return;
      }
      this._getElement().classList.remove(CLASS_NAME_SHOW$5);
      this._emulateAnimation(() => {
        this.dispose();
        execute(callback);
      });
    }
    dispose() {
      if (!this._isAppended) {
        return;
      }
      EventHandler.off(this._element, EVENT_MOUSEDOWN);
      this._element.remove();
      this._isAppended = false;
    }
    _getElement() {
      if (!this._element) {
        const backdrop = document.createElement("div");
        backdrop.className = this._config.className;
        if (this._config.isAnimated) {
          backdrop.classList.add(CLASS_NAME_FADE$4);
        }
        this._element = backdrop;
      }
      return this._element;
    }
    _configAfterMerge(config2) {
      config2.rootElement = getElement(config2.rootElement);
      return config2;
    }
    _append() {
      if (this._isAppended) {
        return;
      }
      const element = this._getElement();
      this._config.rootElement.append(element);
      EventHandler.on(element, EVENT_MOUSEDOWN, () => {
        execute(this._config.clickCallback);
      });
      this._isAppended = true;
    }
    _emulateAnimation(callback) {
      executeAfterTransition(callback, this._getElement(), this._config.isAnimated);
    }
  };
  var NAME$8 = "focustrap";
  var DATA_KEY$5 = "bs.focustrap";
  var EVENT_KEY$5 = `.${DATA_KEY$5}`;
  var EVENT_FOCUSIN$2 = `focusin${EVENT_KEY$5}`;
  var EVENT_KEYDOWN_TAB = `keydown.tab${EVENT_KEY$5}`;
  var TAB_KEY = "Tab";
  var TAB_NAV_FORWARD = "forward";
  var TAB_NAV_BACKWARD = "backward";
  var Default$7 = {
    autofocus: true,
    trapElement: null
  };
  var DefaultType$7 = {
    autofocus: "boolean",
    trapElement: "element"
  };
  var FocusTrap = class extends Config {
    constructor(config2) {
      super();
      this._config = this._getConfig(config2);
      this._isActive = false;
      this._lastTabNavDirection = null;
    }
    static get Default() {
      return Default$7;
    }
    static get DefaultType() {
      return DefaultType$7;
    }
    static get NAME() {
      return NAME$8;
    }
    activate() {
      if (this._isActive) {
        return;
      }
      if (this._config.autofocus) {
        this._config.trapElement.focus();
      }
      EventHandler.off(document, EVENT_KEY$5);
      EventHandler.on(document, EVENT_FOCUSIN$2, (event) => this._handleFocusin(event));
      EventHandler.on(document, EVENT_KEYDOWN_TAB, (event) => this._handleKeydown(event));
      this._isActive = true;
    }
    deactivate() {
      if (!this._isActive) {
        return;
      }
      this._isActive = false;
      EventHandler.off(document, EVENT_KEY$5);
    }
    _handleFocusin(event) {
      const {
        trapElement
      } = this._config;
      if (event.target === document || event.target === trapElement || trapElement.contains(event.target)) {
        return;
      }
      const elements = SelectorEngine.focusableChildren(trapElement);
      if (elements.length === 0) {
        trapElement.focus();
      } else if (this._lastTabNavDirection === TAB_NAV_BACKWARD) {
        elements[elements.length - 1].focus();
      } else {
        elements[0].focus();
      }
    }
    _handleKeydown(event) {
      if (event.key !== TAB_KEY) {
        return;
      }
      this._lastTabNavDirection = event.shiftKey ? TAB_NAV_BACKWARD : TAB_NAV_FORWARD;
    }
  };
  var NAME$7 = "modal";
  var DATA_KEY$4 = "bs.modal";
  var EVENT_KEY$4 = `.${DATA_KEY$4}`;
  var DATA_API_KEY$2 = ".data-api";
  var ESCAPE_KEY$1 = "Escape";
  var EVENT_HIDE$4 = `hide${EVENT_KEY$4}`;
  var EVENT_HIDE_PREVENTED$1 = `hidePrevented${EVENT_KEY$4}`;
  var EVENT_HIDDEN$4 = `hidden${EVENT_KEY$4}`;
  var EVENT_SHOW$4 = `show${EVENT_KEY$4}`;
  var EVENT_SHOWN$4 = `shown${EVENT_KEY$4}`;
  var EVENT_RESIZE$1 = `resize${EVENT_KEY$4}`;
  var EVENT_CLICK_DISMISS = `click.dismiss${EVENT_KEY$4}`;
  var EVENT_MOUSEDOWN_DISMISS = `mousedown.dismiss${EVENT_KEY$4}`;
  var EVENT_KEYDOWN_DISMISS$1 = `keydown.dismiss${EVENT_KEY$4}`;
  var EVENT_CLICK_DATA_API$2 = `click${EVENT_KEY$4}${DATA_API_KEY$2}`;
  var CLASS_NAME_OPEN = "modal-open";
  var CLASS_NAME_FADE$3 = "fade";
  var CLASS_NAME_SHOW$4 = "show";
  var CLASS_NAME_STATIC = "modal-static";
  var OPEN_SELECTOR$1 = ".modal.show";
  var SELECTOR_DIALOG = ".modal-dialog";
  var SELECTOR_MODAL_BODY = ".modal-body";
  var SELECTOR_DATA_TOGGLE$2 = '[data-bs-toggle="modal"]';
  var Default$6 = {
    backdrop: true,
    focus: true,
    keyboard: true
  };
  var DefaultType$6 = {
    backdrop: "(boolean|string)",
    focus: "boolean",
    keyboard: "boolean"
  };
  var Modal = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element);
      this._backdrop = this._initializeBackDrop();
      this._focustrap = this._initializeFocusTrap();
      this._isShown = false;
      this._isTransitioning = false;
      this._scrollBar = new ScrollBarHelper();
      this._addEventListeners();
    }
    static get Default() {
      return Default$6;
    }
    static get DefaultType() {
      return DefaultType$6;
    }
    static get NAME() {
      return NAME$7;
    }
    toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    }
    show(relatedTarget) {
      if (this._isShown || this._isTransitioning) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$4, {
        relatedTarget
      });
      if (showEvent.defaultPrevented) {
        return;
      }
      this._isShown = true;
      this._isTransitioning = true;
      this._scrollBar.hide();
      document.body.classList.add(CLASS_NAME_OPEN);
      this._adjustDialog();
      this._backdrop.show(() => this._showElement(relatedTarget));
    }
    hide() {
      if (!this._isShown || this._isTransitioning) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$4);
      if (hideEvent.defaultPrevented) {
        return;
      }
      this._isShown = false;
      this._isTransitioning = true;
      this._focustrap.deactivate();
      this._element.classList.remove(CLASS_NAME_SHOW$4);
      this._queueCallback(() => this._hideModal(), this._element, this._isAnimated());
    }
    dispose() {
      for (const htmlElement of [window, this._dialog]) {
        EventHandler.off(htmlElement, EVENT_KEY$4);
      }
      this._backdrop.dispose();
      this._focustrap.deactivate();
      super.dispose();
    }
    handleUpdate() {
      this._adjustDialog();
    }
    _initializeBackDrop() {
      return new Backdrop({
        isVisible: Boolean(this._config.backdrop),
        isAnimated: this._isAnimated()
      });
    }
    _initializeFocusTrap() {
      return new FocusTrap({
        trapElement: this._element
      });
    }
    _showElement(relatedTarget) {
      if (!document.body.contains(this._element)) {
        document.body.append(this._element);
      }
      this._element.style.display = "block";
      this._element.removeAttribute("aria-hidden");
      this._element.setAttribute("aria-modal", true);
      this._element.setAttribute("role", "dialog");
      this._element.scrollTop = 0;
      const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog);
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_SHOW$4);
      const transitionComplete = () => {
        if (this._config.focus) {
          this._focustrap.activate();
        }
        this._isTransitioning = false;
        EventHandler.trigger(this._element, EVENT_SHOWN$4, {
          relatedTarget
        });
      };
      this._queueCallback(transitionComplete, this._dialog, this._isAnimated());
    }
    _addEventListeners() {
      EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS$1, (event) => {
        if (event.key !== ESCAPE_KEY$1) {
          return;
        }
        if (this._config.keyboard) {
          event.preventDefault();
          this.hide();
          return;
        }
        this._triggerBackdropTransition();
      });
      EventHandler.on(window, EVENT_RESIZE$1, () => {
        if (this._isShown && !this._isTransitioning) {
          this._adjustDialog();
        }
      });
      EventHandler.on(this._element, EVENT_MOUSEDOWN_DISMISS, (event) => {
        EventHandler.one(this._element, EVENT_CLICK_DISMISS, (event2) => {
          if (this._dialog.contains(event.target) || this._dialog.contains(event2.target)) {
            return;
          }
          if (this._config.backdrop === "static") {
            this._triggerBackdropTransition();
            return;
          }
          if (this._config.backdrop) {
            this.hide();
          }
        });
      });
    }
    _hideModal() {
      this._element.style.display = "none";
      this._element.setAttribute("aria-hidden", true);
      this._element.removeAttribute("aria-modal");
      this._element.removeAttribute("role");
      this._isTransitioning = false;
      this._backdrop.hide(() => {
        document.body.classList.remove(CLASS_NAME_OPEN);
        this._resetAdjustments();
        this._scrollBar.reset();
        EventHandler.trigger(this._element, EVENT_HIDDEN$4);
      });
    }
    _isAnimated() {
      return this._element.classList.contains(CLASS_NAME_FADE$3);
    }
    _triggerBackdropTransition() {
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED$1);
      if (hideEvent.defaultPrevented) {
        return;
      }
      const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
      const initialOverflowY = this._element.style.overflowY;
      if (initialOverflowY === "hidden" || this._element.classList.contains(CLASS_NAME_STATIC)) {
        return;
      }
      if (!isModalOverflowing) {
        this._element.style.overflowY = "hidden";
      }
      this._element.classList.add(CLASS_NAME_STATIC);
      this._queueCallback(() => {
        this._element.classList.remove(CLASS_NAME_STATIC);
        this._queueCallback(() => {
          this._element.style.overflowY = initialOverflowY;
        }, this._dialog);
      }, this._dialog);
      this._element.focus();
    }
    _adjustDialog() {
      const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
      const scrollbarWidth = this._scrollBar.getWidth();
      const isBodyOverflowing = scrollbarWidth > 0;
      if (isBodyOverflowing && !isModalOverflowing) {
        const property = isRTL() ? "paddingLeft" : "paddingRight";
        this._element.style[property] = `${scrollbarWidth}px`;
      }
      if (!isBodyOverflowing && isModalOverflowing) {
        const property = isRTL() ? "paddingRight" : "paddingLeft";
        this._element.style[property] = `${scrollbarWidth}px`;
      }
    }
    _resetAdjustments() {
      this._element.style.paddingLeft = "";
      this._element.style.paddingRight = "";
    }
    static jQueryInterface(config2, relatedTarget) {
      return this.each(function() {
        const data = Modal.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (typeof data[config2] === "undefined") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2](relatedTarget);
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$2, SELECTOR_DATA_TOGGLE$2, function(event) {
    const target = getElementFromSelector(this);
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    EventHandler.one(target, EVENT_SHOW$4, (showEvent) => {
      if (showEvent.defaultPrevented) {
        return;
      }
      EventHandler.one(target, EVENT_HIDDEN$4, () => {
        if (isVisible(this)) {
          this.focus();
        }
      });
    });
    const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR$1);
    if (alreadyOpen) {
      Modal.getInstance(alreadyOpen).hide();
    }
    const data = Modal.getOrCreateInstance(target);
    data.toggle(this);
  });
  enableDismissTrigger(Modal);
  defineJQueryPlugin(Modal);
  var NAME$6 = "offcanvas";
  var DATA_KEY$3 = "bs.offcanvas";
  var EVENT_KEY$3 = `.${DATA_KEY$3}`;
  var DATA_API_KEY$1 = ".data-api";
  var EVENT_LOAD_DATA_API$2 = `load${EVENT_KEY$3}${DATA_API_KEY$1}`;
  var ESCAPE_KEY = "Escape";
  var CLASS_NAME_SHOW$3 = "show";
  var CLASS_NAME_SHOWING$1 = "showing";
  var CLASS_NAME_HIDING = "hiding";
  var CLASS_NAME_BACKDROP = "offcanvas-backdrop";
  var OPEN_SELECTOR = ".offcanvas.show";
  var EVENT_SHOW$3 = `show${EVENT_KEY$3}`;
  var EVENT_SHOWN$3 = `shown${EVENT_KEY$3}`;
  var EVENT_HIDE$3 = `hide${EVENT_KEY$3}`;
  var EVENT_HIDE_PREVENTED = `hidePrevented${EVENT_KEY$3}`;
  var EVENT_HIDDEN$3 = `hidden${EVENT_KEY$3}`;
  var EVENT_RESIZE = `resize${EVENT_KEY$3}`;
  var EVENT_CLICK_DATA_API$1 = `click${EVENT_KEY$3}${DATA_API_KEY$1}`;
  var EVENT_KEYDOWN_DISMISS = `keydown.dismiss${EVENT_KEY$3}`;
  var SELECTOR_DATA_TOGGLE$1 = '[data-bs-toggle="offcanvas"]';
  var Default$5 = {
    backdrop: true,
    keyboard: true,
    scroll: false
  };
  var DefaultType$5 = {
    backdrop: "(boolean|string)",
    keyboard: "boolean",
    scroll: "boolean"
  };
  var Offcanvas = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._isShown = false;
      this._backdrop = this._initializeBackDrop();
      this._focustrap = this._initializeFocusTrap();
      this._addEventListeners();
    }
    static get Default() {
      return Default$5;
    }
    static get DefaultType() {
      return DefaultType$5;
    }
    static get NAME() {
      return NAME$6;
    }
    toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    }
    show(relatedTarget) {
      if (this._isShown) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$3, {
        relatedTarget
      });
      if (showEvent.defaultPrevented) {
        return;
      }
      this._isShown = true;
      this._backdrop.show();
      if (!this._config.scroll) {
        new ScrollBarHelper().hide();
      }
      this._element.setAttribute("aria-modal", true);
      this._element.setAttribute("role", "dialog");
      this._element.classList.add(CLASS_NAME_SHOWING$1);
      const completeCallBack = () => {
        if (!this._config.scroll || this._config.backdrop) {
          this._focustrap.activate();
        }
        this._element.classList.add(CLASS_NAME_SHOW$3);
        this._element.classList.remove(CLASS_NAME_SHOWING$1);
        EventHandler.trigger(this._element, EVENT_SHOWN$3, {
          relatedTarget
        });
      };
      this._queueCallback(completeCallBack, this._element, true);
    }
    hide() {
      if (!this._isShown) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$3);
      if (hideEvent.defaultPrevented) {
        return;
      }
      this._focustrap.deactivate();
      this._element.blur();
      this._isShown = false;
      this._element.classList.add(CLASS_NAME_HIDING);
      this._backdrop.hide();
      const completeCallback = () => {
        this._element.classList.remove(CLASS_NAME_SHOW$3, CLASS_NAME_HIDING);
        this._element.removeAttribute("aria-modal");
        this._element.removeAttribute("role");
        if (!this._config.scroll) {
          new ScrollBarHelper().reset();
        }
        EventHandler.trigger(this._element, EVENT_HIDDEN$3);
      };
      this._queueCallback(completeCallback, this._element, true);
    }
    dispose() {
      this._backdrop.dispose();
      this._focustrap.deactivate();
      super.dispose();
    }
    _initializeBackDrop() {
      const clickCallback = () => {
        if (this._config.backdrop === "static") {
          EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
          return;
        }
        this.hide();
      };
      const isVisible2 = Boolean(this._config.backdrop);
      return new Backdrop({
        className: CLASS_NAME_BACKDROP,
        isVisible: isVisible2,
        isAnimated: true,
        rootElement: this._element.parentNode,
        clickCallback: isVisible2 ? clickCallback : null
      });
    }
    _initializeFocusTrap() {
      return new FocusTrap({
        trapElement: this._element
      });
    }
    _addEventListeners() {
      EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, (event) => {
        if (event.key !== ESCAPE_KEY) {
          return;
        }
        if (!this._config.keyboard) {
          EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
          return;
        }
        this.hide();
      });
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Offcanvas.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (data[config2] === void 0 || config2.startsWith("_") || config2 === "constructor") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2](this);
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$1, SELECTOR_DATA_TOGGLE$1, function(event) {
    const target = getElementFromSelector(this);
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    if (isDisabled(this)) {
      return;
    }
    EventHandler.one(target, EVENT_HIDDEN$3, () => {
      if (isVisible(this)) {
        this.focus();
      }
    });
    const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR);
    if (alreadyOpen && alreadyOpen !== target) {
      Offcanvas.getInstance(alreadyOpen).hide();
    }
    const data = Offcanvas.getOrCreateInstance(target);
    data.toggle(this);
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API$2, () => {
    for (const selector of SelectorEngine.find(OPEN_SELECTOR)) {
      Offcanvas.getOrCreateInstance(selector).show();
    }
  });
  EventHandler.on(window, EVENT_RESIZE, () => {
    for (const element of SelectorEngine.find("[aria-modal][class*=show][class*=offcanvas-]")) {
      if (getComputedStyle(element).position !== "fixed") {
        Offcanvas.getOrCreateInstance(element).hide();
      }
    }
  });
  enableDismissTrigger(Offcanvas);
  defineJQueryPlugin(Offcanvas);
  var uriAttributes = /* @__PURE__ */ new Set(["background", "cite", "href", "itemtype", "longdesc", "poster", "src", "xlink:href"]);
  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
  var SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/i;
  var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i;
  var allowedAttribute = (attribute, allowedAttributeList) => {
    const attributeName = attribute.nodeName.toLowerCase();
    if (allowedAttributeList.includes(attributeName)) {
      if (uriAttributes.has(attributeName)) {
        return Boolean(SAFE_URL_PATTERN.test(attribute.nodeValue) || DATA_URL_PATTERN.test(attribute.nodeValue));
      }
      return true;
    }
    return allowedAttributeList.filter((attributeRegex) => attributeRegex instanceof RegExp).some((regex) => regex.test(attributeName));
  };
  var DefaultAllowlist = {
    "*": ["class", "dir", "id", "lang", "role", ARIA_ATTRIBUTE_PATTERN],
    a: ["target", "href", "title", "rel"],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    div: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ["src", "srcset", "alt", "title", "width", "height"],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
  };
  function sanitizeHtml(unsafeHtml, allowList, sanitizeFunction) {
    if (!unsafeHtml.length) {
      return unsafeHtml;
    }
    if (sanitizeFunction && typeof sanitizeFunction === "function") {
      return sanitizeFunction(unsafeHtml);
    }
    const domParser = new window.DOMParser();
    const createdDocument = domParser.parseFromString(unsafeHtml, "text/html");
    const elements = [].concat(...createdDocument.body.querySelectorAll("*"));
    for (const element of elements) {
      const elementName = element.nodeName.toLowerCase();
      if (!Object.keys(allowList).includes(elementName)) {
        element.remove();
        continue;
      }
      const attributeList = [].concat(...element.attributes);
      const allowedAttributes = [].concat(allowList["*"] || [], allowList[elementName] || []);
      for (const attribute of attributeList) {
        if (!allowedAttribute(attribute, allowedAttributes)) {
          element.removeAttribute(attribute.nodeName);
        }
      }
    }
    return createdDocument.body.innerHTML;
  }
  var NAME$5 = "TemplateFactory";
  var Default$4 = {
    allowList: DefaultAllowlist,
    content: {},
    extraClass: "",
    html: false,
    sanitize: true,
    sanitizeFn: null,
    template: "<div></div>"
  };
  var DefaultType$4 = {
    allowList: "object",
    content: "object",
    extraClass: "(string|function)",
    html: "boolean",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    template: "string"
  };
  var DefaultContentType = {
    entry: "(string|element|function|null)",
    selector: "(string|element)"
  };
  var TemplateFactory = class extends Config {
    constructor(config2) {
      super();
      this._config = this._getConfig(config2);
    }
    static get Default() {
      return Default$4;
    }
    static get DefaultType() {
      return DefaultType$4;
    }
    static get NAME() {
      return NAME$5;
    }
    getContent() {
      return Object.values(this._config.content).map((config2) => this._resolvePossibleFunction(config2)).filter(Boolean);
    }
    hasContent() {
      return this.getContent().length > 0;
    }
    changeContent(content) {
      this._checkContent(content);
      this._config.content = {
        ...this._config.content,
        ...content
      };
      return this;
    }
    toHtml() {
      const templateWrapper = document.createElement("div");
      templateWrapper.innerHTML = this._maybeSanitize(this._config.template);
      for (const [selector, text] of Object.entries(this._config.content)) {
        this._setContent(templateWrapper, text, selector);
      }
      const template = templateWrapper.children[0];
      const extraClass = this._resolvePossibleFunction(this._config.extraClass);
      if (extraClass) {
        template.classList.add(...extraClass.split(" "));
      }
      return template;
    }
    _typeCheckConfig(config2) {
      super._typeCheckConfig(config2);
      this._checkContent(config2.content);
    }
    _checkContent(arg) {
      for (const [selector, content] of Object.entries(arg)) {
        super._typeCheckConfig({
          selector,
          entry: content
        }, DefaultContentType);
      }
    }
    _setContent(template, content, selector) {
      const templateElement = SelectorEngine.findOne(selector, template);
      if (!templateElement) {
        return;
      }
      content = this._resolvePossibleFunction(content);
      if (!content) {
        templateElement.remove();
        return;
      }
      if (isElement2(content)) {
        this._putElementInTemplate(getElement(content), templateElement);
        return;
      }
      if (this._config.html) {
        templateElement.innerHTML = this._maybeSanitize(content);
        return;
      }
      templateElement.textContent = content;
    }
    _maybeSanitize(arg) {
      return this._config.sanitize ? sanitizeHtml(arg, this._config.allowList, this._config.sanitizeFn) : arg;
    }
    _resolvePossibleFunction(arg) {
      return typeof arg === "function" ? arg(this) : arg;
    }
    _putElementInTemplate(element, templateElement) {
      if (this._config.html) {
        templateElement.innerHTML = "";
        templateElement.append(element);
        return;
      }
      templateElement.textContent = element.textContent;
    }
  };
  var NAME$4 = "tooltip";
  var DISALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set(["sanitize", "allowList", "sanitizeFn"]);
  var CLASS_NAME_FADE$2 = "fade";
  var CLASS_NAME_MODAL = "modal";
  var CLASS_NAME_SHOW$2 = "show";
  var SELECTOR_TOOLTIP_INNER = ".tooltip-inner";
  var SELECTOR_MODAL = `.${CLASS_NAME_MODAL}`;
  var EVENT_MODAL_HIDE = "hide.bs.modal";
  var TRIGGER_HOVER = "hover";
  var TRIGGER_FOCUS = "focus";
  var TRIGGER_CLICK = "click";
  var TRIGGER_MANUAL = "manual";
  var EVENT_HIDE$2 = "hide";
  var EVENT_HIDDEN$2 = "hidden";
  var EVENT_SHOW$2 = "show";
  var EVENT_SHOWN$2 = "shown";
  var EVENT_INSERTED = "inserted";
  var EVENT_CLICK$1 = "click";
  var EVENT_FOCUSIN$1 = "focusin";
  var EVENT_FOCUSOUT$1 = "focusout";
  var EVENT_MOUSEENTER = "mouseenter";
  var EVENT_MOUSELEAVE = "mouseleave";
  var AttachmentMap = {
    AUTO: "auto",
    TOP: "top",
    RIGHT: isRTL() ? "left" : "right",
    BOTTOM: "bottom",
    LEFT: isRTL() ? "right" : "left"
  };
  var Default$3 = {
    allowList: DefaultAllowlist,
    animation: true,
    boundary: "clippingParents",
    container: false,
    customClass: "",
    delay: 0,
    fallbackPlacements: ["top", "right", "bottom", "left"],
    html: false,
    offset: [0, 0],
    placement: "top",
    popperConfig: null,
    sanitize: true,
    sanitizeFn: null,
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    title: "",
    trigger: "hover focus"
  };
  var DefaultType$3 = {
    allowList: "object",
    animation: "boolean",
    boundary: "(string|element)",
    container: "(string|element|boolean)",
    customClass: "(string|function)",
    delay: "(number|object)",
    fallbackPlacements: "array",
    html: "boolean",
    offset: "(array|string|function)",
    placement: "(string|function)",
    popperConfig: "(null|object|function)",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    selector: "(string|boolean)",
    template: "string",
    title: "(string|element|function)",
    trigger: "string"
  };
  var Tooltip = class extends BaseComponent {
    constructor(element, config2) {
      if (typeof lib_exports === "undefined") {
        throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)");
      }
      super(element, config2);
      this._isEnabled = true;
      this._timeout = 0;
      this._isHovered = null;
      this._activeTrigger = {};
      this._popper = null;
      this._templateFactory = null;
      this._newContent = null;
      this.tip = null;
      this._setListeners();
    }
    static get Default() {
      return Default$3;
    }
    static get DefaultType() {
      return DefaultType$3;
    }
    static get NAME() {
      return NAME$4;
    }
    enable() {
      this._isEnabled = true;
    }
    disable() {
      this._isEnabled = false;
    }
    toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    }
    toggle(event) {
      if (!this._isEnabled) {
        return;
      }
      if (event) {
        const context = this._initializeOnDelegatedTarget(event);
        context._activeTrigger.click = !context._activeTrigger.click;
        if (context._isWithActiveTrigger()) {
          context._enter();
        } else {
          context._leave();
        }
        return;
      }
      if (this._isShown()) {
        this._leave();
        return;
      }
      this._enter();
    }
    dispose() {
      clearTimeout(this._timeout);
      EventHandler.off(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
      if (this.tip) {
        this.tip.remove();
      }
      if (this._config.originalTitle) {
        this._element.setAttribute("title", this._config.originalTitle);
      }
      this._disposePopper();
      super.dispose();
    }
    show() {
      if (this._element.style.display === "none") {
        throw new Error("Please use show on visible elements");
      }
      if (!(this._isWithContent() && this._isEnabled)) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOW$2));
      const shadowRoot = findShadowRoot(this._element);
      const isInTheDom = (shadowRoot || this._element.ownerDocument.documentElement).contains(this._element);
      if (showEvent.defaultPrevented || !isInTheDom) {
        return;
      }
      if (this.tip) {
        this.tip.remove();
        this.tip = null;
      }
      const tip = this._getTipElement();
      this._element.setAttribute("aria-describedby", tip.getAttribute("id"));
      const {
        container
      } = this._config;
      if (!this._element.ownerDocument.documentElement.contains(this.tip)) {
        container.append(tip);
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_INSERTED));
      }
      if (this._popper) {
        this._popper.update();
      } else {
        this._popper = this._createPopper(tip);
      }
      tip.classList.add(CLASS_NAME_SHOW$2);
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.on(element, "mouseover", noop);
        }
      }
      const complete = () => {
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOWN$2));
        if (this._isHovered === false) {
          this._leave();
        }
        this._isHovered = false;
      };
      this._queueCallback(complete, this.tip, this._isAnimated());
    }
    hide() {
      if (!this._isShown()) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDE$2));
      if (hideEvent.defaultPrevented) {
        return;
      }
      const tip = this._getTipElement();
      tip.classList.remove(CLASS_NAME_SHOW$2);
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.off(element, "mouseover", noop);
        }
      }
      this._activeTrigger[TRIGGER_CLICK] = false;
      this._activeTrigger[TRIGGER_FOCUS] = false;
      this._activeTrigger[TRIGGER_HOVER] = false;
      this._isHovered = null;
      const complete = () => {
        if (this._isWithActiveTrigger()) {
          return;
        }
        if (!this._isHovered) {
          tip.remove();
        }
        this._element.removeAttribute("aria-describedby");
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDDEN$2));
        this._disposePopper();
      };
      this._queueCallback(complete, this.tip, this._isAnimated());
    }
    update() {
      if (this._popper) {
        this._popper.update();
      }
    }
    _isWithContent() {
      return Boolean(this._getTitle());
    }
    _getTipElement() {
      if (!this.tip) {
        this.tip = this._createTipElement(this._newContent || this._getContentForTemplate());
      }
      return this.tip;
    }
    _createTipElement(content) {
      const tip = this._getTemplateFactory(content).toHtml();
      if (!tip) {
        return null;
      }
      tip.classList.remove(CLASS_NAME_FADE$2, CLASS_NAME_SHOW$2);
      tip.classList.add(`bs-${this.constructor.NAME}-auto`);
      const tipId = getUID(this.constructor.NAME).toString();
      tip.setAttribute("id", tipId);
      if (this._isAnimated()) {
        tip.classList.add(CLASS_NAME_FADE$2);
      }
      return tip;
    }
    setContent(content) {
      this._newContent = content;
      if (this._isShown()) {
        this._disposePopper();
        this.show();
      }
    }
    _getTemplateFactory(content) {
      if (this._templateFactory) {
        this._templateFactory.changeContent(content);
      } else {
        this._templateFactory = new TemplateFactory({
          ...this._config,
          content,
          extraClass: this._resolvePossibleFunction(this._config.customClass)
        });
      }
      return this._templateFactory;
    }
    _getContentForTemplate() {
      return {
        [SELECTOR_TOOLTIP_INNER]: this._getTitle()
      };
    }
    _getTitle() {
      return this._resolvePossibleFunction(this._config.title) || this._config.originalTitle;
    }
    _initializeOnDelegatedTarget(event) {
      return this.constructor.getOrCreateInstance(event.delegateTarget, this._getDelegateConfig());
    }
    _isAnimated() {
      return this._config.animation || this.tip && this.tip.classList.contains(CLASS_NAME_FADE$2);
    }
    _isShown() {
      return this.tip && this.tip.classList.contains(CLASS_NAME_SHOW$2);
    }
    _createPopper(tip) {
      const placement = typeof this._config.placement === "function" ? this._config.placement.call(this, tip, this._element) : this._config.placement;
      const attachment = AttachmentMap[placement.toUpperCase()];
      return createPopper3(this._element, tip, this._getPopperConfig(attachment));
    }
    _getOffset() {
      const {
        offset: offset2
      } = this._config;
      if (typeof offset2 === "string") {
        return offset2.split(",").map((value) => Number.parseInt(value, 10));
      }
      if (typeof offset2 === "function") {
        return (popperData) => offset2(popperData, this._element);
      }
      return offset2;
    }
    _resolvePossibleFunction(arg) {
      return typeof arg === "function" ? arg.call(this._element) : arg;
    }
    _getPopperConfig(attachment) {
      const defaultBsPopperConfig = {
        placement: attachment,
        modifiers: [{
          name: "flip",
          options: {
            fallbackPlacements: this._config.fallbackPlacements
          }
        }, {
          name: "offset",
          options: {
            offset: this._getOffset()
          }
        }, {
          name: "preventOverflow",
          options: {
            boundary: this._config.boundary
          }
        }, {
          name: "arrow",
          options: {
            element: `.${this.constructor.NAME}-arrow`
          }
        }, {
          name: "preSetPlacement",
          enabled: true,
          phase: "beforeMain",
          fn: (data) => {
            this._getTipElement().setAttribute("data-popper-placement", data.state.placement);
          }
        }]
      };
      return {
        ...defaultBsPopperConfig,
        ...typeof this._config.popperConfig === "function" ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig
      };
    }
    _setListeners() {
      const triggers = this._config.trigger.split(" ");
      for (const trigger of triggers) {
        if (trigger === "click") {
          EventHandler.on(this._element, this.constructor.eventName(EVENT_CLICK$1), this._config.selector, (event) => this.toggle(event));
        } else if (trigger !== TRIGGER_MANUAL) {
          const eventIn = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSEENTER) : this.constructor.eventName(EVENT_FOCUSIN$1);
          const eventOut = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSELEAVE) : this.constructor.eventName(EVENT_FOCUSOUT$1);
          EventHandler.on(this._element, eventIn, this._config.selector, (event) => {
            const context = this._initializeOnDelegatedTarget(event);
            context._activeTrigger[event.type === "focusin" ? TRIGGER_FOCUS : TRIGGER_HOVER] = true;
            context._enter();
          });
          EventHandler.on(this._element, eventOut, this._config.selector, (event) => {
            const context = this._initializeOnDelegatedTarget(event);
            context._activeTrigger[event.type === "focusout" ? TRIGGER_FOCUS : TRIGGER_HOVER] = context._element.contains(event.relatedTarget);
            context._leave();
          });
        }
      }
      this._hideModalHandler = () => {
        if (this._element) {
          this.hide();
        }
      };
      EventHandler.on(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
      if (this._config.selector) {
        this._config = {
          ...this._config,
          trigger: "manual",
          selector: ""
        };
      } else {
        this._fixTitle();
      }
    }
    _fixTitle() {
      const title = this._config.originalTitle;
      if (!title) {
        return;
      }
      if (!this._element.getAttribute("aria-label") && !this._element.textContent.trim()) {
        this._element.setAttribute("aria-label", title);
      }
      this._element.removeAttribute("title");
    }
    _enter() {
      if (this._isShown() || this._isHovered) {
        this._isHovered = true;
        return;
      }
      this._isHovered = true;
      this._setTimeout(() => {
        if (this._isHovered) {
          this.show();
        }
      }, this._config.delay.show);
    }
    _leave() {
      if (this._isWithActiveTrigger()) {
        return;
      }
      this._isHovered = false;
      this._setTimeout(() => {
        if (!this._isHovered) {
          this.hide();
        }
      }, this._config.delay.hide);
    }
    _setTimeout(handler, timeout) {
      clearTimeout(this._timeout);
      this._timeout = setTimeout(handler, timeout);
    }
    _isWithActiveTrigger() {
      return Object.values(this._activeTrigger).includes(true);
    }
    _getConfig(config2) {
      const dataAttributes = Manipulator.getDataAttributes(this._element);
      for (const dataAttribute of Object.keys(dataAttributes)) {
        if (DISALLOWED_ATTRIBUTES.has(dataAttribute)) {
          delete dataAttributes[dataAttribute];
        }
      }
      config2 = {
        ...dataAttributes,
        ...typeof config2 === "object" && config2 ? config2 : {}
      };
      config2 = this._mergeConfigObj(config2);
      config2 = this._configAfterMerge(config2);
      this._typeCheckConfig(config2);
      return config2;
    }
    _configAfterMerge(config2) {
      config2.container = config2.container === false ? document.body : getElement(config2.container);
      if (typeof config2.delay === "number") {
        config2.delay = {
          show: config2.delay,
          hide: config2.delay
        };
      }
      config2.originalTitle = this._element.getAttribute("title") || "";
      if (typeof config2.title === "number") {
        config2.title = config2.title.toString();
      }
      if (typeof config2.content === "number") {
        config2.content = config2.content.toString();
      }
      return config2;
    }
    _getDelegateConfig() {
      const config2 = {};
      for (const key in this._config) {
        if (this.constructor.Default[key] !== this._config[key]) {
          config2[key] = this._config[key];
        }
      }
      return config2;
    }
    _disposePopper() {
      if (this._popper) {
        this._popper.destroy();
        this._popper = null;
      }
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Tooltip.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (typeof data[config2] === "undefined") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2]();
      });
    }
  };
  defineJQueryPlugin(Tooltip);
  var NAME$3 = "popover";
  var SELECTOR_TITLE = ".popover-header";
  var SELECTOR_CONTENT = ".popover-body";
  var Default$2 = {
    ...Tooltip.Default,
    content: "",
    offset: [0, 8],
    placement: "right",
    template: '<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
    trigger: "click"
  };
  var DefaultType$2 = {
    ...Tooltip.DefaultType,
    content: "(null|string|element|function)"
  };
  var Popover = class extends Tooltip {
    static get Default() {
      return Default$2;
    }
    static get DefaultType() {
      return DefaultType$2;
    }
    static get NAME() {
      return NAME$3;
    }
    _isWithContent() {
      return this._getTitle() || this._getContent();
    }
    _getContentForTemplate() {
      return {
        [SELECTOR_TITLE]: this._getTitle(),
        [SELECTOR_CONTENT]: this._getContent()
      };
    }
    _getContent() {
      return this._resolvePossibleFunction(this._config.content);
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Popover.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (typeof data[config2] === "undefined") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2]();
      });
    }
  };
  defineJQueryPlugin(Popover);
  var NAME$2 = "scrollspy";
  var DATA_KEY$2 = "bs.scrollspy";
  var EVENT_KEY$2 = `.${DATA_KEY$2}`;
  var DATA_API_KEY = ".data-api";
  var EVENT_ACTIVATE = `activate${EVENT_KEY$2}`;
  var EVENT_CLICK = `click${EVENT_KEY$2}`;
  var EVENT_LOAD_DATA_API$1 = `load${EVENT_KEY$2}${DATA_API_KEY}`;
  var CLASS_NAME_DROPDOWN_ITEM = "dropdown-item";
  var CLASS_NAME_ACTIVE$1 = "active";
  var SELECTOR_DATA_SPY = '[data-bs-spy="scroll"]';
  var SELECTOR_TARGET_LINKS = "[href]";
  var SELECTOR_NAV_LIST_GROUP = ".nav, .list-group";
  var SELECTOR_NAV_LINKS = ".nav-link";
  var SELECTOR_NAV_ITEMS = ".nav-item";
  var SELECTOR_LIST_ITEMS = ".list-group-item";
  var SELECTOR_LINK_ITEMS = `${SELECTOR_NAV_LINKS}, ${SELECTOR_NAV_ITEMS} > ${SELECTOR_NAV_LINKS}, ${SELECTOR_LIST_ITEMS}`;
  var SELECTOR_DROPDOWN = ".dropdown";
  var SELECTOR_DROPDOWN_TOGGLE$1 = ".dropdown-toggle";
  var Default$1 = {
    offset: null,
    rootMargin: "0px 0px -25%",
    smoothScroll: false,
    target: null,
    threshold: [0.1, 0.5, 1]
  };
  var DefaultType$1 = {
    offset: "(number|null)",
    rootMargin: "string",
    smoothScroll: "boolean",
    target: "element",
    threshold: "array"
  };
  var ScrollSpy = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._targetLinks = /* @__PURE__ */ new Map();
      this._observableSections = /* @__PURE__ */ new Map();
      this._rootElement = getComputedStyle(this._element).overflowY === "visible" ? null : this._element;
      this._activeTarget = null;
      this._observer = null;
      this._previousScrollData = {
        visibleEntryTop: 0,
        parentScrollTop: 0
      };
      this.refresh();
    }
    static get Default() {
      return Default$1;
    }
    static get DefaultType() {
      return DefaultType$1;
    }
    static get NAME() {
      return NAME$2;
    }
    refresh() {
      this._initializeTargetsAndObservables();
      this._maybeEnableSmoothScroll();
      if (this._observer) {
        this._observer.disconnect();
      } else {
        this._observer = this._getNewObserver();
      }
      for (const section of this._observableSections.values()) {
        this._observer.observe(section);
      }
    }
    dispose() {
      this._observer.disconnect();
      super.dispose();
    }
    _configAfterMerge(config2) {
      config2.target = getElement(config2.target) || document.body;
      config2.rootMargin = config2.offset ? `${config2.offset}px 0px -30%` : config2.rootMargin;
      if (typeof config2.threshold === "string") {
        config2.threshold = config2.threshold.split(",").map((value) => Number.parseFloat(value));
      }
      return config2;
    }
    _maybeEnableSmoothScroll() {
      if (!this._config.smoothScroll) {
        return;
      }
      EventHandler.off(this._config.target, EVENT_CLICK);
      EventHandler.on(this._config.target, EVENT_CLICK, SELECTOR_TARGET_LINKS, (event) => {
        const observableSection = this._observableSections.get(event.target.hash);
        if (observableSection) {
          event.preventDefault();
          const root = this._rootElement || window;
          const height = observableSection.offsetTop - this._element.offsetTop;
          if (root.scrollTo) {
            root.scrollTo({
              top: height,
              behavior: "smooth"
            });
            return;
          }
          root.scrollTop = height;
        }
      });
    }
    _getNewObserver() {
      const options2 = {
        root: this._rootElement,
        threshold: this._config.threshold,
        rootMargin: this._config.rootMargin
      };
      return new IntersectionObserver((entries) => this._observerCallback(entries), options2);
    }
    _observerCallback(entries) {
      const targetElement = (entry) => this._targetLinks.get(`#${entry.target.id}`);
      const activate = (entry) => {
        this._previousScrollData.visibleEntryTop = entry.target.offsetTop;
        this._process(targetElement(entry));
      };
      const parentScrollTop = (this._rootElement || document.documentElement).scrollTop;
      const userScrollsDown = parentScrollTop >= this._previousScrollData.parentScrollTop;
      this._previousScrollData.parentScrollTop = parentScrollTop;
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          this._activeTarget = null;
          this._clearActiveClass(targetElement(entry));
          continue;
        }
        const entryIsLowerThanPrevious = entry.target.offsetTop >= this._previousScrollData.visibleEntryTop;
        if (userScrollsDown && entryIsLowerThanPrevious) {
          activate(entry);
          if (!parentScrollTop) {
            return;
          }
          continue;
        }
        if (!userScrollsDown && !entryIsLowerThanPrevious) {
          activate(entry);
        }
      }
    }
    _initializeTargetsAndObservables() {
      this._targetLinks = /* @__PURE__ */ new Map();
      this._observableSections = /* @__PURE__ */ new Map();
      const targetLinks = SelectorEngine.find(SELECTOR_TARGET_LINKS, this._config.target);
      for (const anchor of targetLinks) {
        if (!anchor.hash || isDisabled(anchor)) {
          continue;
        }
        const observableSection = SelectorEngine.findOne(anchor.hash, this._element);
        if (isVisible(observableSection)) {
          this._targetLinks.set(anchor.hash, anchor);
          this._observableSections.set(anchor.hash, observableSection);
        }
      }
    }
    _process(target) {
      if (this._activeTarget === target) {
        return;
      }
      this._clearActiveClass(this._config.target);
      this._activeTarget = target;
      target.classList.add(CLASS_NAME_ACTIVE$1);
      this._activateParents(target);
      EventHandler.trigger(this._element, EVENT_ACTIVATE, {
        relatedTarget: target
      });
    }
    _activateParents(target) {
      if (target.classList.contains(CLASS_NAME_DROPDOWN_ITEM)) {
        SelectorEngine.findOne(SELECTOR_DROPDOWN_TOGGLE$1, target.closest(SELECTOR_DROPDOWN)).classList.add(CLASS_NAME_ACTIVE$1);
        return;
      }
      for (const listGroup of SelectorEngine.parents(target, SELECTOR_NAV_LIST_GROUP)) {
        for (const item of SelectorEngine.prev(listGroup, SELECTOR_LINK_ITEMS)) {
          item.classList.add(CLASS_NAME_ACTIVE$1);
        }
      }
    }
    _clearActiveClass(parent) {
      parent.classList.remove(CLASS_NAME_ACTIVE$1);
      const activeNodes = SelectorEngine.find(`${SELECTOR_TARGET_LINKS}.${CLASS_NAME_ACTIVE$1}`, parent);
      for (const node of activeNodes) {
        node.classList.remove(CLASS_NAME_ACTIVE$1);
      }
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = ScrollSpy.getOrCreateInstance(this, config2);
        if (typeof config2 !== "string") {
          return;
        }
        if (data[config2] === void 0 || config2.startsWith("_") || config2 === "constructor") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2]();
      });
    }
  };
  EventHandler.on(window, EVENT_LOAD_DATA_API$1, () => {
    for (const spy of SelectorEngine.find(SELECTOR_DATA_SPY)) {
      ScrollSpy.getOrCreateInstance(spy);
    }
  });
  defineJQueryPlugin(ScrollSpy);
  var NAME$1 = "tab";
  var DATA_KEY$1 = "bs.tab";
  var EVENT_KEY$1 = `.${DATA_KEY$1}`;
  var EVENT_HIDE$1 = `hide${EVENT_KEY$1}`;
  var EVENT_HIDDEN$1 = `hidden${EVENT_KEY$1}`;
  var EVENT_SHOW$1 = `show${EVENT_KEY$1}`;
  var EVENT_SHOWN$1 = `shown${EVENT_KEY$1}`;
  var EVENT_CLICK_DATA_API = `click${EVENT_KEY$1}`;
  var EVENT_KEYDOWN = `keydown${EVENT_KEY$1}`;
  var EVENT_LOAD_DATA_API = `load${EVENT_KEY$1}`;
  var ARROW_LEFT_KEY = "ArrowLeft";
  var ARROW_RIGHT_KEY = "ArrowRight";
  var ARROW_UP_KEY = "ArrowUp";
  var ARROW_DOWN_KEY = "ArrowDown";
  var CLASS_NAME_ACTIVE = "active";
  var CLASS_NAME_FADE$1 = "fade";
  var CLASS_NAME_SHOW$1 = "show";
  var CLASS_DROPDOWN = "dropdown";
  var SELECTOR_DROPDOWN_TOGGLE = ".dropdown-toggle";
  var SELECTOR_DROPDOWN_MENU = ".dropdown-menu";
  var SELECTOR_DROPDOWN_ITEM = ".dropdown-item";
  var NOT_SELECTOR_DROPDOWN_TOGGLE = ":not(.dropdown-toggle)";
  var SELECTOR_TAB_PANEL = '.list-group, .nav, [role="tablist"]';
  var SELECTOR_OUTER = ".nav-item, .list-group-item";
  var SELECTOR_INNER = `.nav-link${NOT_SELECTOR_DROPDOWN_TOGGLE}, .list-group-item${NOT_SELECTOR_DROPDOWN_TOGGLE}, [role="tab"]${NOT_SELECTOR_DROPDOWN_TOGGLE}`;
  var SELECTOR_DATA_TOGGLE = '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]';
  var SELECTOR_INNER_ELEM = `${SELECTOR_INNER}, ${SELECTOR_DATA_TOGGLE}`;
  var SELECTOR_DATA_TOGGLE_ACTIVE = `.${CLASS_NAME_ACTIVE}[data-bs-toggle="tab"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="pill"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="list"]`;
  var Tab = class extends BaseComponent {
    constructor(element) {
      super(element);
      this._parent = this._element.closest(SELECTOR_TAB_PANEL);
      if (!this._parent) {
        return;
      }
      this._setInitialAttributes(this._parent, this._getChildren());
      EventHandler.on(this._element, EVENT_KEYDOWN, (event) => this._keydown(event));
    }
    static get NAME() {
      return NAME$1;
    }
    show() {
      const innerElem = this._element;
      if (this._elemIsActive(innerElem)) {
        return;
      }
      const active = this._getActiveElem();
      const hideEvent = active ? EventHandler.trigger(active, EVENT_HIDE$1, {
        relatedTarget: innerElem
      }) : null;
      const showEvent = EventHandler.trigger(innerElem, EVENT_SHOW$1, {
        relatedTarget: active
      });
      if (showEvent.defaultPrevented || hideEvent && hideEvent.defaultPrevented) {
        return;
      }
      this._deactivate(active, innerElem);
      this._activate(innerElem, active);
    }
    _activate(element, relatedElem) {
      if (!element) {
        return;
      }
      element.classList.add(CLASS_NAME_ACTIVE);
      this._activate(getElementFromSelector(element));
      const complete = () => {
        if (element.getAttribute("role") !== "tab") {
          element.classList.add(CLASS_NAME_SHOW$1);
          return;
        }
        element.focus();
        element.removeAttribute("tabindex");
        element.setAttribute("aria-selected", true);
        this._toggleDropDown(element, true);
        EventHandler.trigger(element, EVENT_SHOWN$1, {
          relatedTarget: relatedElem
        });
      };
      this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
    }
    _deactivate(element, relatedElem) {
      if (!element) {
        return;
      }
      element.classList.remove(CLASS_NAME_ACTIVE);
      element.blur();
      this._deactivate(getElementFromSelector(element));
      const complete = () => {
        if (element.getAttribute("role") !== "tab") {
          element.classList.remove(CLASS_NAME_SHOW$1);
          return;
        }
        element.setAttribute("aria-selected", false);
        element.setAttribute("tabindex", "-1");
        this._toggleDropDown(element, false);
        EventHandler.trigger(element, EVENT_HIDDEN$1, {
          relatedTarget: relatedElem
        });
      };
      this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
    }
    _keydown(event) {
      if (![ARROW_LEFT_KEY, ARROW_RIGHT_KEY, ARROW_UP_KEY, ARROW_DOWN_KEY].includes(event.key)) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const isNext = [ARROW_RIGHT_KEY, ARROW_DOWN_KEY].includes(event.key);
      const nextActiveElement = getNextActiveElement(this._getChildren().filter((element) => !isDisabled(element)), event.target, isNext, true);
      if (nextActiveElement) {
        Tab.getOrCreateInstance(nextActiveElement).show();
      }
    }
    _getChildren() {
      return SelectorEngine.find(SELECTOR_INNER_ELEM, this._parent);
    }
    _getActiveElem() {
      return this._getChildren().find((child) => this._elemIsActive(child)) || null;
    }
    _setInitialAttributes(parent, children) {
      this._setAttributeIfNotExists(parent, "role", "tablist");
      for (const child of children) {
        this._setInitialAttributesOnChild(child);
      }
    }
    _setInitialAttributesOnChild(child) {
      child = this._getInnerElement(child);
      const isActive = this._elemIsActive(child);
      const outerElem = this._getOuterElement(child);
      child.setAttribute("aria-selected", isActive);
      if (outerElem !== child) {
        this._setAttributeIfNotExists(outerElem, "role", "presentation");
      }
      if (!isActive) {
        child.setAttribute("tabindex", "-1");
      }
      this._setAttributeIfNotExists(child, "role", "tab");
      this._setInitialAttributesOnTargetPanel(child);
    }
    _setInitialAttributesOnTargetPanel(child) {
      const target = getElementFromSelector(child);
      if (!target) {
        return;
      }
      this._setAttributeIfNotExists(target, "role", "tabpanel");
      if (child.id) {
        this._setAttributeIfNotExists(target, "aria-labelledby", `#${child.id}`);
      }
    }
    _toggleDropDown(element, open) {
      const outerElem = this._getOuterElement(element);
      if (!outerElem.classList.contains(CLASS_DROPDOWN)) {
        return;
      }
      const toggle = (selector, className) => {
        const element2 = SelectorEngine.findOne(selector, outerElem);
        if (element2) {
          element2.classList.toggle(className, open);
        }
      };
      toggle(SELECTOR_DROPDOWN_TOGGLE, CLASS_NAME_ACTIVE);
      toggle(SELECTOR_DROPDOWN_MENU, CLASS_NAME_SHOW$1);
      toggle(SELECTOR_DROPDOWN_ITEM, CLASS_NAME_ACTIVE);
      outerElem.setAttribute("aria-expanded", open);
    }
    _setAttributeIfNotExists(element, attribute, value) {
      if (!element.hasAttribute(attribute)) {
        element.setAttribute(attribute, value);
      }
    }
    _elemIsActive(elem) {
      return elem.classList.contains(CLASS_NAME_ACTIVE);
    }
    _getInnerElement(elem) {
      return elem.matches(SELECTOR_INNER_ELEM) ? elem : SelectorEngine.findOne(SELECTOR_INNER_ELEM, elem);
    }
    _getOuterElement(elem) {
      return elem.closest(SELECTOR_OUTER) || elem;
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Tab.getOrCreateInstance(this);
        if (typeof config2 !== "string") {
          return;
        }
        if (data[config2] === void 0 || config2.startsWith("_") || config2 === "constructor") {
          throw new TypeError(`No method named "${config2}"`);
        }
        data[config2]();
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, function(event) {
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    if (isDisabled(this)) {
      return;
    }
    Tab.getOrCreateInstance(this).show();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API, () => {
    for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE_ACTIVE)) {
      Tab.getOrCreateInstance(element);
    }
  });
  defineJQueryPlugin(Tab);
  var NAME = "toast";
  var DATA_KEY = "bs.toast";
  var EVENT_KEY = `.${DATA_KEY}`;
  var EVENT_MOUSEOVER = `mouseover${EVENT_KEY}`;
  var EVENT_MOUSEOUT = `mouseout${EVENT_KEY}`;
  var EVENT_FOCUSIN = `focusin${EVENT_KEY}`;
  var EVENT_FOCUSOUT = `focusout${EVENT_KEY}`;
  var EVENT_HIDE = `hide${EVENT_KEY}`;
  var EVENT_HIDDEN = `hidden${EVENT_KEY}`;
  var EVENT_SHOW = `show${EVENT_KEY}`;
  var EVENT_SHOWN = `shown${EVENT_KEY}`;
  var CLASS_NAME_FADE = "fade";
  var CLASS_NAME_HIDE = "hide";
  var CLASS_NAME_SHOW = "show";
  var CLASS_NAME_SHOWING = "showing";
  var DefaultType = {
    animation: "boolean",
    autohide: "boolean",
    delay: "number"
  };
  var Default = {
    animation: true,
    autohide: true,
    delay: 5e3
  };
  var Toast = class extends BaseComponent {
    constructor(element, config2) {
      super(element, config2);
      this._timeout = null;
      this._hasMouseInteraction = false;
      this._hasKeyboardInteraction = false;
      this._setListeners();
    }
    static get Default() {
      return Default;
    }
    static get DefaultType() {
      return DefaultType;
    }
    static get NAME() {
      return NAME;
    }
    show() {
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW);
      if (showEvent.defaultPrevented) {
        return;
      }
      this._clearTimeout();
      if (this._config.animation) {
        this._element.classList.add(CLASS_NAME_FADE);
      }
      const complete = () => {
        this._element.classList.remove(CLASS_NAME_SHOWING);
        EventHandler.trigger(this._element, EVENT_SHOWN);
        this._maybeScheduleHide();
      };
      this._element.classList.remove(CLASS_NAME_HIDE);
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_SHOW, CLASS_NAME_SHOWING);
      this._queueCallback(complete, this._element, this._config.animation);
    }
    hide() {
      if (!this.isShown()) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE);
      if (hideEvent.defaultPrevented) {
        return;
      }
      const complete = () => {
        this._element.classList.add(CLASS_NAME_HIDE);
        this._element.classList.remove(CLASS_NAME_SHOWING, CLASS_NAME_SHOW);
        EventHandler.trigger(this._element, EVENT_HIDDEN);
      };
      this._element.classList.add(CLASS_NAME_SHOWING);
      this._queueCallback(complete, this._element, this._config.animation);
    }
    dispose() {
      this._clearTimeout();
      if (this.isShown()) {
        this._element.classList.remove(CLASS_NAME_SHOW);
      }
      super.dispose();
    }
    isShown() {
      return this._element.classList.contains(CLASS_NAME_SHOW);
    }
    _maybeScheduleHide() {
      if (!this._config.autohide) {
        return;
      }
      if (this._hasMouseInteraction || this._hasKeyboardInteraction) {
        return;
      }
      this._timeout = setTimeout(() => {
        this.hide();
      }, this._config.delay);
    }
    _onInteraction(event, isInteracting) {
      switch (event.type) {
        case "mouseover":
        case "mouseout":
          this._hasMouseInteraction = isInteracting;
          break;
        case "focusin":
        case "focusout":
          this._hasKeyboardInteraction = isInteracting;
          break;
      }
      if (isInteracting) {
        this._clearTimeout();
        return;
      }
      const nextElement = event.relatedTarget;
      if (this._element === nextElement || this._element.contains(nextElement)) {
        return;
      }
      this._maybeScheduleHide();
    }
    _setListeners() {
      EventHandler.on(this._element, EVENT_MOUSEOVER, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_MOUSEOUT, (event) => this._onInteraction(event, false));
      EventHandler.on(this._element, EVENT_FOCUSIN, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_FOCUSOUT, (event) => this._onInteraction(event, false));
    }
    _clearTimeout() {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    static jQueryInterface(config2) {
      return this.each(function() {
        const data = Toast.getOrCreateInstance(this, config2);
        if (typeof config2 === "string") {
          if (typeof data[config2] === "undefined") {
            throw new TypeError(`No method named "${config2}"`);
          }
          data[config2](this);
        }
      });
    }
  };
  enableDismissTrigger(Toast);
  defineJQueryPlugin(Toast);

  // node_modules/trix/dist/trix.js
  var version = "2.0.0-alpha.1";
  var attachmentSelector = "[data-trix-attachment]";
  var attachments = {
    preview: {
      presentation: "gallery",
      caption: {
        name: true,
        size: true
      }
    },
    file: {
      caption: {
        size: true
      }
    }
  };
  var attributes = {
    default: {
      tagName: "div",
      parse: false
    },
    quote: {
      tagName: "blockquote",
      nestable: true
    },
    heading1: {
      tagName: "h1",
      terminal: true,
      breakOnReturn: true,
      group: false
    },
    code: {
      tagName: "pre",
      terminal: true,
      text: {
        plaintext: true
      }
    },
    bulletList: {
      tagName: "ul",
      parse: false
    },
    bullet: {
      tagName: "li",
      listAttribute: "bulletList",
      group: false,
      nestable: true,
      test(element) {
        return tagName$1(element.parentNode) === attributes[this.listAttribute].tagName;
      }
    },
    numberList: {
      tagName: "ol",
      parse: false
    },
    number: {
      tagName: "li",
      listAttribute: "numberList",
      group: false,
      nestable: true,
      test(element) {
        return tagName$1(element.parentNode) === attributes[this.listAttribute].tagName;
      }
    },
    attachmentGallery: {
      tagName: "div",
      exclusive: true,
      terminal: true,
      parse: false,
      group: false
    }
  };
  var tagName$1 = (element) => {
    var _element$tagName;
    return element === null || element === void 0 ? void 0 : (_element$tagName = element.tagName) === null || _element$tagName === void 0 ? void 0 : _element$tagName.toLowerCase();
  };
  var browser$1 = {
    composesExistingText: /Android.*Chrome/.test(navigator.userAgent),
    forcesObjectResizing: /Trident.*rv:11/.test(navigator.userAgent),
    supportsInputEvents: function() {
      if (typeof InputEvent === "undefined") {
        return false;
      }
      for (const property of ["data", "getTargetRanges", "inputType"]) {
        if (!(property in InputEvent.prototype)) {
          return false;
        }
      }
      return true;
    }()
  };
  var css$3 = {
    attachment: "attachment",
    attachmentCaption: "attachment__caption",
    attachmentCaptionEditor: "attachment__caption-editor",
    attachmentMetadata: "attachment__metadata",
    attachmentMetadataContainer: "attachment__metadata-container",
    attachmentName: "attachment__name",
    attachmentProgress: "attachment__progress",
    attachmentSize: "attachment__size",
    attachmentToolbar: "attachment__toolbar",
    attachmentGallery: "attachment-gallery"
  };
  var lang$1 = {
    attachFiles: "Attach Files",
    bold: "Bold",
    bullets: "Bullets",
    byte: "Byte",
    bytes: "Bytes",
    captionPlaceholder: "Add a caption\u2026",
    code: "Code",
    heading1: "Heading",
    indent: "Increase Level",
    italic: "Italic",
    link: "Link",
    numbers: "Numbers",
    outdent: "Decrease Level",
    quote: "Quote",
    redo: "Redo",
    remove: "Remove",
    strike: "Strikethrough",
    undo: "Undo",
    unlink: "Unlink",
    url: "URL",
    urlPlaceholder: "Enter a URL\u2026",
    GB: "GB",
    KB: "KB",
    MB: "MB",
    PB: "PB",
    TB: "TB"
  };
  var sizes = [lang$1.bytes, lang$1.KB, lang$1.MB, lang$1.GB, lang$1.TB, lang$1.PB];
  var fileSize = {
    prefix: "IEC",
    precision: 2,
    formatter(number) {
      switch (number) {
        case 0:
          return "0 ".concat(lang$1.bytes);
        case 1:
          return "1 ".concat(lang$1.byte);
        default:
          let base;
          if (this.prefix === "SI") {
            base = 1e3;
          } else if (this.prefix === "IEC") {
            base = 1024;
          }
          const exp = Math.floor(Math.log(number) / Math.log(base));
          const humanSize = number / Math.pow(base, exp);
          const string = humanSize.toFixed(this.precision);
          const withoutInsignificantZeros = string.replace(/0*$/, "").replace(/\.$/, "");
          return "".concat(withoutInsignificantZeros, " ").concat(sizes[exp]);
      }
    }
  };
  var ZERO_WIDTH_SPACE = "\uFEFF";
  var NON_BREAKING_SPACE = "\xA0";
  var OBJECT_REPLACEMENT_CHARACTER = "\uFFFC";
  var extend3 = function(properties) {
    for (const key in properties) {
      const value = properties[key];
      this[key] = value;
    }
    return this;
  };
  var html = document.documentElement;
  var match = html.matches;
  var handleEvent = function(eventName) {
    let {
      onElement,
      matchingSelector,
      withCallback,
      inPhase,
      preventDefault,
      times
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const element = onElement ? onElement : html;
    const selector = matchingSelector;
    const useCapture = inPhase === "capturing";
    const handler = function(event) {
      if (times != null && --times === 0) {
        handler.destroy();
      }
      const target = findClosestElementFromNode(event.target, {
        matchingSelector: selector
      });
      if (target != null) {
        withCallback === null || withCallback === void 0 ? void 0 : withCallback.call(target, event, target);
        if (preventDefault) {
          event.preventDefault();
        }
      }
    };
    handler.destroy = () => element.removeEventListener(eventName, handler, useCapture);
    element.addEventListener(eventName, handler, useCapture);
    return handler;
  };
  var handleEventOnce = function(eventName) {
    let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    options2.times = 1;
    return handleEvent(eventName, options2);
  };
  var triggerEvent = function(eventName) {
    let {
      onElement,
      bubbles,
      cancelable,
      attributes: attributes2
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const element = onElement != null ? onElement : html;
    bubbles = bubbles !== false;
    cancelable = cancelable !== false;
    const event = document.createEvent("Events");
    event.initEvent(eventName, bubbles, cancelable);
    if (attributes2 != null) {
      extend3.call(event, attributes2);
    }
    return element.dispatchEvent(event);
  };
  var elementMatchesSelector = function(element, selector) {
    if ((element === null || element === void 0 ? void 0 : element.nodeType) === 1) {
      return match.call(element, selector);
    }
  };
  var findClosestElementFromNode = function(node) {
    let {
      matchingSelector,
      untilNode
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    if (node == null) {
      return;
    }
    if (matchingSelector != null) {
      if (node.closest && untilNode == null) {
        return node.closest(matchingSelector);
      } else {
        while (node && node !== untilNode) {
          if (elementMatchesSelector(node, matchingSelector)) {
            return node;
          }
          node = node.parentNode;
        }
      }
    } else {
      return node;
    }
  };
  var findInnerElement = function(element) {
    while ((_element = element) !== null && _element !== void 0 && _element.firstElementChild) {
      var _element;
      element = element.firstElementChild;
    }
    return element;
  };
  var innerElementIsActive = (element) => document.activeElement !== element && elementContainsNode(element, document.activeElement);
  var elementContainsNode = function(element, node) {
    if (!element || !node) {
      return;
    }
    while (node) {
      if (node === element) {
        return true;
      }
      node = node.parentNode;
    }
  };
  var findChildIndexOfNode = function(node) {
    var _node;
    if (!((_node = node) !== null && _node !== void 0 && _node.parentNode)) {
      return;
    }
    let childIndex = 0;
    node = node.previousSibling;
    while (node) {
      childIndex++;
      node = node.previousSibling;
    }
    return childIndex;
  };
  var removeNode = (node) => {
    var _node$parentNode;
    return node === null || node === void 0 ? void 0 : (_node$parentNode = node.parentNode) === null || _node$parentNode === void 0 ? void 0 : _node$parentNode.removeChild(node);
  };
  var walkTree = function(tree) {
    let {
      onlyNodesOfType,
      usingFilter,
      expandEntityReferences
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const whatToShow = (() => {
      switch (onlyNodesOfType) {
        case "element":
          return NodeFilter.SHOW_ELEMENT;
        case "text":
          return NodeFilter.SHOW_TEXT;
        case "comment":
          return NodeFilter.SHOW_COMMENT;
        default:
          return NodeFilter.SHOW_ALL;
      }
    })();
    return document.createTreeWalker(tree, whatToShow, usingFilter != null ? usingFilter : null, expandEntityReferences === true);
  };
  var tagName = (element) => {
    var _element$tagName;
    return element === null || element === void 0 ? void 0 : (_element$tagName = element.tagName) === null || _element$tagName === void 0 ? void 0 : _element$tagName.toLowerCase();
  };
  var makeElement = function(tag) {
    let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let key, value;
    if (typeof tag === "object") {
      options2 = tag;
      tag = options2.tagName;
    } else {
      options2 = {
        attributes: options2
      };
    }
    const element = document.createElement(tag);
    if (options2.editable != null) {
      if (options2.attributes == null) {
        options2.attributes = {};
      }
      options2.attributes.contenteditable = options2.editable;
    }
    if (options2.attributes) {
      for (key in options2.attributes) {
        value = options2.attributes[key];
        element.setAttribute(key, value);
      }
    }
    if (options2.style) {
      for (key in options2.style) {
        value = options2.style[key];
        element.style[key] = value;
      }
    }
    if (options2.data) {
      for (key in options2.data) {
        value = options2.data[key];
        element.dataset[key] = value;
      }
    }
    if (options2.className) {
      options2.className.split(" ").forEach((className) => {
        element.classList.add(className);
      });
    }
    if (options2.textContent) {
      element.textContent = options2.textContent;
    }
    if (options2.childNodes) {
      [].concat(options2.childNodes).forEach((childNode) => {
        element.appendChild(childNode);
      });
    }
    return element;
  };
  var blockTagNames = void 0;
  var getBlockTagNames = function() {
    if (blockTagNames != null) {
      return blockTagNames;
    }
    blockTagNames = [];
    for (const key in attributes) {
      const attributes$1 = attributes[key];
      if (attributes$1.tagName) {
        blockTagNames.push(attributes$1.tagName);
      }
    }
    return blockTagNames;
  };
  var nodeIsBlockContainer = (node) => nodeIsBlockStartComment(node === null || node === void 0 ? void 0 : node.firstChild);
  var nodeProbablyIsBlockContainer = function(node) {
    return getBlockTagNames().includes(tagName(node)) && !getBlockTagNames().includes(tagName(node.firstChild));
  };
  var nodeIsBlockStart = function(node) {
    let {
      strict
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
      strict: true
    };
    if (strict) {
      return nodeIsBlockStartComment(node);
    } else {
      return nodeIsBlockStartComment(node) || !nodeIsBlockStartComment(node.firstChild) && nodeProbablyIsBlockContainer(node);
    }
  };
  var nodeIsBlockStartComment = (node) => nodeIsCommentNode(node) && (node === null || node === void 0 ? void 0 : node.data) === "block";
  var nodeIsCommentNode = (node) => (node === null || node === void 0 ? void 0 : node.nodeType) === Node.COMMENT_NODE;
  var nodeIsCursorTarget = function(node) {
    let {
      name
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (!node) {
      return;
    }
    if (nodeIsTextNode(node)) {
      if (node.data === ZERO_WIDTH_SPACE) {
        if (name) {
          return node.parentNode.dataset.trixCursorTarget === name;
        } else {
          return true;
        }
      }
    } else {
      return nodeIsCursorTarget(node.firstChild);
    }
  };
  var nodeIsAttachmentElement = (node) => elementMatchesSelector(node, attachmentSelector);
  var nodeIsEmptyTextNode = (node) => nodeIsTextNode(node) && (node === null || node === void 0 ? void 0 : node.data) === "";
  var nodeIsTextNode = (node) => (node === null || node === void 0 ? void 0 : node.nodeType) === Node.TEXT_NODE;
  var input = {
    level2Enabled: true,
    getLevel() {
      if (this.level2Enabled && browser$1.supportsInputEvents) {
        return 2;
      } else {
        return 0;
      }
    },
    pickFiles(callback) {
      const input2 = makeElement("input", {
        type: "file",
        multiple: true,
        hidden: true,
        id: this.fileInputId
      });
      input2.addEventListener("change", () => {
        callback(input2.files);
        removeNode(input2);
      });
      removeNode(document.getElementById(this.fileInputId));
      document.body.appendChild(input2);
      input2.click();
    }
  };
  var keyNames$2 = {
    8: "backspace",
    9: "tab",
    13: "return",
    27: "escape",
    37: "left",
    39: "right",
    46: "delete",
    68: "d",
    72: "h",
    79: "o"
  };
  var textAttributes = {
    bold: {
      tagName: "strong",
      inheritable: true,
      parser(element) {
        const style = window.getComputedStyle(element);
        return style.fontWeight === "bold" || style.fontWeight >= 600;
      }
    },
    italic: {
      tagName: "em",
      inheritable: true,
      parser(element) {
        const style = window.getComputedStyle(element);
        return style.fontStyle === "italic";
      }
    },
    href: {
      groupTagName: "a",
      parser(element) {
        const matchingSelector = "a:not(".concat(attachmentSelector, ")");
        const link = element.closest(matchingSelector);
        if (link) {
          return link.getAttribute("href");
        }
      }
    },
    strike: {
      tagName: "del",
      inheritable: true
    },
    frozen: {
      style: {
        backgroundColor: "highlight"
      }
    }
  };
  var toolbar = {
    getDefaultHTML() {
      return '<div class="trix-button-row">\n      <span class="trix-button-group trix-button-group--text-tools" data-trix-button-group="text-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-bold" data-trix-attribute="bold" data-trix-key="b" title="'.concat(lang$1.bold, '" tabindex="-1">').concat(lang$1.bold, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-italic" data-trix-attribute="italic" data-trix-key="i" title="').concat(lang$1.italic, '" tabindex="-1">').concat(lang$1.italic, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-strike" data-trix-attribute="strike" title="').concat(lang$1.strike, '" tabindex="-1">').concat(lang$1.strike, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-link" data-trix-attribute="href" data-trix-action="link" data-trix-key="k" title="').concat(lang$1.link, '" tabindex="-1">').concat(lang$1.link, '</button>\n      </span>\n\n      <span class="trix-button-group trix-button-group--block-tools" data-trix-button-group="block-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-heading-1" data-trix-attribute="heading1" title="').concat(lang$1.heading1, '" tabindex="-1">').concat(lang$1.heading1, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-quote" data-trix-attribute="quote" title="').concat(lang$1.quote, '" tabindex="-1">').concat(lang$1.quote, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-code" data-trix-attribute="code" title="').concat(lang$1.code, '" tabindex="-1">').concat(lang$1.code, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-bullet-list" data-trix-attribute="bullet" title="').concat(lang$1.bullets, '" tabindex="-1">').concat(lang$1.bullets, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-number-list" data-trix-attribute="number" title="').concat(lang$1.numbers, '" tabindex="-1">').concat(lang$1.numbers, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-decrease-nesting-level" data-trix-action="decreaseNestingLevel" title="').concat(lang$1.outdent, '" tabindex="-1">').concat(lang$1.outdent, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-increase-nesting-level" data-trix-action="increaseNestingLevel" title="').concat(lang$1.indent, '" tabindex="-1">').concat(lang$1.indent, '</button>\n      </span>\n\n      <span class="trix-button-group trix-button-group--file-tools" data-trix-button-group="file-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-attach" data-trix-action="attachFiles" title="').concat(lang$1.attachFiles, '" tabindex="-1">').concat(lang$1.attachFiles, '</button>\n      </span>\n\n      <span class="trix-button-group-spacer"></span>\n\n      <span class="trix-button-group trix-button-group--history-tools" data-trix-button-group="history-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-undo" data-trix-action="undo" data-trix-key="z" title="').concat(lang$1.undo, '" tabindex="-1">').concat(lang$1.undo, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-redo" data-trix-action="redo" data-trix-key="shift+z" title="').concat(lang$1.redo, '" tabindex="-1">').concat(lang$1.redo, '</button>\n      </span>\n    </div>\n\n    <div class="trix-dialogs" data-trix-dialogs>\n      <div class="trix-dialog trix-dialog--link" data-trix-dialog="href" data-trix-dialog-attribute="href">\n        <div class="trix-dialog__link-fields">\n          <input type="url" name="href" class="trix-input trix-input--dialog" placeholder="').concat(lang$1.urlPlaceholder, '" aria-label="').concat(lang$1.url, '" required data-trix-input>\n          <div class="trix-button-group">\n            <input type="button" class="trix-button trix-button--dialog" value="').concat(lang$1.link, '" data-trix-method="setAttribute">\n            <input type="button" class="trix-button trix-button--dialog" value="').concat(lang$1.unlink, '" data-trix-method="removeAttribute">\n          </div>\n        </div>\n      </div>\n    </div>');
    }
  };
  var undoInterval = 5e3;
  var config = {
    attachments,
    blockAttributes: attributes,
    browser: browser$1,
    css: css$3,
    fileSize,
    input,
    keyNames: keyNames$2,
    lang: lang$1,
    textAttributes,
    toolbar,
    undoInterval
  };
  function _AwaitValue(value) {
    this.wrapped = value;
  }
  function _AsyncGenerator(gen) {
    var front, back;
    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key,
          arg,
          resolve,
          reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }
    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        var wrappedAwait = value instanceof _AwaitValue;
        Promise.resolve(wrappedAwait ? value.wrapped : value).then(function(arg2) {
          if (wrappedAwait) {
            resume(key === "return" ? "return" : "next", arg2);
            return;
          }
          settle(result.done ? "return" : "normal", arg2);
        }, function(err) {
          resume("throw", err);
        });
      } catch (err) {
        settle("throw", err);
      }
    }
    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value,
            done: true
          });
          break;
        case "throw":
          front.reject(value);
          break;
        default:
          front.resolve({
            value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== "function") {
      this.return = void 0;
    }
  }
  _AsyncGenerator.prototype[typeof Symbol === "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
    return this;
  };
  _AsyncGenerator.prototype.next = function(arg) {
    return this._invoke("next", arg);
  };
  _AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke("throw", arg);
  };
  _AsyncGenerator.prototype.return = function(arg) {
    return this._invoke("return", arg);
  };
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  var BasicObject = class {
    static proxyMethod(expression) {
      const {
        name,
        toMethod,
        toProperty,
        optional
      } = parseProxyMethodExpression(expression);
      this.prototype[name] = function() {
        let subject;
        let object2;
        if (toMethod) {
          if (optional) {
            var _this$toMethod;
            object2 = (_this$toMethod = this[toMethod]) === null || _this$toMethod === void 0 ? void 0 : _this$toMethod.call(this);
          } else {
            object2 = this[toMethod]();
          }
        } else if (toProperty) {
          object2 = this[toProperty];
        }
        if (optional) {
          var _object;
          subject = (_object = object2) === null || _object === void 0 ? void 0 : _object[name];
          if (subject) {
            return apply.call(subject, object2, arguments);
          }
        } else {
          subject = object2[name];
          return apply.call(subject, object2, arguments);
        }
      };
    }
  };
  var parseProxyMethodExpression = function(expression) {
    const match2 = expression.match(proxyMethodExpressionPattern);
    if (!match2) {
      throw new Error("can't parse @proxyMethod expression: ".concat(expression));
    }
    const args = {
      name: match2[4]
    };
    if (match2[2] != null) {
      args.toMethod = match2[1];
    } else {
      args.toProperty = match2[1];
    }
    if (match2[3] != null) {
      args.optional = true;
    }
    return args;
  };
  var {
    apply
  } = Function.prototype;
  var proxyMethodExpressionPattern = new RegExp("^(.+?)(\\(\\))?(\\?)?\\.(.+?)$");
  var _Array$from;
  var _$codePointAt$1;
  var _$1;
  var _String$fromCodePoint;
  var UTF16String = class extends BasicObject {
    static box() {
      let value = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      if (value instanceof this) {
        return value;
      } else {
        return this.fromUCS2String(value === null || value === void 0 ? void 0 : value.toString());
      }
    }
    static fromUCS2String(ucs2String) {
      return new this(ucs2String, ucs2decode(ucs2String));
    }
    static fromCodepoints(codepoints) {
      return new this(ucs2encode(codepoints), codepoints);
    }
    constructor(ucs2String, codepoints) {
      super(...arguments);
      this.ucs2String = ucs2String;
      this.codepoints = codepoints;
      this.length = this.codepoints.length;
      this.ucs2Length = this.ucs2String.length;
    }
    offsetToUCS2Offset(offset2) {
      return ucs2encode(this.codepoints.slice(0, Math.max(0, offset2))).length;
    }
    offsetFromUCS2Offset(ucs2Offset) {
      return ucs2decode(this.ucs2String.slice(0, Math.max(0, ucs2Offset))).length;
    }
    slice() {
      return this.constructor.fromCodepoints(this.codepoints.slice(...arguments));
    }
    charAt(offset2) {
      return this.slice(offset2, offset2 + 1);
    }
    isEqualTo(value) {
      return this.constructor.box(value).ucs2String === this.ucs2String;
    }
    toJSON() {
      return this.ucs2String;
    }
    getCacheKey() {
      return this.ucs2String;
    }
    toString() {
      return this.ucs2String;
    }
  };
  var hasArrayFrom = ((_Array$from = Array.from) === null || _Array$from === void 0 ? void 0 : _Array$from.call(Array, "\u{1F47C}").length) === 1;
  var hasStringCodePointAt$1 = ((_$codePointAt$1 = (_$1 = " ").codePointAt) === null || _$codePointAt$1 === void 0 ? void 0 : _$codePointAt$1.call(_$1, 0)) != null;
  var hasStringFromCodePoint = ((_String$fromCodePoint = String.fromCodePoint) === null || _String$fromCodePoint === void 0 ? void 0 : _String$fromCodePoint.call(String, 32, 128124)) === " \u{1F47C}";
  var ucs2decode;
  var ucs2encode;
  if (hasArrayFrom && hasStringCodePointAt$1) {
    ucs2decode = (string) => Array.from(string).map((char) => char.codePointAt(0));
  } else {
    ucs2decode = function(string) {
      const output = [];
      let counter = 0;
      const {
        length
      } = string;
      while (counter < length) {
        let value = string.charCodeAt(counter++);
        if (55296 <= value && value <= 56319 && counter < length) {
          const extra = string.charCodeAt(counter++);
          if ((extra & 64512) === 56320) {
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          } else {
            counter--;
          }
        }
        output.push(value);
      }
      return output;
    };
  }
  if (hasStringFromCodePoint) {
    ucs2encode = (array) => String.fromCodePoint(...Array.from(array || []));
  } else {
    ucs2encode = function(array) {
      const characters = (() => {
        const result = [];
        Array.from(array).forEach((value) => {
          let output = "";
          if (value > 65535) {
            value -= 65536;
            output += String.fromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          result.push(output + String.fromCharCode(value));
        });
        return result;
      })();
      return characters.join("");
    };
  }
  var id$1 = 0;
  var TrixObject = class extends BasicObject {
    static fromJSONString(jsonString) {
      return this.fromJSON(JSON.parse(jsonString));
    }
    constructor() {
      super(...arguments);
      this.id = ++id$1;
    }
    hasSameConstructorAs(object2) {
      return this.constructor === (object2 === null || object2 === void 0 ? void 0 : object2.constructor);
    }
    isEqualTo(object2) {
      return this === object2;
    }
    inspect() {
      const parts = [];
      const contents = this.contentsForInspection() || {};
      for (const key in contents) {
        const value = contents[key];
        parts.push("".concat(key, "=").concat(value));
      }
      return "#<".concat(this.constructor.name, ":").concat(this.id).concat(parts.length ? " ".concat(parts.join(", ")) : "", ">");
    }
    contentsForInspection() {
    }
    toJSONString() {
      return JSON.stringify(this);
    }
    toUTF16String() {
      return UTF16String.box(this);
    }
    getCacheKey() {
      return this.id.toString();
    }
  };
  var arraysAreEqual = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    if (a.length !== b.length) {
      return false;
    }
    for (let index = 0; index < a.length; index++) {
      const value = a[index];
      if (value !== b[index]) {
        return false;
      }
    }
    return true;
  };
  var arrayStartsWith = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    return arraysAreEqual(a.slice(0, b.length), b);
  };
  var spliceArray = function(array) {
    const result = array.slice(0);
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    result.splice(...args);
    return result;
  };
  var summarizeArrayChange = function() {
    let oldArray = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let newArray = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    const added = [];
    const removed = [];
    const existingValues = /* @__PURE__ */ new Set();
    oldArray.forEach((value) => {
      existingValues.add(value);
    });
    const currentValues = /* @__PURE__ */ new Set();
    newArray.forEach((value) => {
      currentValues.add(value);
      if (!existingValues.has(value)) {
        added.push(value);
      }
    });
    oldArray.forEach((value) => {
      if (!currentValues.has(value)) {
        removed.push(value);
      }
    });
    return {
      added,
      removed
    };
  };
  var RTL_PATTERN = /[\u05BE\u05C0\u05C3\u05D0-\u05EA\u05F0-\u05F4\u061B\u061F\u0621-\u063A\u0640-\u064A\u066D\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D5\u06E5\u06E6\u200F\u202B\u202E\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE72\uFE74\uFE76-\uFEFC]/;
  var getDirection = function() {
    const input2 = makeElement("input", {
      dir: "auto",
      name: "x",
      dirName: "x.dir"
    });
    const form = makeElement("form");
    form.appendChild(input2);
    const supportsDirName = function() {
      try {
        return new FormData(form).has(input2.dirName);
      } catch (error2) {
        return false;
      }
    }();
    const supportsDirSelector = function() {
      try {
        return input2.matches(":dir(ltr),:dir(rtl)");
      } catch (error2) {
        return false;
      }
    }();
    if (supportsDirName) {
      return function(string) {
        input2.value = string;
        return new FormData(form).get(input2.dirName);
      };
    } else if (supportsDirSelector) {
      return function(string) {
        input2.value = string;
        if (input2.matches(":dir(rtl)")) {
          return "rtl";
        } else {
          return "ltr";
        }
      };
    } else {
      return function(string) {
        const char = string.trim().charAt(0);
        if (RTL_PATTERN.test(char)) {
          return "rtl";
        } else {
          return "ltr";
        }
      };
    }
  }();
  var allAttributeNames = null;
  var blockAttributeNames = null;
  var textAttributeNames = null;
  var listAttributeNames = null;
  var getAllAttributeNames = () => {
    if (!allAttributeNames) {
      allAttributeNames = getTextAttributeNames().concat(getBlockAttributeNames());
    }
    return allAttributeNames;
  };
  var getBlockConfig = (attributeName) => config.blockAttributes[attributeName];
  var getBlockAttributeNames = () => {
    if (!blockAttributeNames) {
      blockAttributeNames = Object.keys(config.blockAttributes);
    }
    return blockAttributeNames;
  };
  var getTextConfig = (attributeName) => config.textAttributes[attributeName];
  var getTextAttributeNames = () => {
    if (!textAttributeNames) {
      textAttributeNames = Object.keys(config.textAttributes);
    }
    return textAttributeNames;
  };
  var getListAttributeNames = () => {
    if (!listAttributeNames) {
      listAttributeNames = [];
      for (const key in config.blockAttributes) {
        const {
          listAttribute
        } = config.blockAttributes[key];
        if (listAttribute != null) {
          listAttributeNames.push(listAttribute);
        }
      }
    }
    return listAttributeNames;
  };
  var installDefaultCSSForTagName = function(tagName2, defaultCSS) {
    const styleElement = insertStyleElementForTagName(tagName2);
    styleElement.textContent = defaultCSS.replace(/%t/g, tagName2);
  };
  var insertStyleElementForTagName = function(tagName2) {
    const element = document.createElement("style");
    element.setAttribute("type", "text/css");
    element.setAttribute("data-tag-name", tagName2.toLowerCase());
    const nonce = getCSPNonce();
    if (nonce) {
      element.setAttribute("nonce", nonce);
    }
    document.head.insertBefore(element, document.head.firstChild);
    return element;
  };
  var getCSPNonce = function() {
    const element = getMetaElement2("trix-csp-nonce") || getMetaElement2("csp-nonce");
    if (element) {
      return element.getAttribute("content");
    }
  };
  var getMetaElement2 = (name) => document.head.querySelector("meta[name=".concat(name, "]"));
  var testTransferData = {
    "application/x-trix-feature-detection": "test"
  };
  var dataTransferIsPlainText = function(dataTransfer) {
    const text = dataTransfer.getData("text/plain");
    const html2 = dataTransfer.getData("text/html");
    if (text && html2) {
      const {
        body
      } = new DOMParser().parseFromString(html2, "text/html");
      if (body.textContent === text) {
        return !body.querySelector("*");
      }
    } else {
      return text === null || text === void 0 ? void 0 : text.length;
    }
  };
  var dataTransferIsWritable = function(dataTransfer) {
    if (!(dataTransfer !== null && dataTransfer !== void 0 && dataTransfer.setData))
      return false;
    for (const key in testTransferData) {
      const value = testTransferData[key];
      try {
        dataTransfer.setData(key, value);
        if (!dataTransfer.getData(key) === value)
          return false;
      } catch (error2) {
        return false;
      }
    }
    return true;
  };
  var keyEventIsKeyboardCommand = function() {
    if (/Mac|^iP/.test(navigator.platform)) {
      return (event) => event.metaKey;
    } else {
      return (event) => event.ctrlKey;
    }
  }();
  var defer = (fn2) => setTimeout(fn2, 1);
  var copyObject = function() {
    let object2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const result = {};
    for (const key in object2) {
      const value = object2[key];
      result[key] = value;
    }
    return result;
  };
  var objectsAreEqual = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false;
    }
    for (const key in a) {
      const value = a[key];
      if (value !== b[key]) {
        return false;
      }
    }
    return true;
  };
  var normalizeRange = function(range) {
    if (range == null)
      return;
    if (!Array.isArray(range)) {
      range = [range, range];
    }
    return [copyValue(range[0]), copyValue(range[1] != null ? range[1] : range[0])];
  };
  var rangeIsCollapsed = function(range) {
    if (range == null)
      return;
    const [start3, end2] = normalizeRange(range);
    return rangeValuesAreEqual(start3, end2);
  };
  var rangesAreEqual = function(leftRange, rightRange) {
    if (leftRange == null || rightRange == null)
      return;
    const [leftStart, leftEnd] = normalizeRange(leftRange);
    const [rightStart, rightEnd] = normalizeRange(rightRange);
    return rangeValuesAreEqual(leftStart, rightStart) && rangeValuesAreEqual(leftEnd, rightEnd);
  };
  var copyValue = function(value) {
    if (typeof value === "number") {
      return value;
    } else {
      return copyObject(value);
    }
  };
  var rangeValuesAreEqual = function(left2, right2) {
    if (typeof left2 === "number") {
      return left2 === right2;
    } else {
      return objectsAreEqual(left2, right2);
    }
  };
  var SelectionChangeObserver = class extends BasicObject {
    constructor() {
      super(...arguments);
      this.update = this.update.bind(this);
      this.run = this.run.bind(this);
      this.selectionManagers = [];
    }
    start() {
      if (!this.started) {
        this.started = true;
        if ("onselectionchange" in document) {
          return document.addEventListener("selectionchange", this.update, true);
        } else {
          return this.run();
        }
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        return document.removeEventListener("selectionchange", this.update, true);
      }
    }
    registerSelectionManager(selectionManager) {
      if (!this.selectionManagers.includes(selectionManager)) {
        this.selectionManagers.push(selectionManager);
        return this.start();
      }
    }
    unregisterSelectionManager(selectionManager) {
      this.selectionManagers = this.selectionManagers.filter((s) => s !== selectionManager);
      if (this.selectionManagers.length === 0) {
        return this.stop();
      }
    }
    notifySelectionManagersOfSelectionChange() {
      return this.selectionManagers.map((selectionManager) => selectionManager.selectionDidChange());
    }
    update() {
      const domRange = getDOMRange();
      if (!domRangesAreEqual(domRange, this.domRange)) {
        this.domRange = domRange;
        return this.notifySelectionManagersOfSelectionChange();
      }
    }
    reset() {
      this.domRange = null;
      return this.update();
    }
    run() {
      if (this.started) {
        this.update();
        return requestAnimationFrame(this.run);
      }
    }
  };
  var domRangesAreEqual = (left2, right2) => (left2 === null || left2 === void 0 ? void 0 : left2.startContainer) === (right2 === null || right2 === void 0 ? void 0 : right2.startContainer) && (left2 === null || left2 === void 0 ? void 0 : left2.startOffset) === (right2 === null || right2 === void 0 ? void 0 : right2.startOffset) && (left2 === null || left2 === void 0 ? void 0 : left2.endContainer) === (right2 === null || right2 === void 0 ? void 0 : right2.endContainer) && (left2 === null || left2 === void 0 ? void 0 : left2.endOffset) === (right2 === null || right2 === void 0 ? void 0 : right2.endOffset);
  var selectionChangeObserver = new SelectionChangeObserver();
  var getDOMSelection = function() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection;
    }
  };
  var getDOMRange = function() {
    var _getDOMSelection;
    const domRange = (_getDOMSelection = getDOMSelection()) === null || _getDOMSelection === void 0 ? void 0 : _getDOMSelection.getRangeAt(0);
    if (domRange) {
      if (!domRangeIsPrivate(domRange)) {
        return domRange;
      }
    }
  };
  var setDOMRange = function(domRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(domRange);
    return selectionChangeObserver.update();
  };
  var domRangeIsPrivate = (domRange) => nodeIsPrivate(domRange.startContainer) || nodeIsPrivate(domRange.endContainer);
  var nodeIsPrivate = (node) => !Object.getPrototypeOf(node);
  var normalizeSpaces = (string) => string.replace(new RegExp("".concat(ZERO_WIDTH_SPACE), "g"), "").replace(new RegExp("".concat(NON_BREAKING_SPACE), "g"), " ");
  var normalizeNewlines = (string) => string.replace(/\r\n/g, "\n");
  var breakableWhitespacePattern = new RegExp("[^\\S".concat(NON_BREAKING_SPACE, "]"));
  var squishBreakableWhitespace = (string) => string.replace(new RegExp("".concat(breakableWhitespacePattern.source), "g"), " ").replace(/\ {2,}/g, " ");
  var summarizeStringChange = function(oldString, newString) {
    let added, removed;
    oldString = UTF16String.box(oldString);
    newString = UTF16String.box(newString);
    if (newString.length < oldString.length) {
      [removed, added] = utf16StringDifferences(oldString, newString);
    } else {
      [added, removed] = utf16StringDifferences(newString, oldString);
    }
    return {
      added,
      removed
    };
  };
  var utf16StringDifferences = function(a, b) {
    if (a.isEqualTo(b)) {
      return ["", ""];
    }
    const diffA = utf16StringDifference(a, b);
    const {
      length
    } = diffA.utf16String;
    let diffB;
    if (length) {
      const {
        offset: offset2
      } = diffA;
      const codepoints = a.codepoints.slice(0, offset2).concat(a.codepoints.slice(offset2 + length));
      diffB = utf16StringDifference(b, UTF16String.fromCodepoints(codepoints));
    } else {
      diffB = utf16StringDifference(b, a);
    }
    return [diffA.utf16String.toString(), diffB.utf16String.toString()];
  };
  var utf16StringDifference = function(a, b) {
    let leftIndex = 0;
    let rightIndexA = a.length;
    let rightIndexB = b.length;
    while (leftIndex < rightIndexA && a.charAt(leftIndex).isEqualTo(b.charAt(leftIndex))) {
      leftIndex++;
    }
    while (rightIndexA > leftIndex + 1 && a.charAt(rightIndexA - 1).isEqualTo(b.charAt(rightIndexB - 1))) {
      rightIndexA--;
      rightIndexB--;
    }
    return {
      utf16String: a.slice(leftIndex, rightIndexA),
      offset: leftIndex
    };
  };
  var Hash = class extends TrixObject {
    static fromCommonAttributesOfObjects() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      if (!objects.length) {
        return new this();
      }
      let hash3 = box(objects[0]);
      let keys = hash3.getKeys();
      objects.slice(1).forEach((object2) => {
        keys = hash3.getKeysCommonToHash(box(object2));
        hash3 = hash3.slice(keys);
      });
      return hash3;
    }
    static box(values) {
      return box(values);
    }
    constructor() {
      let values = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      super(...arguments);
      this.values = copy(values);
    }
    add(key, value) {
      return this.merge(object(key, value));
    }
    remove(key) {
      return new Hash(copy(this.values, key));
    }
    get(key) {
      return this.values[key];
    }
    has(key) {
      return key in this.values;
    }
    merge(values) {
      return new Hash(merge(this.values, unbox(values)));
    }
    slice(keys) {
      const values = {};
      keys.forEach((key) => {
        if (this.has(key)) {
          values[key] = this.values[key];
        }
      });
      return new Hash(values);
    }
    getKeys() {
      return Object.keys(this.values);
    }
    getKeysCommonToHash(hash3) {
      hash3 = box(hash3);
      return this.getKeys().filter((key) => this.values[key] === hash3.values[key]);
    }
    isEqualTo(values) {
      return arraysAreEqual(this.toArray(), box(values).toArray());
    }
    isEmpty() {
      return this.getKeys().length === 0;
    }
    toArray() {
      if (!this.array) {
        const result = [];
        for (const key in this.values) {
          const value = this.values[key];
          result.push(result.push(key, value));
        }
        this.array = result.slice(0);
      }
      return this.array;
    }
    toObject() {
      return copy(this.values);
    }
    toJSON() {
      return this.toObject();
    }
    contentsForInspection() {
      return {
        values: JSON.stringify(this.values)
      };
    }
  };
  var object = function(key, value) {
    const result = {};
    result[key] = value;
    return result;
  };
  var merge = function(object2, values) {
    const result = copy(object2);
    for (const key in values) {
      const value = values[key];
      result[key] = value;
    }
    return result;
  };
  var copy = function(object2, keyToRemove) {
    const result = {};
    const sortedKeys = Object.keys(object2).sort();
    sortedKeys.forEach((key) => {
      if (key !== keyToRemove) {
        result[key] = object2[key];
      }
    });
    return result;
  };
  var box = function(object2) {
    if (object2 instanceof Hash) {
      return object2;
    } else {
      return new Hash(object2);
    }
  };
  var unbox = function(object2) {
    if (object2 instanceof Hash) {
      return object2.values;
    } else {
      return object2;
    }
  };
  var Operation = class extends BasicObject {
    isPerforming() {
      return this.performing === true;
    }
    hasPerformed() {
      return this.performed === true;
    }
    hasSucceeded() {
      return this.performed && this.succeeded;
    }
    hasFailed() {
      return this.performed && !this.succeeded;
    }
    getPromise() {
      if (!this.promise) {
        this.promise = new Promise((resolve, reject) => {
          this.performing = true;
          return this.perform((succeeded, result) => {
            this.succeeded = succeeded;
            this.performing = false;
            this.performed = true;
            if (this.succeeded) {
              resolve(result);
            } else {
              reject(result);
            }
          });
        });
      }
      return this.promise;
    }
    perform(callback) {
      return callback(false);
    }
    release() {
      var _this$promise, _this$promise$cancel;
      (_this$promise = this.promise) === null || _this$promise === void 0 ? void 0 : (_this$promise$cancel = _this$promise.cancel) === null || _this$promise$cancel === void 0 ? void 0 : _this$promise$cancel.call(_this$promise);
      this.promise = null;
      this.performing = null;
      this.performed = null;
      this.succeeded = null;
    }
  };
  Operation.proxyMethod("getPromise().then");
  Operation.proxyMethod("getPromise().catch");
  var ImagePreloadOperation = class extends Operation {
    constructor(url) {
      super(...arguments);
      this.url = url;
    }
    perform(callback) {
      const image = new Image();
      image.onload = () => {
        image.width = this.width = image.naturalWidth;
        image.height = this.height = image.naturalHeight;
        return callback(true, image);
      };
      image.onerror = () => callback(false);
      image.src = this.url;
    }
  };
  var Attachment = class extends TrixObject {
    static attachmentForFile(file) {
      const attributes2 = this.attributesForFile(file);
      const attachment = new this(attributes2);
      attachment.setFile(file);
      return attachment;
    }
    static attributesForFile(file) {
      return new Hash({
        filename: file.name,
        filesize: file.size,
        contentType: file.type
      });
    }
    static fromJSON(attachmentJSON) {
      return new this(attachmentJSON);
    }
    constructor() {
      let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      super(attributes2);
      this.releaseFile = this.releaseFile.bind(this);
      this.attributes = Hash.box(attributes2);
      this.didChangeAttributes();
    }
    getAttribute(attribute) {
      return this.attributes.get(attribute);
    }
    hasAttribute(attribute) {
      return this.attributes.has(attribute);
    }
    getAttributes() {
      return this.attributes.toObject();
    }
    setAttributes() {
      let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      const newAttributes = this.attributes.merge(attributes2);
      if (!this.attributes.isEqualTo(newAttributes)) {
        var _this$previewDelegate, _this$previewDelegate2, _this$delegate, _this$delegate$attach;
        this.attributes = newAttributes;
        this.didChangeAttributes();
        (_this$previewDelegate = this.previewDelegate) === null || _this$previewDelegate === void 0 ? void 0 : (_this$previewDelegate2 = _this$previewDelegate.attachmentDidChangeAttributes) === null || _this$previewDelegate2 === void 0 ? void 0 : _this$previewDelegate2.call(_this$previewDelegate, this);
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$attach = _this$delegate.attachmentDidChangeAttributes) === null || _this$delegate$attach === void 0 ? void 0 : _this$delegate$attach.call(_this$delegate, this);
      }
    }
    didChangeAttributes() {
      if (this.isPreviewable()) {
        return this.preloadURL();
      }
    }
    isPending() {
      return this.file != null && !(this.getURL() || this.getHref());
    }
    isPreviewable() {
      if (this.attributes.has("previewable")) {
        return this.attributes.get("previewable");
      } else {
        return Attachment.previewablePattern.test(this.getContentType());
      }
    }
    getType() {
      if (this.hasContent()) {
        return "content";
      } else if (this.isPreviewable()) {
        return "preview";
      } else {
        return "file";
      }
    }
    getURL() {
      return this.attributes.get("url");
    }
    getHref() {
      return this.attributes.get("href");
    }
    getFilename() {
      return this.attributes.get("filename") || "";
    }
    getFilesize() {
      return this.attributes.get("filesize");
    }
    getFormattedFilesize() {
      const filesize = this.attributes.get("filesize");
      if (typeof filesize === "number") {
        return config.fileSize.formatter(filesize);
      } else {
        return "";
      }
    }
    getExtension() {
      var _this$getFilename$mat;
      return (_this$getFilename$mat = this.getFilename().match(/\.(\w+)$/)) === null || _this$getFilename$mat === void 0 ? void 0 : _this$getFilename$mat[1].toLowerCase();
    }
    getContentType() {
      return this.attributes.get("contentType");
    }
    hasContent() {
      return this.attributes.has("content");
    }
    getContent() {
      return this.attributes.get("content");
    }
    getWidth() {
      return this.attributes.get("width");
    }
    getHeight() {
      return this.attributes.get("height");
    }
    getFile() {
      return this.file;
    }
    setFile(file) {
      this.file = file;
      if (this.isPreviewable()) {
        return this.preloadFile();
      }
    }
    releaseFile() {
      this.releasePreloadedFile();
      this.file = null;
    }
    getUploadProgress() {
      return this.uploadProgress != null ? this.uploadProgress : 0;
    }
    setUploadProgress(value) {
      if (this.uploadProgress !== value) {
        var _this$uploadProgressD, _this$uploadProgressD2;
        this.uploadProgress = value;
        return (_this$uploadProgressD = this.uploadProgressDelegate) === null || _this$uploadProgressD === void 0 ? void 0 : (_this$uploadProgressD2 = _this$uploadProgressD.attachmentDidChangeUploadProgress) === null || _this$uploadProgressD2 === void 0 ? void 0 : _this$uploadProgressD2.call(_this$uploadProgressD, this);
      }
    }
    toJSON() {
      return this.getAttributes();
    }
    getCacheKey() {
      return [super.getCacheKey(...arguments), this.attributes.getCacheKey(), this.getPreviewURL()].join("/");
    }
    getPreviewURL() {
      return this.previewURL || this.preloadingURL;
    }
    setPreviewURL(url) {
      if (url !== this.getPreviewURL()) {
        var _this$previewDelegate3, _this$previewDelegate4, _this$delegate2, _this$delegate2$attac;
        this.previewURL = url;
        (_this$previewDelegate3 = this.previewDelegate) === null || _this$previewDelegate3 === void 0 ? void 0 : (_this$previewDelegate4 = _this$previewDelegate3.attachmentDidChangeAttributes) === null || _this$previewDelegate4 === void 0 ? void 0 : _this$previewDelegate4.call(_this$previewDelegate3, this);
        return (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$attac = _this$delegate2.attachmentDidChangePreviewURL) === null || _this$delegate2$attac === void 0 ? void 0 : _this$delegate2$attac.call(_this$delegate2, this);
      }
    }
    preloadURL() {
      return this.preload(this.getURL(), this.releaseFile);
    }
    preloadFile() {
      if (this.file) {
        this.fileObjectURL = URL.createObjectURL(this.file);
        return this.preload(this.fileObjectURL);
      }
    }
    releasePreloadedFile() {
      if (this.fileObjectURL) {
        URL.revokeObjectURL(this.fileObjectURL);
        this.fileObjectURL = null;
      }
    }
    preload(url, callback) {
      if (url && url !== this.getPreviewURL()) {
        this.preloadingURL = url;
        const operation = new ImagePreloadOperation(url);
        return operation.then((_ref) => {
          let {
            width,
            height
          } = _ref;
          if (!this.getWidth() || !this.getHeight()) {
            this.setAttributes({
              width,
              height
            });
          }
          this.preloadingURL = null;
          this.setPreviewURL(url);
          return callback === null || callback === void 0 ? void 0 : callback();
        }).catch(() => {
          this.preloadingURL = null;
          return callback === null || callback === void 0 ? void 0 : callback();
        });
      }
    }
  };
  _defineProperty(Attachment, "previewablePattern", /^image(\/(gif|png|jpe?g)|$)/);
  var ManagedAttachment = class extends BasicObject {
    constructor(attachmentManager, attachment) {
      super(...arguments);
      this.attachmentManager = attachmentManager;
      this.attachment = attachment;
      this.id = this.attachment.id;
      this.file = this.attachment.file;
    }
    remove() {
      return this.attachmentManager.requestRemovalOfAttachment(this.attachment);
    }
  };
  ManagedAttachment.proxyMethod("attachment.getAttribute");
  ManagedAttachment.proxyMethod("attachment.hasAttribute");
  ManagedAttachment.proxyMethod("attachment.setAttribute");
  ManagedAttachment.proxyMethod("attachment.getAttributes");
  ManagedAttachment.proxyMethod("attachment.setAttributes");
  ManagedAttachment.proxyMethod("attachment.isPending");
  ManagedAttachment.proxyMethod("attachment.isPreviewable");
  ManagedAttachment.proxyMethod("attachment.getURL");
  ManagedAttachment.proxyMethod("attachment.getHref");
  ManagedAttachment.proxyMethod("attachment.getFilename");
  ManagedAttachment.proxyMethod("attachment.getFilesize");
  ManagedAttachment.proxyMethod("attachment.getFormattedFilesize");
  ManagedAttachment.proxyMethod("attachment.getExtension");
  ManagedAttachment.proxyMethod("attachment.getContentType");
  ManagedAttachment.proxyMethod("attachment.getFile");
  ManagedAttachment.proxyMethod("attachment.setFile");
  ManagedAttachment.proxyMethod("attachment.releaseFile");
  ManagedAttachment.proxyMethod("attachment.getUploadProgress");
  ManagedAttachment.proxyMethod("attachment.setUploadProgress");
  var AttachmentManager = class extends BasicObject {
    constructor() {
      let attachments2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.managedAttachments = {};
      Array.from(attachments2).forEach((attachment) => {
        this.manageAttachment(attachment);
      });
    }
    getAttachments() {
      const result = [];
      for (const id2 in this.managedAttachments) {
        const attachment = this.managedAttachments[id2];
        result.push(attachment);
      }
      return result;
    }
    manageAttachment(attachment) {
      if (!this.managedAttachments[attachment.id]) {
        this.managedAttachments[attachment.id] = new ManagedAttachment(this, attachment);
      }
      return this.managedAttachments[attachment.id];
    }
    attachmentIsManaged(attachment) {
      return attachment.id in this.managedAttachments;
    }
    requestRemovalOfAttachment(attachment) {
      if (this.attachmentIsManaged(attachment)) {
        var _this$delegate, _this$delegate$attach;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$attach = _this$delegate.attachmentManagerDidRequestRemovalOfAttachment) === null || _this$delegate$attach === void 0 ? void 0 : _this$delegate$attach.call(_this$delegate, attachment);
      }
    }
    unmanageAttachment(attachment) {
      const managedAttachment = this.managedAttachments[attachment.id];
      delete this.managedAttachments[attachment.id];
      return managedAttachment;
    }
  };
  var Piece = class extends TrixObject {
    static registerType(type, constructor) {
      constructor.type = type;
      this.types[type] = constructor;
    }
    static fromJSON(pieceJSON) {
      const constructor = this.types[pieceJSON.type];
      if (constructor) {
        return constructor.fromJSON(pieceJSON);
      }
    }
    constructor(value) {
      let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.attributes = Hash.box(attributes2);
    }
    copyWithAttributes(attributes2) {
      return new this.constructor(this.getValue(), attributes2);
    }
    copyWithAdditionalAttributes(attributes2) {
      return this.copyWithAttributes(this.attributes.merge(attributes2));
    }
    copyWithoutAttribute(attribute) {
      return this.copyWithAttributes(this.attributes.remove(attribute));
    }
    copy() {
      return this.copyWithAttributes(this.attributes);
    }
    getAttribute(attribute) {
      return this.attributes.get(attribute);
    }
    getAttributesHash() {
      return this.attributes;
    }
    getAttributes() {
      return this.attributes.toObject();
    }
    hasAttribute(attribute) {
      return this.attributes.has(attribute);
    }
    hasSameStringValueAsPiece(piece) {
      return piece && this.toString() === piece.toString();
    }
    hasSameAttributesAsPiece(piece) {
      return piece && (this.attributes === piece.attributes || this.attributes.isEqualTo(piece.attributes));
    }
    isBlockBreak() {
      return false;
    }
    isEqualTo(piece) {
      return super.isEqualTo(...arguments) || this.hasSameConstructorAs(piece) && this.hasSameStringValueAsPiece(piece) && this.hasSameAttributesAsPiece(piece);
    }
    isEmpty() {
      return this.length === 0;
    }
    isSerializable() {
      return true;
    }
    toJSON() {
      return {
        type: this.constructor.type,
        attributes: this.getAttributes()
      };
    }
    contentsForInspection() {
      return {
        type: this.constructor.type,
        attributes: this.attributes.inspect()
      };
    }
    canBeGrouped() {
      return this.hasAttribute("href");
    }
    canBeGroupedWith(piece) {
      return this.getAttribute("href") === piece.getAttribute("href");
    }
    getLength() {
      return this.length;
    }
    canBeConsolidatedWith(piece) {
      return false;
    }
  };
  _defineProperty(Piece, "types", {});
  var AttachmentPiece = class extends Piece {
    static fromJSON(pieceJSON) {
      return new this(Attachment.fromJSON(pieceJSON.attachment), pieceJSON.attributes);
    }
    constructor(attachment) {
      super(...arguments);
      this.attachment = attachment;
      this.length = 1;
      this.ensureAttachmentExclusivelyHasAttribute("href");
      if (!this.attachment.hasContent()) {
        this.removeProhibitedAttributes();
      }
    }
    ensureAttachmentExclusivelyHasAttribute(attribute) {
      if (this.hasAttribute(attribute)) {
        if (!this.attachment.hasAttribute(attribute)) {
          this.attachment.setAttributes(this.attributes.slice(attribute));
        }
        this.attributes = this.attributes.remove(attribute);
      }
    }
    removeProhibitedAttributes() {
      const attributes2 = this.attributes.slice(AttachmentPiece.permittedAttributes);
      if (!attributes2.isEqualTo(this.attributes)) {
        this.attributes = attributes2;
      }
    }
    getValue() {
      return this.attachment;
    }
    isSerializable() {
      return !this.attachment.isPending();
    }
    getCaption() {
      return this.attributes.get("caption") || "";
    }
    isEqualTo(piece) {
      var _piece$attachment;
      return super.isEqualTo(piece) && this.attachment.id === (piece === null || piece === void 0 ? void 0 : (_piece$attachment = piece.attachment) === null || _piece$attachment === void 0 ? void 0 : _piece$attachment.id);
    }
    toString() {
      return OBJECT_REPLACEMENT_CHARACTER;
    }
    toJSON() {
      const json = super.toJSON(...arguments);
      json.attachment = this.attachment;
      return json;
    }
    getCacheKey() {
      return [super.getCacheKey(...arguments), this.attachment.getCacheKey()].join("/");
    }
    toConsole() {
      return JSON.stringify(this.toString());
    }
  };
  _defineProperty(AttachmentPiece, "permittedAttributes", ["caption", "presentation"]);
  Piece.registerType("attachment", AttachmentPiece);
  var StringPiece = class extends Piece {
    static fromJSON(pieceJSON) {
      return new this(pieceJSON.string, pieceJSON.attributes);
    }
    constructor(string) {
      super(...arguments);
      this.string = normalizeNewlines(string);
      this.length = this.string.length;
    }
    getValue() {
      return this.string;
    }
    toString() {
      return this.string.toString();
    }
    isBlockBreak() {
      return this.toString() === "\n" && this.getAttribute("blockBreak") === true;
    }
    toJSON() {
      const result = super.toJSON(...arguments);
      result.string = this.string;
      return result;
    }
    canBeConsolidatedWith(piece) {
      return piece && this.hasSameConstructorAs(piece) && this.hasSameAttributesAsPiece(piece);
    }
    consolidateWith(piece) {
      return new this.constructor(this.toString() + piece.toString(), this.attributes);
    }
    splitAtOffset(offset2) {
      let left2, right2;
      if (offset2 === 0) {
        left2 = null;
        right2 = this;
      } else if (offset2 === this.length) {
        left2 = this;
        right2 = null;
      } else {
        left2 = new this.constructor(this.string.slice(0, offset2), this.attributes);
        right2 = new this.constructor(this.string.slice(offset2), this.attributes);
      }
      return [left2, right2];
    }
    toConsole() {
      let {
        string
      } = this;
      if (string.length > 15) {
        string = string.slice(0, 14) + "\u2026";
      }
      return JSON.stringify(string.toString());
    }
  };
  Piece.registerType("string", StringPiece);
  var SplittableList = class extends TrixObject {
    static box(objects) {
      if (objects instanceof this) {
        return objects;
      } else {
        return new this(objects);
      }
    }
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.objects = objects.slice(0);
      this.length = this.objects.length;
    }
    indexOf(object2) {
      return this.objects.indexOf(object2);
    }
    splice() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return new this.constructor(spliceArray(this.objects, ...args));
    }
    eachObject(callback) {
      return this.objects.map((object2, index) => callback(object2, index));
    }
    insertObjectAtIndex(object2, index) {
      return this.splice(index, 0, object2);
    }
    insertSplittableListAtIndex(splittableList, index) {
      return this.splice(index, 0, ...splittableList.objects);
    }
    insertSplittableListAtPosition(splittableList, position) {
      const [objects, index] = this.splitObjectAtPosition(position);
      return new this.constructor(objects).insertSplittableListAtIndex(splittableList, index);
    }
    editObjectAtIndex(index, callback) {
      return this.replaceObjectAtIndex(callback(this.objects[index]), index);
    }
    replaceObjectAtIndex(object2, index) {
      return this.splice(index, 1, object2);
    }
    removeObjectAtIndex(index) {
      return this.splice(index, 1);
    }
    getObjectAtIndex(index) {
      return this.objects[index];
    }
    getSplittableListInRange(range) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range);
      return new this.constructor(objects.slice(leftIndex, rightIndex + 1));
    }
    selectSplittableList(test) {
      const objects = this.objects.filter((object2) => test(object2));
      return new this.constructor(objects);
    }
    removeObjectsInRange(range) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range);
      return new this.constructor(objects).splice(leftIndex, rightIndex - leftIndex + 1);
    }
    transformObjectsInRange(range, transform) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range);
      const transformedObjects = objects.map((object2, index) => leftIndex <= index && index <= rightIndex ? transform(object2) : object2);
      return new this.constructor(transformedObjects);
    }
    splitObjectsAtRange(range) {
      let rightOuterIndex;
      let [objects, leftInnerIndex, offset2] = this.splitObjectAtPosition(startOfRange(range));
      [objects, rightOuterIndex] = new this.constructor(objects).splitObjectAtPosition(endOfRange(range) + offset2);
      return [objects, leftInnerIndex, rightOuterIndex - 1];
    }
    getObjectAtPosition(position) {
      const {
        index
      } = this.findIndexAndOffsetAtPosition(position);
      return this.objects[index];
    }
    splitObjectAtPosition(position) {
      let splitIndex, splitOffset;
      const {
        index,
        offset: offset2
      } = this.findIndexAndOffsetAtPosition(position);
      const objects = this.objects.slice(0);
      if (index != null) {
        if (offset2 === 0) {
          splitIndex = index;
          splitOffset = 0;
        } else {
          const object2 = this.getObjectAtIndex(index);
          const [leftObject, rightObject] = object2.splitAtOffset(offset2);
          objects.splice(index, 1, leftObject, rightObject);
          splitIndex = index + 1;
          splitOffset = leftObject.getLength() - offset2;
        }
      } else {
        splitIndex = objects.length;
        splitOffset = 0;
      }
      return [objects, splitIndex, splitOffset];
    }
    consolidate() {
      const objects = [];
      let pendingObject = this.objects[0];
      this.objects.slice(1).forEach((object2) => {
        var _pendingObject$canBeC, _pendingObject;
        if ((_pendingObject$canBeC = (_pendingObject = pendingObject).canBeConsolidatedWith) !== null && _pendingObject$canBeC !== void 0 && _pendingObject$canBeC.call(_pendingObject, object2)) {
          pendingObject = pendingObject.consolidateWith(object2);
        } else {
          objects.push(pendingObject);
          pendingObject = object2;
        }
      });
      if (pendingObject) {
        objects.push(pendingObject);
      }
      return new this.constructor(objects);
    }
    consolidateFromIndexToIndex(startIndex, endIndex) {
      const objects = this.objects.slice(0);
      const objectsInRange = objects.slice(startIndex, endIndex + 1);
      const consolidatedInRange = new this.constructor(objectsInRange).consolidate().toArray();
      return this.splice(startIndex, objectsInRange.length, ...consolidatedInRange);
    }
    findIndexAndOffsetAtPosition(position) {
      let index;
      let currentPosition = 0;
      for (index = 0; index < this.objects.length; index++) {
        const object2 = this.objects[index];
        const nextPosition = currentPosition + object2.getLength();
        if (currentPosition <= position && position < nextPosition) {
          return {
            index,
            offset: position - currentPosition
          };
        }
        currentPosition = nextPosition;
      }
      return {
        index: null,
        offset: null
      };
    }
    findPositionAtIndexAndOffset(index, offset2) {
      let position = 0;
      for (let currentIndex = 0; currentIndex < this.objects.length; currentIndex++) {
        const object2 = this.objects[currentIndex];
        if (currentIndex < index) {
          position += object2.getLength();
        } else if (currentIndex === index) {
          position += offset2;
          break;
        }
      }
      return position;
    }
    getEndPosition() {
      if (this.endPosition == null) {
        this.endPosition = 0;
        this.objects.forEach((object2) => this.endPosition += object2.getLength());
      }
      return this.endPosition;
    }
    toString() {
      return this.objects.join("");
    }
    toArray() {
      return this.objects.slice(0);
    }
    toJSON() {
      return this.toArray();
    }
    isEqualTo(splittableList) {
      return super.isEqualTo(...arguments) || objectArraysAreEqual(this.objects, splittableList === null || splittableList === void 0 ? void 0 : splittableList.objects);
    }
    contentsForInspection() {
      return {
        objects: "[".concat(this.objects.map((object2) => object2.inspect()).join(", "), "]")
      };
    }
  };
  var objectArraysAreEqual = function(left2) {
    let right2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    if (left2.length !== right2.length) {
      return false;
    }
    let result = true;
    for (let index = 0; index < left2.length; index++) {
      const object2 = left2[index];
      if (result && !object2.isEqualTo(right2[index])) {
        result = false;
      }
    }
    return result;
  };
  var startOfRange = (range) => range[0];
  var endOfRange = (range) => range[1];
  var Text = class extends TrixObject {
    static textForAttachmentWithAttributes(attachment, attributes2) {
      const piece = new AttachmentPiece(attachment, attributes2);
      return new this([piece]);
    }
    static textForStringWithAttributes(string, attributes2) {
      const piece = new StringPiece(string, attributes2);
      return new this([piece]);
    }
    static fromJSON(textJSON) {
      const pieces = Array.from(textJSON).map((pieceJSON) => Piece.fromJSON(pieceJSON));
      return new this(pieces);
    }
    constructor() {
      let pieces = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      const notEmpty = pieces.filter((piece) => !piece.isEmpty());
      this.pieceList = new SplittableList(notEmpty);
    }
    copy() {
      return this.copyWithPieceList(this.pieceList);
    }
    copyWithPieceList(pieceList) {
      return new this.constructor(pieceList.consolidate().toArray());
    }
    copyUsingObjectMap(objectMap) {
      const pieces = this.getPieces().map((piece) => objectMap.find(piece) || piece);
      return new this.constructor(pieces);
    }
    appendText(text) {
      return this.insertTextAtPosition(text, this.getLength());
    }
    insertTextAtPosition(text, position) {
      return this.copyWithPieceList(this.pieceList.insertSplittableListAtPosition(text.pieceList, position));
    }
    removeTextAtRange(range) {
      return this.copyWithPieceList(this.pieceList.removeObjectsInRange(range));
    }
    replaceTextAtRange(text, range) {
      return this.removeTextAtRange(range).insertTextAtPosition(text, range[0]);
    }
    moveTextFromRangeToPosition(range, position) {
      if (range[0] <= position && position <= range[1])
        return;
      const text = this.getTextAtRange(range);
      const length = text.getLength();
      if (range[0] < position) {
        position -= length;
      }
      return this.removeTextAtRange(range).insertTextAtPosition(text, position);
    }
    addAttributeAtRange(attribute, value, range) {
      const attributes2 = {};
      attributes2[attribute] = value;
      return this.addAttributesAtRange(attributes2, range);
    }
    addAttributesAtRange(attributes2, range) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, (piece) => piece.copyWithAdditionalAttributes(attributes2)));
    }
    removeAttributeAtRange(attribute, range) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, (piece) => piece.copyWithoutAttribute(attribute)));
    }
    setAttributesAtRange(attributes2, range) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range, (piece) => piece.copyWithAttributes(attributes2)));
    }
    getAttributesAtPosition(position) {
      var _this$pieceList$getOb;
      return ((_this$pieceList$getOb = this.pieceList.getObjectAtPosition(position)) === null || _this$pieceList$getOb === void 0 ? void 0 : _this$pieceList$getOb.getAttributes()) || {};
    }
    getCommonAttributes() {
      const objects = Array.from(this.pieceList.toArray()).map((piece) => piece.getAttributes());
      return Hash.fromCommonAttributesOfObjects(objects).toObject();
    }
    getCommonAttributesAtRange(range) {
      return this.getTextAtRange(range).getCommonAttributes() || {};
    }
    getExpandedRangeForAttributeAtOffset(attributeName, offset2) {
      let right2;
      let left2 = right2 = offset2;
      const length = this.getLength();
      while (left2 > 0 && this.getCommonAttributesAtRange([left2 - 1, right2])[attributeName]) {
        left2--;
      }
      while (right2 < length && this.getCommonAttributesAtRange([offset2, right2 + 1])[attributeName]) {
        right2++;
      }
      return [left2, right2];
    }
    getTextAtRange(range) {
      return this.copyWithPieceList(this.pieceList.getSplittableListInRange(range));
    }
    getStringAtRange(range) {
      return this.pieceList.getSplittableListInRange(range).toString();
    }
    getStringAtPosition(position) {
      return this.getStringAtRange([position, position + 1]);
    }
    startsWithString(string) {
      return this.getStringAtRange([0, string.length]) === string;
    }
    endsWithString(string) {
      const length = this.getLength();
      return this.getStringAtRange([length - string.length, length]) === string;
    }
    getAttachmentPieces() {
      return this.pieceList.toArray().filter((piece) => !!piece.attachment);
    }
    getAttachments() {
      return this.getAttachmentPieces().map((piece) => piece.attachment);
    }
    getAttachmentAndPositionById(attachmentId) {
      let position = 0;
      for (const piece of this.pieceList.toArray()) {
        var _piece$attachment;
        if (((_piece$attachment = piece.attachment) === null || _piece$attachment === void 0 ? void 0 : _piece$attachment.id) === attachmentId) {
          return {
            attachment: piece.attachment,
            position
          };
        }
        position += piece.length;
      }
      return {
        attachment: null,
        position: null
      };
    }
    getAttachmentById(attachmentId) {
      const {
        attachment
      } = this.getAttachmentAndPositionById(attachmentId);
      return attachment;
    }
    getRangeOfAttachment(attachment) {
      const attachmentAndPosition = this.getAttachmentAndPositionById(attachment.id);
      const position = attachmentAndPosition.position;
      attachment = attachmentAndPosition.attachment;
      if (attachment) {
        return [position, position + 1];
      }
    }
    updateAttributesForAttachment(attributes2, attachment) {
      const range = this.getRangeOfAttachment(attachment);
      if (range) {
        return this.addAttributesAtRange(attributes2, range);
      } else {
        return this;
      }
    }
    getLength() {
      return this.pieceList.getEndPosition();
    }
    isEmpty() {
      return this.getLength() === 0;
    }
    isEqualTo(text) {
      var _text$pieceList;
      return super.isEqualTo(text) || (text === null || text === void 0 ? void 0 : (_text$pieceList = text.pieceList) === null || _text$pieceList === void 0 ? void 0 : _text$pieceList.isEqualTo(this.pieceList));
    }
    isBlockBreak() {
      return this.getLength() === 1 && this.pieceList.getObjectAtIndex(0).isBlockBreak();
    }
    eachPiece(callback) {
      return this.pieceList.eachObject(callback);
    }
    getPieces() {
      return this.pieceList.toArray();
    }
    getPieceAtPosition(position) {
      return this.pieceList.getObjectAtPosition(position);
    }
    contentsForInspection() {
      return {
        pieceList: this.pieceList.inspect()
      };
    }
    toSerializableText() {
      const pieceList = this.pieceList.selectSplittableList((piece) => piece.isSerializable());
      return this.copyWithPieceList(pieceList);
    }
    toString() {
      return this.pieceList.toString();
    }
    toJSON() {
      return this.pieceList.toJSON();
    }
    toConsole() {
      return JSON.stringify(this.pieceList.toArray().map((piece) => JSON.parse(piece.toConsole())));
    }
    getDirection() {
      return getDirection(this.toString());
    }
    isRTL() {
      return this.getDirection() === "rtl";
    }
  };
  var Block = class extends TrixObject {
    static fromJSON(blockJSON) {
      const text = Text.fromJSON(blockJSON.text);
      return new this(text, blockJSON.attributes);
    }
    constructor(text, attributes2) {
      super(...arguments);
      this.text = applyBlockBreakToText(text || new Text());
      this.attributes = attributes2 || [];
    }
    isEmpty() {
      return this.text.isBlockBreak();
    }
    isEqualTo(block) {
      if (super.isEqualTo(block))
        return true;
      return this.text.isEqualTo(block === null || block === void 0 ? void 0 : block.text) && arraysAreEqual(this.attributes, block === null || block === void 0 ? void 0 : block.attributes);
    }
    copyWithText(text) {
      return new Block(text, this.attributes);
    }
    copyWithoutText() {
      return this.copyWithText(null);
    }
    copyWithAttributes(attributes2) {
      return new Block(this.text, attributes2);
    }
    copyWithoutAttributes() {
      return this.copyWithAttributes(null);
    }
    copyUsingObjectMap(objectMap) {
      const mappedText = objectMap.find(this.text);
      if (mappedText) {
        return this.copyWithText(mappedText);
      } else {
        return this.copyWithText(this.text.copyUsingObjectMap(objectMap));
      }
    }
    addAttribute(attribute) {
      const attributes2 = this.attributes.concat(expandAttribute(attribute));
      return this.copyWithAttributes(attributes2);
    }
    removeAttribute(attribute) {
      const {
        listAttribute
      } = getBlockConfig(attribute);
      const attributes2 = removeLastValue(removeLastValue(this.attributes, attribute), listAttribute);
      return this.copyWithAttributes(attributes2);
    }
    removeLastAttribute() {
      return this.removeAttribute(this.getLastAttribute());
    }
    getLastAttribute() {
      return getLastElement(this.attributes);
    }
    getAttributes() {
      return this.attributes.slice(0);
    }
    getAttributeLevel() {
      return this.attributes.length;
    }
    getAttributeAtLevel(level) {
      return this.attributes[level - 1];
    }
    hasAttribute(attributeName) {
      return this.attributes.includes(attributeName);
    }
    hasAttributes() {
      return this.getAttributeLevel() > 0;
    }
    getLastNestableAttribute() {
      return getLastElement(this.getNestableAttributes());
    }
    getNestableAttributes() {
      return this.attributes.filter((attribute) => getBlockConfig(attribute).nestable);
    }
    getNestingLevel() {
      return this.getNestableAttributes().length;
    }
    decreaseNestingLevel() {
      const attribute = this.getLastNestableAttribute();
      if (attribute) {
        return this.removeAttribute(attribute);
      } else {
        return this;
      }
    }
    increaseNestingLevel() {
      const attribute = this.getLastNestableAttribute();
      if (attribute) {
        const index = this.attributes.lastIndexOf(attribute);
        const attributes2 = spliceArray(this.attributes, index + 1, 0, ...expandAttribute(attribute));
        return this.copyWithAttributes(attributes2);
      } else {
        return this;
      }
    }
    getListItemAttributes() {
      return this.attributes.filter((attribute) => getBlockConfig(attribute).listAttribute);
    }
    isListItem() {
      var _getBlockConfig;
      return (_getBlockConfig = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig === void 0 ? void 0 : _getBlockConfig.listAttribute;
    }
    isTerminalBlock() {
      var _getBlockConfig2;
      return (_getBlockConfig2 = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig2 === void 0 ? void 0 : _getBlockConfig2.terminal;
    }
    breaksOnReturn() {
      var _getBlockConfig3;
      return (_getBlockConfig3 = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig3 === void 0 ? void 0 : _getBlockConfig3.breakOnReturn;
    }
    findLineBreakInDirectionFromPosition(direction, position) {
      const string = this.toString();
      let result;
      switch (direction) {
        case "forward":
          result = string.indexOf("\n", position);
          break;
        case "backward":
          result = string.slice(0, position).lastIndexOf("\n");
      }
      if (result !== -1) {
        return result;
      }
    }
    contentsForInspection() {
      return {
        text: this.text.inspect(),
        attributes: this.attributes
      };
    }
    toString() {
      return this.text.toString();
    }
    toJSON() {
      return {
        text: this.text,
        attributes: this.attributes
      };
    }
    getDirection() {
      return this.text.getDirection();
    }
    isRTL() {
      return this.text.isRTL();
    }
    getLength() {
      return this.text.getLength();
    }
    canBeConsolidatedWith(block) {
      return !this.hasAttributes() && !block.hasAttributes() && this.getDirection() === block.getDirection();
    }
    consolidateWith(block) {
      const newlineText = Text.textForStringWithAttributes("\n");
      const text = this.getTextWithoutBlockBreak().appendText(newlineText);
      return this.copyWithText(text.appendText(block.text));
    }
    splitAtOffset(offset2) {
      let left2, right2;
      if (offset2 === 0) {
        left2 = null;
        right2 = this;
      } else if (offset2 === this.getLength()) {
        left2 = this;
        right2 = null;
      } else {
        left2 = this.copyWithText(this.text.getTextAtRange([0, offset2]));
        right2 = this.copyWithText(this.text.getTextAtRange([offset2, this.getLength()]));
      }
      return [left2, right2];
    }
    getBlockBreakPosition() {
      return this.text.getLength() - 1;
    }
    getTextWithoutBlockBreak() {
      if (textEndsInBlockBreak(this.text)) {
        return this.text.getTextAtRange([0, this.getBlockBreakPosition()]);
      } else {
        return this.text.copy();
      }
    }
    canBeGrouped(depth) {
      return this.attributes[depth];
    }
    canBeGroupedWith(otherBlock, depth) {
      const otherAttributes = otherBlock.getAttributes();
      const otherAttribute = otherAttributes[depth];
      const attribute = this.attributes[depth];
      return attribute === otherAttribute && !(getBlockConfig(attribute).group === false && !getListAttributeNames().includes(otherAttributes[depth + 1])) && (this.getDirection() === otherBlock.getDirection() || otherBlock.isEmpty());
    }
  };
  var applyBlockBreakToText = function(text) {
    text = unmarkExistingInnerBlockBreaksInText(text);
    text = addBlockBreakToText(text);
    return text;
  };
  var unmarkExistingInnerBlockBreaksInText = function(text) {
    let modified = false;
    const pieces = text.getPieces();
    let innerPieces = pieces.slice(0, pieces.length - 1);
    const lastPiece = pieces[pieces.length - 1];
    if (!lastPiece)
      return text;
    innerPieces = innerPieces.map((piece) => {
      if (piece.isBlockBreak()) {
        modified = true;
        return unmarkBlockBreakPiece(piece);
      } else {
        return piece;
      }
    });
    if (modified) {
      return new Text([...innerPieces, lastPiece]);
    } else {
      return text;
    }
  };
  var blockBreakText = Text.textForStringWithAttributes("\n", {
    blockBreak: true
  });
  var addBlockBreakToText = function(text) {
    if (textEndsInBlockBreak(text)) {
      return text;
    } else {
      return text.appendText(blockBreakText);
    }
  };
  var textEndsInBlockBreak = function(text) {
    const length = text.getLength();
    if (length === 0) {
      return false;
    }
    const endText = text.getTextAtRange([length - 1, length]);
    return endText.isBlockBreak();
  };
  var unmarkBlockBreakPiece = (piece) => piece.copyWithoutAttribute("blockBreak");
  var expandAttribute = function(attribute) {
    const {
      listAttribute
    } = getBlockConfig(attribute);
    if (listAttribute) {
      return [listAttribute, attribute];
    } else {
      return [attribute];
    }
  };
  var getLastElement = (array) => array.slice(-1)[0];
  var removeLastValue = function(array, value) {
    const index = array.lastIndexOf(value);
    if (index === -1) {
      return array;
    } else {
      return spliceArray(array, index, 1);
    }
  };
  var ObjectMap = class extends BasicObject {
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.objects = {};
      Array.from(objects).forEach((object2) => {
        const hash3 = JSON.stringify(object2);
        if (this.objects[hash3] == null) {
          this.objects[hash3] = object2;
        }
      });
    }
    find(object2) {
      const hash3 = JSON.stringify(object2);
      return this.objects[hash3];
    }
  };
  var Document = class extends TrixObject {
    static fromJSON(documentJSON) {
      const blocks = Array.from(documentJSON).map((blockJSON) => Block.fromJSON(blockJSON));
      return new this(blocks);
    }
    static fromString(string, textAttributes2) {
      const text = Text.textForStringWithAttributes(string, textAttributes2);
      return new this([new Block(text)]);
    }
    constructor() {
      let blocks = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      if (blocks.length === 0) {
        blocks = [new Block()];
      }
      this.blockList = SplittableList.box(blocks);
    }
    isEmpty() {
      const block = this.getBlockAtIndex(0);
      return this.blockList.length === 1 && block.isEmpty() && !block.hasAttributes();
    }
    copy() {
      let options2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      const blocks = options2.consolidateBlocks ? this.blockList.consolidate().toArray() : this.blockList.toArray();
      return new this.constructor(blocks);
    }
    copyUsingObjectsFromDocument(sourceDocument) {
      const objectMap = new ObjectMap(sourceDocument.getObjects());
      return this.copyUsingObjectMap(objectMap);
    }
    copyUsingObjectMap(objectMap) {
      const blocks = this.getBlocks().map((block) => {
        const mappedBlock = objectMap.find(block);
        return mappedBlock || block.copyUsingObjectMap(objectMap);
      });
      return new this.constructor(blocks);
    }
    copyWithBaseBlockAttributes() {
      let blockAttributes = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      const blocks = this.getBlocks().map((block) => {
        const attributes2 = blockAttributes.concat(block.getAttributes());
        return block.copyWithAttributes(attributes2);
      });
      return new this.constructor(blocks);
    }
    replaceBlock(oldBlock, newBlock) {
      const index = this.blockList.indexOf(oldBlock);
      if (index === -1) {
        return this;
      }
      return new this.constructor(this.blockList.replaceObjectAtIndex(newBlock, index));
    }
    insertDocumentAtRange(document2, range) {
      const {
        blockList
      } = document2;
      range = normalizeRange(range);
      let [position] = range;
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(position);
      let result = this;
      const block = this.getBlockAtPosition(position);
      if (rangeIsCollapsed(range) && block.isEmpty() && !block.hasAttributes()) {
        result = new this.constructor(result.blockList.removeObjectAtIndex(index));
      } else if (block.getBlockBreakPosition() === offset2) {
        position++;
      }
      result = result.removeTextAtRange(range);
      return new this.constructor(result.blockList.insertSplittableListAtPosition(blockList, position));
    }
    mergeDocumentAtRange(document2, range) {
      let formattedDocument, result;
      range = normalizeRange(range);
      const [startPosition] = range;
      const startLocation = this.locationFromPosition(startPosition);
      const blockAttributes = this.getBlockAtIndex(startLocation.index).getAttributes();
      const baseBlockAttributes = document2.getBaseBlockAttributes();
      const trailingBlockAttributes = blockAttributes.slice(-baseBlockAttributes.length);
      if (arraysAreEqual(baseBlockAttributes, trailingBlockAttributes)) {
        const leadingBlockAttributes = blockAttributes.slice(0, -baseBlockAttributes.length);
        formattedDocument = document2.copyWithBaseBlockAttributes(leadingBlockAttributes);
      } else {
        formattedDocument = document2.copy({
          consolidateBlocks: true
        }).copyWithBaseBlockAttributes(blockAttributes);
      }
      const blockCount = formattedDocument.getBlockCount();
      const firstBlock = formattedDocument.getBlockAtIndex(0);
      if (arraysAreEqual(blockAttributes, firstBlock.getAttributes())) {
        const firstText = firstBlock.getTextWithoutBlockBreak();
        result = this.insertTextAtRange(firstText, range);
        if (blockCount > 1) {
          formattedDocument = new this.constructor(formattedDocument.getBlocks().slice(1));
          const position = startPosition + firstText.getLength();
          result = result.insertDocumentAtRange(formattedDocument, position);
        }
      } else {
        result = this.insertDocumentAtRange(formattedDocument, range);
      }
      return result;
    }
    insertTextAtRange(text, range) {
      range = normalizeRange(range);
      const [startPosition] = range;
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(startPosition);
      const document2 = this.removeTextAtRange(range);
      return new this.constructor(document2.blockList.editObjectAtIndex(index, (block) => block.copyWithText(block.text.insertTextAtPosition(text, offset2))));
    }
    removeTextAtRange(range) {
      let blocks;
      range = normalizeRange(range);
      const [leftPosition, rightPosition] = range;
      if (rangeIsCollapsed(range)) {
        return this;
      }
      const [leftLocation, rightLocation] = Array.from(this.locationRangeFromRange(range));
      const leftIndex = leftLocation.index;
      const leftOffset = leftLocation.offset;
      const leftBlock = this.getBlockAtIndex(leftIndex);
      const rightIndex = rightLocation.index;
      const rightOffset = rightLocation.offset;
      const rightBlock = this.getBlockAtIndex(rightIndex);
      const removeRightNewline = rightPosition - leftPosition === 1 && leftBlock.getBlockBreakPosition() === leftOffset && rightBlock.getBlockBreakPosition() !== rightOffset && rightBlock.text.getStringAtPosition(rightOffset) === "\n";
      if (removeRightNewline) {
        blocks = this.blockList.editObjectAtIndex(rightIndex, (block) => block.copyWithText(block.text.removeTextAtRange([rightOffset, rightOffset + 1])));
      } else {
        let block;
        const leftText = leftBlock.text.getTextAtRange([0, leftOffset]);
        const rightText = rightBlock.text.getTextAtRange([rightOffset, rightBlock.getLength()]);
        const text = leftText.appendText(rightText);
        const removingLeftBlock = leftIndex !== rightIndex && leftOffset === 0;
        const useRightBlock = removingLeftBlock && leftBlock.getAttributeLevel() >= rightBlock.getAttributeLevel();
        if (useRightBlock) {
          block = rightBlock.copyWithText(text);
        } else {
          block = leftBlock.copyWithText(text);
        }
        const affectedBlockCount = rightIndex + 1 - leftIndex;
        blocks = this.blockList.splice(leftIndex, affectedBlockCount, block);
      }
      return new this.constructor(blocks);
    }
    moveTextFromRangeToPosition(range, position) {
      let text;
      range = normalizeRange(range);
      const [startPosition, endPosition] = range;
      if (startPosition <= position && position <= endPosition) {
        return this;
      }
      let document2 = this.getDocumentAtRange(range);
      let result = this.removeTextAtRange(range);
      const movingRightward = startPosition < position;
      if (movingRightward) {
        position -= document2.getLength();
      }
      const [firstBlock, ...blocks] = document2.getBlocks();
      if (blocks.length === 0) {
        text = firstBlock.getTextWithoutBlockBreak();
        if (movingRightward) {
          position += 1;
        }
      } else {
        text = firstBlock.text;
      }
      result = result.insertTextAtRange(text, position);
      if (blocks.length === 0) {
        return result;
      }
      document2 = new this.constructor(blocks);
      position += text.getLength();
      return result.insertDocumentAtRange(document2, position);
    }
    addAttributeAtRange(attribute, value, range) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range, (block, textRange, index) => blockList = blockList.editObjectAtIndex(index, function() {
        if (getBlockConfig(attribute)) {
          return block.addAttribute(attribute, value);
        } else {
          if (textRange[0] === textRange[1]) {
            return block;
          } else {
            return block.copyWithText(block.text.addAttributeAtRange(attribute, value, textRange));
          }
        }
      }));
      return new this.constructor(blockList);
    }
    addAttribute(attribute, value) {
      let {
        blockList
      } = this;
      this.eachBlock((block, index) => blockList = blockList.editObjectAtIndex(index, () => block.addAttribute(attribute, value)));
      return new this.constructor(blockList);
    }
    removeAttributeAtRange(attribute, range) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range, function(block, textRange, index) {
        if (getBlockConfig(attribute)) {
          blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(attribute));
        } else if (textRange[0] !== textRange[1]) {
          blockList = blockList.editObjectAtIndex(index, () => block.copyWithText(block.text.removeAttributeAtRange(attribute, textRange)));
        }
      });
      return new this.constructor(blockList);
    }
    updateAttributesForAttachment(attributes2, attachment) {
      const range = this.getRangeOfAttachment(attachment);
      const [startPosition] = Array.from(range);
      const {
        index
      } = this.locationFromPosition(startPosition);
      const text = this.getTextAtIndex(index);
      return new this.constructor(this.blockList.editObjectAtIndex(index, (block) => block.copyWithText(text.updateAttributesForAttachment(attributes2, attachment))));
    }
    removeAttributeForAttachment(attribute, attachment) {
      const range = this.getRangeOfAttachment(attachment);
      return this.removeAttributeAtRange(attribute, range);
    }
    insertBlockBreakAtRange(range) {
      let blocks;
      range = normalizeRange(range);
      const [startPosition] = range;
      const {
        offset: offset2
      } = this.locationFromPosition(startPosition);
      const document2 = this.removeTextAtRange(range);
      if (offset2 === 0) {
        blocks = [new Block()];
      }
      return new this.constructor(document2.blockList.insertSplittableListAtPosition(new SplittableList(blocks), startPosition));
    }
    applyBlockAttributeAtRange(attributeName, value, range) {
      const expanded = this.expandRangeToLineBreaksAndSplitBlocks(range);
      let document2 = expanded.document;
      range = expanded.range;
      const blockConfig = getBlockConfig(attributeName);
      if (blockConfig.listAttribute) {
        document2 = document2.removeLastListAttributeAtRange(range, {
          exceptAttributeName: attributeName
        });
        const converted = document2.convertLineBreaksToBlockBreaksInRange(range);
        document2 = converted.document;
        range = converted.range;
      } else if (blockConfig.exclusive) {
        document2 = document2.removeBlockAttributesAtRange(range);
      } else if (blockConfig.terminal) {
        document2 = document2.removeLastTerminalAttributeAtRange(range);
      } else {
        document2 = document2.consolidateBlocksAtRange(range);
      }
      return document2.addAttributeAtRange(attributeName, value, range);
    }
    removeLastListAttributeAtRange(range) {
      let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range, function(block, textRange, index) {
        const lastAttributeName = block.getLastAttribute();
        if (!lastAttributeName) {
          return;
        }
        if (!getBlockConfig(lastAttributeName).listAttribute) {
          return;
        }
        if (lastAttributeName === options2.exceptAttributeName) {
          return;
        }
        blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(lastAttributeName));
      });
      return new this.constructor(blockList);
    }
    removeLastTerminalAttributeAtRange(range) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range, function(block, textRange, index) {
        const lastAttributeName = block.getLastAttribute();
        if (!lastAttributeName) {
          return;
        }
        if (!getBlockConfig(lastAttributeName).terminal) {
          return;
        }
        blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(lastAttributeName));
      });
      return new this.constructor(blockList);
    }
    removeBlockAttributesAtRange(range) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range, function(block, textRange, index) {
        if (block.hasAttributes()) {
          blockList = blockList.editObjectAtIndex(index, () => block.copyWithoutAttributes());
        }
      });
      return new this.constructor(blockList);
    }
    expandRangeToLineBreaksAndSplitBlocks(range) {
      let position;
      range = normalizeRange(range);
      let [startPosition, endPosition] = range;
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      let document2 = this;
      const startBlock = document2.getBlockAtIndex(startLocation.index);
      startLocation.offset = startBlock.findLineBreakInDirectionFromPosition("backward", startLocation.offset);
      if (startLocation.offset != null) {
        position = document2.positionFromLocation(startLocation);
        document2 = document2.insertBlockBreakAtRange([position, position + 1]);
        endLocation.index += 1;
        endLocation.offset -= document2.getBlockAtIndex(startLocation.index).getLength();
        startLocation.index += 1;
      }
      startLocation.offset = 0;
      if (endLocation.offset === 0 && endLocation.index > startLocation.index) {
        endLocation.index -= 1;
        endLocation.offset = document2.getBlockAtIndex(endLocation.index).getBlockBreakPosition();
      } else {
        const endBlock = document2.getBlockAtIndex(endLocation.index);
        if (endBlock.text.getStringAtRange([endLocation.offset - 1, endLocation.offset]) === "\n") {
          endLocation.offset -= 1;
        } else {
          endLocation.offset = endBlock.findLineBreakInDirectionFromPosition("forward", endLocation.offset);
        }
        if (endLocation.offset !== endBlock.getBlockBreakPosition()) {
          position = document2.positionFromLocation(endLocation);
          document2 = document2.insertBlockBreakAtRange([position, position + 1]);
        }
      }
      startPosition = document2.positionFromLocation(startLocation);
      endPosition = document2.positionFromLocation(endLocation);
      range = normalizeRange([startPosition, endPosition]);
      return {
        document: document2,
        range
      };
    }
    convertLineBreaksToBlockBreaksInRange(range) {
      range = normalizeRange(range);
      let [position] = range;
      const string = this.getStringAtRange(range).slice(0, -1);
      let document2 = this;
      string.replace(/.*?\n/g, function(match2) {
        position += match2.length;
        document2 = document2.insertBlockBreakAtRange([position - 1, position]);
      });
      return {
        document: document2,
        range
      };
    }
    consolidateBlocksAtRange(range) {
      range = normalizeRange(range);
      const [startPosition, endPosition] = range;
      const startIndex = this.locationFromPosition(startPosition).index;
      const endIndex = this.locationFromPosition(endPosition).index;
      return new this.constructor(this.blockList.consolidateFromIndexToIndex(startIndex, endIndex));
    }
    getDocumentAtRange(range) {
      range = normalizeRange(range);
      const blocks = this.blockList.getSplittableListInRange(range).toArray();
      return new this.constructor(blocks);
    }
    getStringAtRange(range) {
      let endIndex;
      const array = range = normalizeRange(range), endPosition = array[array.length - 1];
      if (endPosition !== this.getLength()) {
        endIndex = -1;
      }
      return this.getDocumentAtRange(range).toString().slice(0, endIndex);
    }
    getBlockAtIndex(index) {
      return this.blockList.getObjectAtIndex(index);
    }
    getBlockAtPosition(position) {
      const {
        index
      } = this.locationFromPosition(position);
      return this.getBlockAtIndex(index);
    }
    getTextAtIndex(index) {
      var _this$getBlockAtIndex;
      return (_this$getBlockAtIndex = this.getBlockAtIndex(index)) === null || _this$getBlockAtIndex === void 0 ? void 0 : _this$getBlockAtIndex.text;
    }
    getTextAtPosition(position) {
      const {
        index
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index);
    }
    getPieceAtPosition(position) {
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index).getPieceAtPosition(offset2);
    }
    getCharacterAtPosition(position) {
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index).getStringAtRange([offset2, offset2 + 1]);
    }
    getLength() {
      return this.blockList.getEndPosition();
    }
    getBlocks() {
      return this.blockList.toArray();
    }
    getBlockCount() {
      return this.blockList.length;
    }
    getEditCount() {
      return this.editCount;
    }
    eachBlock(callback) {
      return this.blockList.eachObject(callback);
    }
    eachBlockAtRange(range, callback) {
      let block, textRange;
      range = normalizeRange(range);
      const [startPosition, endPosition] = range;
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      if (startLocation.index === endLocation.index) {
        block = this.getBlockAtIndex(startLocation.index);
        textRange = [startLocation.offset, endLocation.offset];
        return callback(block, textRange, startLocation.index);
      } else {
        for (let index = startLocation.index; index <= endLocation.index; index++) {
          block = this.getBlockAtIndex(index);
          if (block) {
            switch (index) {
              case startLocation.index:
                textRange = [startLocation.offset, block.text.getLength()];
                break;
              case endLocation.index:
                textRange = [0, endLocation.offset];
                break;
              default:
                textRange = [0, block.text.getLength()];
            }
            callback(block, textRange, index);
          }
        }
      }
    }
    getCommonAttributesAtRange(range) {
      range = normalizeRange(range);
      const [startPosition] = range;
      if (rangeIsCollapsed(range)) {
        return this.getCommonAttributesAtPosition(startPosition);
      } else {
        const textAttributes2 = [];
        const blockAttributes = [];
        this.eachBlockAtRange(range, function(block, textRange) {
          if (textRange[0] !== textRange[1]) {
            textAttributes2.push(block.text.getCommonAttributesAtRange(textRange));
            return blockAttributes.push(attributesForBlock(block));
          }
        });
        return Hash.fromCommonAttributesOfObjects(textAttributes2).merge(Hash.fromCommonAttributesOfObjects(blockAttributes)).toObject();
      }
    }
    getCommonAttributesAtPosition(position) {
      let key, value;
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(position);
      const block = this.getBlockAtIndex(index);
      if (!block) {
        return {};
      }
      const commonAttributes = attributesForBlock(block);
      const attributes2 = block.text.getAttributesAtPosition(offset2);
      const attributesLeft = block.text.getAttributesAtPosition(offset2 - 1);
      const inheritableAttributes = Object.keys(config.textAttributes).filter((key2) => {
        return config.textAttributes[key2].inheritable;
      });
      for (key in attributesLeft) {
        value = attributesLeft[key];
        if (value === attributes2[key] || inheritableAttributes.includes(key)) {
          commonAttributes[key] = value;
        }
      }
      return commonAttributes;
    }
    getRangeOfCommonAttributeAtPosition(attributeName, position) {
      const {
        index,
        offset: offset2
      } = this.locationFromPosition(position);
      const text = this.getTextAtIndex(index);
      const [startOffset, endOffset] = Array.from(text.getExpandedRangeForAttributeAtOffset(attributeName, offset2));
      const start3 = this.positionFromLocation({
        index,
        offset: startOffset
      });
      const end2 = this.positionFromLocation({
        index,
        offset: endOffset
      });
      return normalizeRange([start3, end2]);
    }
    getBaseBlockAttributes() {
      let baseBlockAttributes = this.getBlockAtIndex(0).getAttributes();
      for (let blockIndex = 1; blockIndex < this.getBlockCount(); blockIndex++) {
        const blockAttributes = this.getBlockAtIndex(blockIndex).getAttributes();
        const lastAttributeIndex = Math.min(baseBlockAttributes.length, blockAttributes.length);
        baseBlockAttributes = (() => {
          const result = [];
          for (let index = 0; index < lastAttributeIndex; index++) {
            if (blockAttributes[index] !== baseBlockAttributes[index]) {
              break;
            }
            result.push(blockAttributes[index]);
          }
          return result;
        })();
      }
      return baseBlockAttributes;
    }
    getAttachmentById(attachmentId) {
      for (const attachment of this.getAttachments()) {
        if (attachment.id === attachmentId) {
          return attachment;
        }
      }
    }
    getAttachmentPieces() {
      let attachmentPieces = [];
      this.blockList.eachObject((_ref) => {
        let {
          text
        } = _ref;
        return attachmentPieces = attachmentPieces.concat(text.getAttachmentPieces());
      });
      return attachmentPieces;
    }
    getAttachments() {
      return this.getAttachmentPieces().map((piece) => piece.attachment);
    }
    getRangeOfAttachment(attachment) {
      let position = 0;
      const iterable = this.blockList.toArray();
      for (let index = 0; index < iterable.length; index++) {
        const {
          text
        } = iterable[index];
        const textRange = text.getRangeOfAttachment(attachment);
        if (textRange) {
          return normalizeRange([position + textRange[0], position + textRange[1]]);
        }
        position += text.getLength();
      }
    }
    getLocationRangeOfAttachment(attachment) {
      const range = this.getRangeOfAttachment(attachment);
      return this.locationRangeFromRange(range);
    }
    getAttachmentPieceForAttachment(attachment) {
      for (const piece of this.getAttachmentPieces()) {
        if (piece.attachment === attachment) {
          return piece;
        }
      }
    }
    findRangesForBlockAttribute(attributeName) {
      let position = 0;
      const ranges = [];
      this.getBlocks().forEach((block) => {
        const length = block.getLength();
        if (block.hasAttribute(attributeName)) {
          ranges.push([position, position + length]);
        }
        position += length;
      });
      return ranges;
    }
    findRangesForTextAttribute(attributeName) {
      let {
        withValue
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let position = 0;
      let range = [];
      const ranges = [];
      const match2 = function(piece) {
        if (withValue) {
          return piece.getAttribute(attributeName) === withValue;
        } else {
          return piece.hasAttribute(attributeName);
        }
      };
      this.getPieces().forEach((piece) => {
        const length = piece.getLength();
        if (match2(piece)) {
          if (range[1] === position) {
            range[1] = position + length;
          } else {
            ranges.push(range = [position, position + length]);
          }
        }
        position += length;
      });
      return ranges;
    }
    locationFromPosition(position) {
      const location2 = this.blockList.findIndexAndOffsetAtPosition(Math.max(0, position));
      if (location2.index != null) {
        return location2;
      } else {
        const blocks = this.getBlocks();
        return {
          index: blocks.length - 1,
          offset: blocks[blocks.length - 1].getLength()
        };
      }
    }
    positionFromLocation(location2) {
      return this.blockList.findPositionAtIndexAndOffset(location2.index, location2.offset);
    }
    locationRangeFromPosition(position) {
      return normalizeRange(this.locationFromPosition(position));
    }
    locationRangeFromRange(range) {
      range = normalizeRange(range);
      if (!range)
        return;
      const [startPosition, endPosition] = Array.from(range);
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      return normalizeRange([startLocation, endLocation]);
    }
    rangeFromLocationRange(locationRange) {
      let rightPosition;
      locationRange = normalizeRange(locationRange);
      const leftPosition = this.positionFromLocation(locationRange[0]);
      if (!rangeIsCollapsed(locationRange)) {
        rightPosition = this.positionFromLocation(locationRange[1]);
      }
      return normalizeRange([leftPosition, rightPosition]);
    }
    isEqualTo(document2) {
      return this.blockList.isEqualTo(document2 === null || document2 === void 0 ? void 0 : document2.blockList);
    }
    getTexts() {
      return this.getBlocks().map((block) => block.text);
    }
    getPieces() {
      const pieces = [];
      Array.from(this.getTexts()).forEach((text) => {
        pieces.push(...Array.from(text.getPieces() || []));
      });
      return pieces;
    }
    getObjects() {
      return this.getBlocks().concat(this.getTexts()).concat(this.getPieces());
    }
    toSerializableDocument() {
      const blocks = [];
      this.blockList.eachObject((block) => blocks.push(block.copyWithText(block.text.toSerializableText())));
      return new this.constructor(blocks);
    }
    toString() {
      return this.blockList.toString();
    }
    toJSON() {
      return this.blockList.toJSON();
    }
    toConsole() {
      return JSON.stringify(this.blockList.toArray()).map((block) => JSON.parse(block.text.toConsole()));
    }
  };
  var attributesForBlock = function(block) {
    const attributes2 = {};
    const attributeName = block.getLastAttribute();
    if (attributeName) {
      attributes2[attributeName] = true;
    }
    return attributes2;
  };
  var DEFAULT_ALLOWED_ATTRIBUTES = "style href src width height class".split(" ");
  var DEFAULT_FORBIDDEN_PROTOCOLS = "javascript:".split(" ");
  var DEFAULT_FORBIDDEN_ELEMENTS = "script iframe".split(" ");
  var HTMLSanitizer = class extends BasicObject {
    static sanitize(html2, options2) {
      const sanitizer = new this(html2, options2);
      sanitizer.sanitize();
      return sanitizer;
    }
    constructor(html2) {
      let {
        allowedAttributes,
        forbiddenProtocols,
        forbiddenElements
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.allowedAttributes = allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES;
      this.forbiddenProtocols = forbiddenProtocols || DEFAULT_FORBIDDEN_PROTOCOLS;
      this.forbiddenElements = forbiddenElements || DEFAULT_FORBIDDEN_ELEMENTS;
      this.body = createBodyElementForHTML(html2);
    }
    sanitize() {
      this.sanitizeElements();
      return this.normalizeListElementNesting();
    }
    getHTML() {
      return this.body.innerHTML;
    }
    getBody() {
      return this.body;
    }
    sanitizeElements() {
      const walker = walkTree(this.body);
      const nodesToRemove = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        switch (node.nodeType) {
          case Node.ELEMENT_NODE:
            if (this.elementIsRemovable(node)) {
              nodesToRemove.push(node);
            } else {
              this.sanitizeElement(node);
            }
            break;
          case Node.COMMENT_NODE:
            nodesToRemove.push(node);
            break;
        }
      }
      nodesToRemove.forEach((node) => removeNode(node));
      return this.body;
    }
    sanitizeElement(element) {
      if (element.hasAttribute("href")) {
        if (this.forbiddenProtocols.includes(element.protocol)) {
          element.removeAttribute("href");
        }
      }
      Array.from(element.attributes).forEach((_ref) => {
        let {
          name
        } = _ref;
        if (!this.allowedAttributes.includes(name) && name.indexOf("data-trix") !== 0) {
          element.removeAttribute(name);
        }
      });
      return element;
    }
    normalizeListElementNesting() {
      Array.from(this.body.querySelectorAll("ul,ol")).forEach((listElement) => {
        const previousElement = listElement.previousElementSibling;
        if (previousElement) {
          if (tagName(previousElement) === "li") {
            previousElement.appendChild(listElement);
          }
        }
      });
      return this.body;
    }
    elementIsRemovable(element) {
      if ((element === null || element === void 0 ? void 0 : element.nodeType) !== Node.ELEMENT_NODE)
        return;
      return this.elementIsForbidden(element) || this.elementIsntSerializable(element);
    }
    elementIsForbidden(element) {
      return this.forbiddenElements.includes(tagName(element));
    }
    elementIsntSerializable(element) {
      return element.getAttribute("data-trix-serialize") === "false" && !nodeIsAttachmentElement(element);
    }
  };
  var createBodyElementForHTML = function() {
    let html2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
    html2 = html2.replace(/<\/html[^>]*>[^]*$/i, "</html>");
    const doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = html2;
    Array.from(doc.head.querySelectorAll("style")).forEach((element) => {
      doc.body.appendChild(element);
    });
    return doc.body;
  };
  var pieceForString = function(string) {
    let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const type = "string";
    string = normalizeSpaces(string);
    return {
      string,
      attributes: attributes2,
      type
    };
  };
  var pieceForAttachment = function(attachment) {
    let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const type = "attachment";
    return {
      attachment,
      attributes: attributes2,
      type
    };
  };
  var blockForAttributes = function() {
    let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const text = [];
    return {
      text,
      attributes: attributes2
    };
  };
  var parseTrixDataAttribute = (element, name) => {
    try {
      return JSON.parse(element.getAttribute("data-trix-".concat(name)));
    } catch (error2) {
      return {};
    }
  };
  var getImageDimensions = (element) => {
    const width = element.getAttribute("width");
    const height = element.getAttribute("height");
    const dimensions = {};
    if (width) {
      dimensions.width = parseInt(width, 10);
    }
    if (height) {
      dimensions.height = parseInt(height, 10);
    }
    return dimensions;
  };
  var HTMLParser = class extends BasicObject {
    static parse(html2, options2) {
      const parser = new this(html2, options2);
      parser.parse();
      return parser;
    }
    constructor(html2) {
      let {
        referenceElement
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.html = html2;
      this.referenceElement = referenceElement;
      this.blocks = [];
      this.blockElements = [];
      this.processedElements = [];
    }
    getDocument() {
      return Document.fromJSON(this.blocks);
    }
    parse() {
      try {
        this.createHiddenContainer();
        const html2 = HTMLSanitizer.sanitize(this.html).getHTML();
        this.containerElement.innerHTML = html2;
        const walker = walkTree(this.containerElement, {
          usingFilter: nodeFilter
        });
        while (walker.nextNode()) {
          this.processNode(walker.currentNode);
        }
        return this.translateBlockElementMarginsToNewlines();
      } finally {
        this.removeHiddenContainer();
      }
    }
    createHiddenContainer() {
      if (this.referenceElement) {
        this.containerElement = this.referenceElement.cloneNode(false);
        this.containerElement.removeAttribute("id");
        this.containerElement.setAttribute("data-trix-internal", "");
        this.containerElement.style.display = "none";
        return this.referenceElement.parentNode.insertBefore(this.containerElement, this.referenceElement.nextSibling);
      } else {
        this.containerElement = makeElement({
          tagName: "div",
          style: {
            display: "none"
          }
        });
        return document.body.appendChild(this.containerElement);
      }
    }
    removeHiddenContainer() {
      return removeNode(this.containerElement);
    }
    processNode(node) {
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          if (!this.isInsignificantTextNode(node)) {
            this.appendBlockForTextNode(node);
            return this.processTextNode(node);
          }
          break;
        case Node.ELEMENT_NODE:
          this.appendBlockForElement(node);
          return this.processElement(node);
      }
    }
    appendBlockForTextNode(node) {
      const element = node.parentNode;
      if (element === this.currentBlockElement && this.isBlockElement(node.previousSibling)) {
        return this.appendStringWithAttributes("\n");
      } else if (element === this.containerElement || this.isBlockElement(element)) {
        var _this$currentBlock;
        const attributes2 = this.getBlockAttributes(element);
        if (!arraysAreEqual(attributes2, (_this$currentBlock = this.currentBlock) === null || _this$currentBlock === void 0 ? void 0 : _this$currentBlock.attributes)) {
          this.currentBlock = this.appendBlockForAttributesWithElement(attributes2, element);
          this.currentBlockElement = element;
        }
      }
    }
    appendBlockForElement(element) {
      const elementIsBlockElement = this.isBlockElement(element);
      const currentBlockContainsElement = elementContainsNode(this.currentBlockElement, element);
      if (elementIsBlockElement && !this.isBlockElement(element.firstChild)) {
        if (!this.isInsignificantTextNode(element.firstChild) || !this.isBlockElement(element.firstElementChild)) {
          const attributes2 = this.getBlockAttributes(element);
          if (element.firstChild) {
            if (!(currentBlockContainsElement && arraysAreEqual(attributes2, this.currentBlock.attributes))) {
              this.currentBlock = this.appendBlockForAttributesWithElement(attributes2, element);
              this.currentBlockElement = element;
            } else {
              return this.appendStringWithAttributes("\n");
            }
          }
        }
      } else if (this.currentBlockElement && !currentBlockContainsElement && !elementIsBlockElement) {
        const parentBlockElement = this.findParentBlockElement(element);
        if (parentBlockElement) {
          return this.appendBlockForElement(parentBlockElement);
        } else {
          this.currentBlock = this.appendEmptyBlock();
          this.currentBlockElement = null;
        }
      }
    }
    findParentBlockElement(element) {
      let {
        parentElement
      } = element;
      while (parentElement && parentElement !== this.containerElement) {
        if (this.isBlockElement(parentElement) && this.blockElements.includes(parentElement)) {
          return parentElement;
        } else {
          parentElement = parentElement.parentElement;
        }
      }
      return null;
    }
    processTextNode(node) {
      let string = node.data;
      if (!elementCanDisplayPreformattedText(node.parentNode)) {
        var _node$previousSibling;
        string = squishBreakableWhitespace(string);
        if (stringEndsWithWhitespace((_node$previousSibling = node.previousSibling) === null || _node$previousSibling === void 0 ? void 0 : _node$previousSibling.textContent)) {
          string = leftTrimBreakableWhitespace(string);
        }
      }
      return this.appendStringWithAttributes(string, this.getTextAttributes(node.parentNode));
    }
    processElement(element) {
      let attributes2;
      if (nodeIsAttachmentElement(element)) {
        attributes2 = parseTrixDataAttribute(element, "attachment");
        if (Object.keys(attributes2).length) {
          const textAttributes2 = this.getTextAttributes(element);
          this.appendAttachmentWithAttributes(attributes2, textAttributes2);
          element.innerHTML = "";
        }
        return this.processedElements.push(element);
      } else {
        switch (tagName(element)) {
          case "br":
            if (!this.isExtraBR(element) && !this.isBlockElement(element.nextSibling)) {
              this.appendStringWithAttributes("\n", this.getTextAttributes(element));
            }
            return this.processedElements.push(element);
          case "img":
            attributes2 = {
              url: element.getAttribute("src"),
              contentType: "image"
            };
            const object2 = getImageDimensions(element);
            for (const key in object2) {
              const value = object2[key];
              attributes2[key] = value;
            }
            this.appendAttachmentWithAttributes(attributes2, this.getTextAttributes(element));
            return this.processedElements.push(element);
          case "tr":
            if (element.parentNode.firstChild !== element) {
              return this.appendStringWithAttributes("\n");
            }
            break;
          case "td":
            if (element.parentNode.firstChild !== element) {
              return this.appendStringWithAttributes(" | ");
            }
            break;
        }
      }
    }
    appendBlockForAttributesWithElement(attributes2, element) {
      this.blockElements.push(element);
      const block = blockForAttributes(attributes2);
      this.blocks.push(block);
      return block;
    }
    appendEmptyBlock() {
      return this.appendBlockForAttributesWithElement([], null);
    }
    appendStringWithAttributes(string, attributes2) {
      return this.appendPiece(pieceForString(string, attributes2));
    }
    appendAttachmentWithAttributes(attachment, attributes2) {
      return this.appendPiece(pieceForAttachment(attachment, attributes2));
    }
    appendPiece(piece) {
      if (this.blocks.length === 0) {
        this.appendEmptyBlock();
      }
      return this.blocks[this.blocks.length - 1].text.push(piece);
    }
    appendStringToTextAtIndex(string, index) {
      const {
        text
      } = this.blocks[index];
      const piece = text[text.length - 1];
      if ((piece === null || piece === void 0 ? void 0 : piece.type) === "string") {
        piece.string += string;
      } else {
        return text.push(pieceForString(string));
      }
    }
    prependStringToTextAtIndex(string, index) {
      const {
        text
      } = this.blocks[index];
      const piece = text[0];
      if ((piece === null || piece === void 0 ? void 0 : piece.type) === "string") {
        piece.string = string + piece.string;
      } else {
        return text.unshift(pieceForString(string));
      }
    }
    getTextAttributes(element) {
      let value;
      const attributes2 = {};
      for (const attribute in config.textAttributes) {
        const configAttr = config.textAttributes[attribute];
        if (configAttr.tagName && findClosestElementFromNode(element, {
          matchingSelector: configAttr.tagName,
          untilNode: this.containerElement
        })) {
          attributes2[attribute] = true;
        } else if (configAttr.parser) {
          value = configAttr.parser(element);
          if (value) {
            let attributeInheritedFromBlock = false;
            for (const blockElement of this.findBlockElementAncestors(element)) {
              if (configAttr.parser(blockElement) === value) {
                attributeInheritedFromBlock = true;
                break;
              }
            }
            if (!attributeInheritedFromBlock) {
              attributes2[attribute] = value;
            }
          }
        } else if (configAttr.styleProperty) {
          value = element.style[configAttr.styleProperty];
          if (value) {
            attributes2[attribute] = value;
          }
        }
      }
      if (nodeIsAttachmentElement(element)) {
        const object2 = parseTrixDataAttribute(element, "attributes");
        for (const key in object2) {
          value = object2[key];
          attributes2[key] = value;
        }
      }
      return attributes2;
    }
    getBlockAttributes(element) {
      const attributes2 = [];
      while (element && element !== this.containerElement) {
        for (const attribute in config.blockAttributes) {
          const attrConfig = config.blockAttributes[attribute];
          if (attrConfig.parse !== false) {
            if (tagName(element) === attrConfig.tagName) {
              var _attrConfig$test;
              if ((_attrConfig$test = attrConfig.test) !== null && _attrConfig$test !== void 0 && _attrConfig$test.call(attrConfig, element) || !attrConfig.test) {
                attributes2.push(attribute);
                if (attrConfig.listAttribute) {
                  attributes2.push(attrConfig.listAttribute);
                }
              }
            }
          }
        }
        element = element.parentNode;
      }
      return attributes2.reverse();
    }
    findBlockElementAncestors(element) {
      const ancestors = [];
      while (element && element !== this.containerElement) {
        const tag = tagName(element);
        if (getBlockTagNames().includes(tag)) {
          ancestors.push(element);
        }
        element = element.parentNode;
      }
      return ancestors;
    }
    isBlockElement(element) {
      if ((element === null || element === void 0 ? void 0 : element.nodeType) !== Node.ELEMENT_NODE)
        return;
      if (nodeIsAttachmentElement(element))
        return;
      if (findClosestElementFromNode(element, {
        matchingSelector: "td",
        untilNode: this.containerElement
      }))
        return;
      return getBlockTagNames().includes(tagName(element)) || window.getComputedStyle(element).display === "block";
    }
    isInsignificantTextNode(node) {
      if ((node === null || node === void 0 ? void 0 : node.nodeType) !== Node.TEXT_NODE)
        return;
      if (!stringIsAllBreakableWhitespace(node.data))
        return;
      const {
        parentNode,
        previousSibling,
        nextSibling
      } = node;
      if (nodeEndsWithNonWhitespace(parentNode.previousSibling) && !this.isBlockElement(parentNode.previousSibling))
        return;
      if (elementCanDisplayPreformattedText(parentNode))
        return;
      return !previousSibling || this.isBlockElement(previousSibling) || !nextSibling || this.isBlockElement(nextSibling);
    }
    isExtraBR(element) {
      return tagName(element) === "br" && this.isBlockElement(element.parentNode) && element.parentNode.lastChild === element;
    }
    translateBlockElementMarginsToNewlines() {
      const defaultMargin = this.getMarginOfDefaultBlockElement();
      for (let index = 0; index < this.blocks.length; index++) {
        const margin = this.getMarginOfBlockElementAtIndex(index);
        if (margin) {
          if (margin.top > defaultMargin.top * 2) {
            this.prependStringToTextAtIndex("\n", index);
          }
          if (margin.bottom > defaultMargin.bottom * 2) {
            this.appendStringToTextAtIndex("\n", index);
          }
        }
      }
    }
    getMarginOfBlockElementAtIndex(index) {
      const element = this.blockElements[index];
      if (element) {
        if (element.textContent) {
          if (!getBlockTagNames().includes(tagName(element)) && !this.processedElements.includes(element)) {
            return getBlockElementMargin(element);
          }
        }
      }
    }
    getMarginOfDefaultBlockElement() {
      const element = makeElement(config.blockAttributes.default.tagName);
      this.containerElement.appendChild(element);
      return getBlockElementMargin(element);
    }
  };
  var elementCanDisplayPreformattedText = function(element) {
    const {
      whiteSpace
    } = window.getComputedStyle(element);
    return ["pre", "pre-wrap", "pre-line"].includes(whiteSpace);
  };
  var nodeEndsWithNonWhitespace = (node) => node && !stringEndsWithWhitespace(node.textContent);
  var getBlockElementMargin = function(element) {
    const style = window.getComputedStyle(element);
    if (style.display === "block") {
      return {
        top: parseInt(style.marginTop),
        bottom: parseInt(style.marginBottom)
      };
    }
  };
  var nodeFilter = function(node) {
    if (tagName(node) === "style") {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var leftTrimBreakableWhitespace = (string) => string.replace(new RegExp("^".concat(breakableWhitespacePattern.source, "+")), "");
  var stringIsAllBreakableWhitespace = (string) => new RegExp("^".concat(breakableWhitespacePattern.source, "*$")).test(string);
  var stringEndsWithWhitespace = (string) => /\s$/.test(string);
  var LineBreakInsertion = class {
    constructor(composition) {
      this.composition = composition;
      this.document = this.composition.document;
      const selectedRange = this.composition.getSelectedRange();
      this.startPosition = selectedRange[0];
      this.endPosition = selectedRange[1];
      this.startLocation = this.document.locationFromPosition(this.startPosition);
      this.endLocation = this.document.locationFromPosition(this.endPosition);
      this.block = this.document.getBlockAtIndex(this.endLocation.index);
      this.breaksOnReturn = this.block.breaksOnReturn();
      this.previousCharacter = this.block.text.getStringAtPosition(this.endLocation.offset - 1);
      this.nextCharacter = this.block.text.getStringAtPosition(this.endLocation.offset);
    }
    shouldInsertBlockBreak() {
      if (this.block.hasAttributes() && this.block.isListItem() && !this.block.isEmpty()) {
        return this.startLocation.offset !== 0;
      } else {
        return this.breaksOnReturn && this.nextCharacter !== "\n";
      }
    }
    shouldBreakFormattedBlock() {
      return this.block.hasAttributes() && !this.block.isListItem() && (this.breaksOnReturn && this.nextCharacter === "\n" || this.previousCharacter === "\n");
    }
    shouldDecreaseListLevel() {
      return this.block.hasAttributes() && this.block.isListItem() && this.block.isEmpty();
    }
    shouldPrependListItem() {
      return this.block.isListItem() && this.startLocation.offset === 0 && !this.block.isEmpty();
    }
    shouldRemoveLastBlockAttribute() {
      return this.block.hasAttributes() && !this.block.isListItem() && this.block.isEmpty();
    }
  };
  var PLACEHOLDER = " ";
  var Composition = class extends BasicObject {
    constructor() {
      super(...arguments);
      this.document = new Document();
      this.attachments = [];
      this.currentAttributes = {};
      this.revision = 0;
    }
    setDocument(document2) {
      if (!document2.isEqualTo(this.document)) {
        var _this$delegate, _this$delegate$compos;
        this.document = document2;
        this.refreshAttachments();
        this.revision++;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$compos = _this$delegate.compositionDidChangeDocument) === null || _this$delegate$compos === void 0 ? void 0 : _this$delegate$compos.call(_this$delegate, document2);
      }
    }
    getSnapshot() {
      return {
        document: this.document,
        selectedRange: this.getSelectedRange()
      };
    }
    loadSnapshot(_ref) {
      var _this$delegate2, _this$delegate2$compo, _this$delegate3, _this$delegate3$compo;
      let {
        document: document2,
        selectedRange
      } = _ref;
      (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$compo = _this$delegate2.compositionWillLoadSnapshot) === null || _this$delegate2$compo === void 0 ? void 0 : _this$delegate2$compo.call(_this$delegate2);
      this.setDocument(document2 != null ? document2 : new Document());
      this.setSelection(selectedRange != null ? selectedRange : [0, 0]);
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$compo = _this$delegate3.compositionDidLoadSnapshot) === null || _this$delegate3$compo === void 0 ? void 0 : _this$delegate3$compo.call(_this$delegate3);
    }
    insertText(text) {
      let {
        updatePosition
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        updatePosition: true
      };
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertTextAtRange(text, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + text.getLength();
      if (updatePosition) {
        this.setSelection(endPosition);
      }
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertBlock() {
      let block = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Block();
      const document2 = new Document([block]);
      return this.insertDocument(document2);
    }
    insertDocument() {
      let document2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Document();
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertDocumentAtRange(document2, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + document2.getLength();
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertString(string, options2) {
      const attributes2 = this.getCurrentTextAttributes();
      const text = Text.textForStringWithAttributes(string, attributes2);
      return this.insertText(text, options2);
    }
    insertBlockBreak() {
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertBlockBreakAtRange(selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + 1;
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertLineBreak() {
      const insertion = new LineBreakInsertion(this);
      if (insertion.shouldDecreaseListLevel()) {
        this.decreaseListLevel();
        return this.setSelection(insertion.startPosition);
      } else if (insertion.shouldPrependListItem()) {
        const document2 = new Document([insertion.block.copyWithoutText()]);
        return this.insertDocument(document2);
      } else if (insertion.shouldInsertBlockBreak()) {
        return this.insertBlockBreak();
      } else if (insertion.shouldRemoveLastBlockAttribute()) {
        return this.removeLastBlockAttribute();
      } else if (insertion.shouldBreakFormattedBlock()) {
        return this.breakFormattedBlock(insertion);
      } else {
        return this.insertString("\n");
      }
    }
    insertHTML(html2) {
      const document2 = HTMLParser.parse(html2).getDocument();
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.mergeDocumentAtRange(document2, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + document2.getLength() - 1;
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    replaceHTML(html2) {
      const document2 = HTMLParser.parse(html2).getDocument().copyUsingObjectsFromDocument(this.document);
      const locationRange = this.getLocationRange({
        strict: false
      });
      const selectedRange = this.document.rangeFromLocationRange(locationRange);
      this.setDocument(document2);
      return this.setSelection(selectedRange);
    }
    insertFile(file) {
      return this.insertFiles([file]);
    }
    insertFiles(files) {
      const attachments2 = [];
      Array.from(files).forEach((file) => {
        var _this$delegate4;
        if ((_this$delegate4 = this.delegate) !== null && _this$delegate4 !== void 0 && _this$delegate4.compositionShouldAcceptFile(file)) {
          const attachment = Attachment.attachmentForFile(file);
          attachments2.push(attachment);
        }
      });
      return this.insertAttachments(attachments2);
    }
    insertAttachment(attachment) {
      return this.insertAttachments([attachment]);
    }
    insertAttachments(attachments2) {
      let text = new Text();
      Array.from(attachments2).forEach((attachment) => {
        var _config$attachments$t;
        const type = attachment.getType();
        const presentation = (_config$attachments$t = config.attachments[type]) === null || _config$attachments$t === void 0 ? void 0 : _config$attachments$t.presentation;
        const attributes2 = this.getCurrentTextAttributes();
        if (presentation) {
          attributes2.presentation = presentation;
        }
        const attachmentText = Text.textForAttachmentWithAttributes(attachment, attributes2);
        text = text.appendText(attachmentText);
      });
      return this.insertText(text);
    }
    shouldManageDeletingInDirection(direction) {
      const locationRange = this.getLocationRange();
      if (rangeIsCollapsed(locationRange)) {
        if (direction === "backward" && locationRange[0].offset === 0) {
          return true;
        }
        if (this.shouldManageMovingCursorInDirection(direction)) {
          return true;
        }
      } else {
        if (locationRange[0].index !== locationRange[1].index) {
          return true;
        }
      }
      return false;
    }
    deleteInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let attachment, deletingIntoPreviousBlock, selectionSpansBlocks;
      const locationRange = this.getLocationRange();
      let range = this.getSelectedRange();
      const selectionIsCollapsed = rangeIsCollapsed(range);
      if (selectionIsCollapsed) {
        deletingIntoPreviousBlock = direction === "backward" && locationRange[0].offset === 0;
      } else {
        selectionSpansBlocks = locationRange[0].index !== locationRange[1].index;
      }
      if (deletingIntoPreviousBlock) {
        if (this.canDecreaseBlockAttributeLevel()) {
          const block = this.getBlock();
          if (block.isListItem()) {
            this.decreaseListLevel();
          } else {
            this.decreaseBlockAttributeLevel();
          }
          this.setSelection(range[0]);
          if (block.isEmpty()) {
            return false;
          }
        }
      }
      if (selectionIsCollapsed) {
        range = this.getExpandedRangeInDirection(direction, {
          length
        });
        if (direction === "backward") {
          attachment = this.getAttachmentAtRange(range);
        }
      }
      if (attachment) {
        this.editAttachment(attachment);
        return false;
      } else {
        this.setDocument(this.document.removeTextAtRange(range));
        this.setSelection(range[0]);
        if (deletingIntoPreviousBlock || selectionSpansBlocks) {
          return false;
        }
      }
    }
    moveTextFromRange(range) {
      const [position] = Array.from(this.getSelectedRange());
      this.setDocument(this.document.moveTextFromRangeToPosition(range, position));
      return this.setSelection(position);
    }
    removeAttachment(attachment) {
      const range = this.document.getRangeOfAttachment(attachment);
      if (range) {
        this.stopEditingAttachment();
        this.setDocument(this.document.removeTextAtRange(range));
        return this.setSelection(range[0]);
      }
    }
    removeLastBlockAttribute() {
      const [startPosition, endPosition] = Array.from(this.getSelectedRange());
      const block = this.document.getBlockAtPosition(endPosition);
      this.removeCurrentAttribute(block.getLastAttribute());
      return this.setSelection(startPosition);
    }
    insertPlaceholder() {
      this.placeholderPosition = this.getPosition();
      return this.insertString(PLACEHOLDER);
    }
    selectPlaceholder() {
      if (this.placeholderPosition != null) {
        this.setSelectedRange([this.placeholderPosition, this.placeholderPosition + PLACEHOLDER.length]);
        return this.getSelectedRange();
      }
    }
    forgetPlaceholder() {
      this.placeholderPosition = null;
    }
    hasCurrentAttribute(attributeName) {
      const value = this.currentAttributes[attributeName];
      return value != null && value !== false;
    }
    toggleCurrentAttribute(attributeName) {
      const value = !this.currentAttributes[attributeName];
      if (value) {
        return this.setCurrentAttribute(attributeName, value);
      } else {
        return this.removeCurrentAttribute(attributeName);
      }
    }
    canSetCurrentAttribute(attributeName) {
      if (getBlockConfig(attributeName)) {
        return this.canSetCurrentBlockAttribute(attributeName);
      } else {
        return this.canSetCurrentTextAttribute(attributeName);
      }
    }
    canSetCurrentTextAttribute(attributeName) {
      const document2 = this.getSelectedDocument();
      if (!document2)
        return;
      for (const attachment of Array.from(document2.getAttachments())) {
        if (!attachment.hasContent()) {
          return false;
        }
      }
      return true;
    }
    canSetCurrentBlockAttribute(attributeName) {
      const block = this.getBlock();
      if (!block)
        return;
      return !block.isTerminalBlock();
    }
    setCurrentAttribute(attributeName, value) {
      if (getBlockConfig(attributeName)) {
        return this.setBlockAttribute(attributeName, value);
      } else {
        this.setTextAttribute(attributeName, value);
        this.currentAttributes[attributeName] = value;
        return this.notifyDelegateOfCurrentAttributesChange();
      }
    }
    setTextAttribute(attributeName, value) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      const [startPosition, endPosition] = Array.from(selectedRange);
      if (startPosition === endPosition) {
        if (attributeName === "href") {
          const text = Text.textForStringWithAttributes(value, {
            href: value
          });
          return this.insertText(text);
        }
      } else {
        return this.setDocument(this.document.addAttributeAtRange(attributeName, value, selectedRange));
      }
    }
    setBlockAttribute(attributeName, value) {
      const selectedRange = this.getSelectedRange();
      if (this.canSetCurrentAttribute(attributeName)) {
        this.setDocument(this.document.applyBlockAttributeAtRange(attributeName, value, selectedRange));
        return this.setSelection(selectedRange);
      }
    }
    removeCurrentAttribute(attributeName) {
      if (getBlockConfig(attributeName)) {
        this.removeBlockAttribute(attributeName);
        return this.updateCurrentAttributes();
      } else {
        this.removeTextAttribute(attributeName);
        delete this.currentAttributes[attributeName];
        return this.notifyDelegateOfCurrentAttributesChange();
      }
    }
    removeTextAttribute(attributeName) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
    }
    removeBlockAttribute(attributeName) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
    }
    canDecreaseNestingLevel() {
      var _this$getBlock;
      return ((_this$getBlock = this.getBlock()) === null || _this$getBlock === void 0 ? void 0 : _this$getBlock.getNestingLevel()) > 0;
    }
    canIncreaseNestingLevel() {
      var _getBlockConfig;
      const block = this.getBlock();
      if (!block)
        return;
      if ((_getBlockConfig = getBlockConfig(block.getLastNestableAttribute())) !== null && _getBlockConfig !== void 0 && _getBlockConfig.listAttribute) {
        const previousBlock = this.getPreviousBlock();
        if (previousBlock) {
          return arrayStartsWith(previousBlock.getListItemAttributes(), block.getListItemAttributes());
        }
      } else {
        return block.getNestingLevel() > 0;
      }
    }
    decreaseNestingLevel() {
      const block = this.getBlock();
      if (!block)
        return;
      return this.setDocument(this.document.replaceBlock(block, block.decreaseNestingLevel()));
    }
    increaseNestingLevel() {
      const block = this.getBlock();
      if (!block)
        return;
      return this.setDocument(this.document.replaceBlock(block, block.increaseNestingLevel()));
    }
    canDecreaseBlockAttributeLevel() {
      var _this$getBlock2;
      return ((_this$getBlock2 = this.getBlock()) === null || _this$getBlock2 === void 0 ? void 0 : _this$getBlock2.getAttributeLevel()) > 0;
    }
    decreaseBlockAttributeLevel() {
      var _this$getBlock3;
      const attribute = (_this$getBlock3 = this.getBlock()) === null || _this$getBlock3 === void 0 ? void 0 : _this$getBlock3.getLastAttribute();
      if (attribute) {
        return this.removeCurrentAttribute(attribute);
      }
    }
    decreaseListLevel() {
      let [startPosition] = Array.from(this.getSelectedRange());
      const {
        index
      } = this.document.locationFromPosition(startPosition);
      let endIndex = index;
      const attributeLevel = this.getBlock().getAttributeLevel();
      let block = this.document.getBlockAtIndex(endIndex + 1);
      while (block) {
        if (!block.isListItem() || block.getAttributeLevel() <= attributeLevel) {
          break;
        }
        endIndex++;
        block = this.document.getBlockAtIndex(endIndex + 1);
      }
      startPosition = this.document.positionFromLocation({
        index,
        offset: 0
      });
      const endPosition = this.document.positionFromLocation({
        index: endIndex,
        offset: 0
      });
      return this.setDocument(this.document.removeLastListAttributeAtRange([startPosition, endPosition]));
    }
    updateCurrentAttributes() {
      const selectedRange = this.getSelectedRange({
        ignoreLock: true
      });
      if (selectedRange) {
        const currentAttributes = this.document.getCommonAttributesAtRange(selectedRange);
        Array.from(getAllAttributeNames()).forEach((attributeName) => {
          if (!currentAttributes[attributeName]) {
            if (!this.canSetCurrentAttribute(attributeName)) {
              currentAttributes[attributeName] = false;
            }
          }
        });
        if (!objectsAreEqual(currentAttributes, this.currentAttributes)) {
          this.currentAttributes = currentAttributes;
          return this.notifyDelegateOfCurrentAttributesChange();
        }
      }
    }
    getCurrentAttributes() {
      return extend3.call({}, this.currentAttributes);
    }
    getCurrentTextAttributes() {
      const attributes2 = {};
      for (const key in this.currentAttributes) {
        const value = this.currentAttributes[key];
        if (value !== false) {
          if (getTextConfig(key)) {
            attributes2[key] = value;
          }
        }
      }
      return attributes2;
    }
    freezeSelection() {
      return this.setCurrentAttribute("frozen", true);
    }
    thawSelection() {
      return this.removeCurrentAttribute("frozen");
    }
    hasFrozenSelection() {
      return this.hasCurrentAttribute("frozen");
    }
    setSelection(selectedRange) {
      var _this$delegate5;
      const locationRange = this.document.locationRangeFromRange(selectedRange);
      return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.compositionDidRequestChangingSelectionToLocationRange(locationRange);
    }
    getSelectedRange() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.rangeFromLocationRange(locationRange);
      }
    }
    setSelectedRange(selectedRange) {
      const locationRange = this.document.locationRangeFromRange(selectedRange);
      return this.getSelectionManager().setLocationRange(locationRange);
    }
    getPosition() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.positionFromLocation(locationRange[0]);
      }
    }
    getLocationRange(options2) {
      if (this.targetLocationRange) {
        return this.targetLocationRange;
      } else {
        return this.getSelectionManager().getLocationRange(options2) || normalizeRange({
          index: 0,
          offset: 0
        });
      }
    }
    withTargetLocationRange(locationRange, fn2) {
      let result;
      this.targetLocationRange = locationRange;
      try {
        result = fn2();
      } finally {
        this.targetLocationRange = null;
      }
      return result;
    }
    withTargetRange(range, fn2) {
      const locationRange = this.document.locationRangeFromRange(range);
      return this.withTargetLocationRange(locationRange, fn2);
    }
    withTargetDOMRange(domRange, fn2) {
      const locationRange = this.createLocationRangeFromDOMRange(domRange, {
        strict: false
      });
      return this.withTargetLocationRange(locationRange, fn2);
    }
    getExpandedRangeInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let [startPosition, endPosition] = Array.from(this.getSelectedRange());
      if (direction === "backward") {
        if (length) {
          startPosition -= length;
        } else {
          startPosition = this.translateUTF16PositionFromOffset(startPosition, -1);
        }
      } else {
        if (length) {
          endPosition += length;
        } else {
          endPosition = this.translateUTF16PositionFromOffset(endPosition, 1);
        }
      }
      return normalizeRange([startPosition, endPosition]);
    }
    shouldManageMovingCursorInDirection(direction) {
      if (this.editingAttachment) {
        return true;
      }
      const range = this.getExpandedRangeInDirection(direction);
      return this.getAttachmentAtRange(range) != null;
    }
    moveCursorInDirection(direction) {
      let canEditAttachment, range;
      if (this.editingAttachment) {
        range = this.document.getRangeOfAttachment(this.editingAttachment);
      } else {
        const selectedRange = this.getSelectedRange();
        range = this.getExpandedRangeInDirection(direction);
        canEditAttachment = !rangesAreEqual(selectedRange, range);
      }
      if (direction === "backward") {
        this.setSelectedRange(range[0]);
      } else {
        this.setSelectedRange(range[1]);
      }
      if (canEditAttachment) {
        const attachment = this.getAttachmentAtRange(range);
        if (attachment) {
          return this.editAttachment(attachment);
        }
      }
    }
    expandSelectionInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      const range = this.getExpandedRangeInDirection(direction, {
        length
      });
      return this.setSelectedRange(range);
    }
    expandSelectionForEditing() {
      if (this.hasCurrentAttribute("href")) {
        return this.expandSelectionAroundCommonAttribute("href");
      }
    }
    expandSelectionAroundCommonAttribute(attributeName) {
      const position = this.getPosition();
      const range = this.document.getRangeOfCommonAttributeAtPosition(attributeName, position);
      return this.setSelectedRange(range);
    }
    selectionContainsAttachments() {
      var _this$getSelectedAtta;
      return ((_this$getSelectedAtta = this.getSelectedAttachments()) === null || _this$getSelectedAtta === void 0 ? void 0 : _this$getSelectedAtta.length) > 0;
    }
    selectionIsInCursorTarget() {
      return this.editingAttachment || this.positionIsCursorTarget(this.getPosition());
    }
    positionIsCursorTarget(position) {
      const location2 = this.document.locationFromPosition(position);
      if (location2) {
        return this.locationIsCursorTarget(location2);
      }
    }
    positionIsBlockBreak(position) {
      var _this$document$getPie;
      return (_this$document$getPie = this.document.getPieceAtPosition(position)) === null || _this$document$getPie === void 0 ? void 0 : _this$document$getPie.isBlockBreak();
    }
    getSelectedDocument() {
      const selectedRange = this.getSelectedRange();
      if (selectedRange) {
        return this.document.getDocumentAtRange(selectedRange);
      }
    }
    getSelectedAttachments() {
      var _this$getSelectedDocu;
      return (_this$getSelectedDocu = this.getSelectedDocument()) === null || _this$getSelectedDocu === void 0 ? void 0 : _this$getSelectedDocu.getAttachments();
    }
    getAttachments() {
      return this.attachments.slice(0);
    }
    refreshAttachments() {
      const attachments2 = this.document.getAttachments();
      const {
        added,
        removed
      } = summarizeArrayChange(this.attachments, attachments2);
      this.attachments = attachments2;
      Array.from(removed).forEach((attachment) => {
        var _this$delegate6, _this$delegate6$compo;
        attachment.delegate = null;
        (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$compo = _this$delegate6.compositionDidRemoveAttachment) === null || _this$delegate6$compo === void 0 ? void 0 : _this$delegate6$compo.call(_this$delegate6, attachment);
      });
      return (() => {
        const result = [];
        Array.from(added).forEach((attachment) => {
          var _this$delegate7, _this$delegate7$compo;
          attachment.delegate = this;
          result.push((_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$compo = _this$delegate7.compositionDidAddAttachment) === null || _this$delegate7$compo === void 0 ? void 0 : _this$delegate7$compo.call(_this$delegate7, attachment));
        });
        return result;
      })();
    }
    attachmentDidChangeAttributes(attachment) {
      var _this$delegate8, _this$delegate8$compo;
      this.revision++;
      return (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : (_this$delegate8$compo = _this$delegate8.compositionDidEditAttachment) === null || _this$delegate8$compo === void 0 ? void 0 : _this$delegate8$compo.call(_this$delegate8, attachment);
    }
    attachmentDidChangePreviewURL(attachment) {
      var _this$delegate9, _this$delegate9$compo;
      this.revision++;
      return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : (_this$delegate9$compo = _this$delegate9.compositionDidChangeAttachmentPreviewURL) === null || _this$delegate9$compo === void 0 ? void 0 : _this$delegate9$compo.call(_this$delegate9, attachment);
    }
    editAttachment(attachment, options2) {
      var _this$delegate10, _this$delegate10$comp;
      if (attachment === this.editingAttachment)
        return;
      this.stopEditingAttachment();
      this.editingAttachment = attachment;
      return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : (_this$delegate10$comp = _this$delegate10.compositionDidStartEditingAttachment) === null || _this$delegate10$comp === void 0 ? void 0 : _this$delegate10$comp.call(_this$delegate10, this.editingAttachment, options2);
    }
    stopEditingAttachment() {
      var _this$delegate11, _this$delegate11$comp;
      if (!this.editingAttachment)
        return;
      (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : (_this$delegate11$comp = _this$delegate11.compositionDidStopEditingAttachment) === null || _this$delegate11$comp === void 0 ? void 0 : _this$delegate11$comp.call(_this$delegate11, this.editingAttachment);
      this.editingAttachment = null;
    }
    updateAttributesForAttachment(attributes2, attachment) {
      return this.setDocument(this.document.updateAttributesForAttachment(attributes2, attachment));
    }
    removeAttributeForAttachment(attribute, attachment) {
      return this.setDocument(this.document.removeAttributeForAttachment(attribute, attachment));
    }
    breakFormattedBlock(insertion) {
      let {
        document: document2
      } = insertion;
      const {
        block
      } = insertion;
      let position = insertion.startPosition;
      let range = [position - 1, position];
      if (block.getBlockBreakPosition() === insertion.startLocation.offset) {
        if (block.breaksOnReturn() && insertion.nextCharacter === "\n") {
          position += 1;
        } else {
          document2 = document2.removeTextAtRange(range);
        }
        range = [position, position];
      } else if (insertion.nextCharacter === "\n") {
        if (insertion.previousCharacter === "\n") {
          range = [position - 1, position + 1];
        } else {
          range = [position, position + 1];
          position += 1;
        }
      } else if (insertion.startLocation.offset - 1 !== 0) {
        position += 1;
      }
      const newDocument = new Document([block.removeLastAttribute().copyWithoutText()]);
      this.setDocument(document2.insertDocumentAtRange(newDocument, range));
      return this.setSelection(position);
    }
    getPreviousBlock() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        const {
          index
        } = locationRange[0];
        if (index > 0) {
          return this.document.getBlockAtIndex(index - 1);
        }
      }
    }
    getBlock() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.getBlockAtIndex(locationRange[0].index);
      }
    }
    getAttachmentAtRange(range) {
      const document2 = this.document.getDocumentAtRange(range);
      if (document2.toString() === "".concat(OBJECT_REPLACEMENT_CHARACTER, "\n")) {
        return document2.getAttachments()[0];
      }
    }
    notifyDelegateOfCurrentAttributesChange() {
      var _this$delegate12, _this$delegate12$comp;
      return (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : (_this$delegate12$comp = _this$delegate12.compositionDidChangeCurrentAttributes) === null || _this$delegate12$comp === void 0 ? void 0 : _this$delegate12$comp.call(_this$delegate12, this.currentAttributes);
    }
    notifyDelegateOfInsertionAtRange(range) {
      var _this$delegate13, _this$delegate13$comp;
      return (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : (_this$delegate13$comp = _this$delegate13.compositionDidPerformInsertionAtRange) === null || _this$delegate13$comp === void 0 ? void 0 : _this$delegate13$comp.call(_this$delegate13, range);
    }
    translateUTF16PositionFromOffset(position, offset2) {
      const utf16string = this.document.toUTF16String();
      const utf16position = utf16string.offsetFromUCS2Offset(position);
      return utf16string.offsetToUCS2Offset(utf16position + offset2);
    }
  };
  Composition.proxyMethod("getSelectionManager().getPointRange");
  Composition.proxyMethod("getSelectionManager().setLocationRangeFromPointRange");
  Composition.proxyMethod("getSelectionManager().createLocationRangeFromDOMRange");
  Composition.proxyMethod("getSelectionManager().locationIsCursorTarget");
  Composition.proxyMethod("getSelectionManager().selectionIsExpanded");
  Composition.proxyMethod("delegate?.getSelectionManager");
  var UndoManager = class extends BasicObject {
    constructor(composition) {
      super(...arguments);
      this.composition = composition;
      this.undoEntries = [];
      this.redoEntries = [];
    }
    recordUndoEntry(description) {
      let {
        context,
        consolidatable
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      const previousEntry = this.undoEntries.slice(-1)[0];
      if (!consolidatable || !entryHasDescriptionAndContext(previousEntry, description, context)) {
        const undoEntry = this.createEntry({
          description,
          context
        });
        this.undoEntries.push(undoEntry);
        this.redoEntries = [];
      }
    }
    undo() {
      const undoEntry = this.undoEntries.pop();
      if (undoEntry) {
        const redoEntry = this.createEntry(undoEntry);
        this.redoEntries.push(redoEntry);
        return this.composition.loadSnapshot(undoEntry.snapshot);
      }
    }
    redo() {
      const redoEntry = this.redoEntries.pop();
      if (redoEntry) {
        const undoEntry = this.createEntry(redoEntry);
        this.undoEntries.push(undoEntry);
        return this.composition.loadSnapshot(redoEntry.snapshot);
      }
    }
    canUndo() {
      return this.undoEntries.length > 0;
    }
    canRedo() {
      return this.redoEntries.length > 0;
    }
    createEntry() {
      let {
        description,
        context
      } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      return {
        description: description === null || description === void 0 ? void 0 : description.toString(),
        context: JSON.stringify(context),
        snapshot: this.composition.getSnapshot()
      };
    }
  };
  var entryHasDescriptionAndContext = (entry, description, context) => (entry === null || entry === void 0 ? void 0 : entry.description) === (description === null || description === void 0 ? void 0 : description.toString()) && (entry === null || entry === void 0 ? void 0 : entry.context) === JSON.stringify(context);
  var attachmentGalleryFilter = function(snapshot) {
    const filter = new Filter(snapshot);
    filter.perform();
    return filter.getSnapshot();
  };
  var BLOCK_ATTRIBUTE_NAME = "attachmentGallery";
  var TEXT_ATTRIBUTE_NAME = "presentation";
  var TEXT_ATTRIBUTE_VALUE = "gallery";
  var Filter = class {
    constructor(snapshot) {
      this.document = snapshot.document;
      this.selectedRange = snapshot.selectedRange;
    }
    perform() {
      this.removeBlockAttribute();
      return this.applyBlockAttribute();
    }
    getSnapshot() {
      return {
        document: this.document,
        selectedRange: this.selectedRange
      };
    }
    removeBlockAttribute() {
      return this.findRangesOfBlocks().map((range) => this.document = this.document.removeAttributeAtRange(BLOCK_ATTRIBUTE_NAME, range));
    }
    applyBlockAttribute() {
      let offset2 = 0;
      this.findRangesOfPieces().forEach((range) => {
        if (range[1] - range[0] > 1) {
          range[0] += offset2;
          range[1] += offset2;
          if (this.document.getCharacterAtPosition(range[1]) !== "\n") {
            this.document = this.document.insertBlockBreakAtRange(range[1]);
            if (range[1] < this.selectedRange[1]) {
              this.moveSelectedRangeForward();
            }
            range[1]++;
            offset2++;
          }
          if (range[0] !== 0) {
            if (this.document.getCharacterAtPosition(range[0] - 1) !== "\n") {
              this.document = this.document.insertBlockBreakAtRange(range[0]);
              if (range[0] < this.selectedRange[0]) {
                this.moveSelectedRangeForward();
              }
              range[0]++;
              offset2++;
            }
          }
          this.document = this.document.applyBlockAttributeAtRange(BLOCK_ATTRIBUTE_NAME, true, range);
        }
      });
    }
    findRangesOfBlocks() {
      return this.document.findRangesForBlockAttribute(BLOCK_ATTRIBUTE_NAME);
    }
    findRangesOfPieces() {
      return this.document.findRangesForTextAttribute(TEXT_ATTRIBUTE_NAME, {
        withValue: TEXT_ATTRIBUTE_VALUE
      });
    }
    moveSelectedRangeForward() {
      this.selectedRange[0] += 1;
      this.selectedRange[1] += 1;
    }
  };
  var DEFAULT_FILTERS = [attachmentGalleryFilter];
  var Editor = class {
    constructor(composition, selectionManager, element) {
      this.insertFiles = this.insertFiles.bind(this);
      this.composition = composition;
      this.selectionManager = selectionManager;
      this.element = element;
      this.undoManager = new UndoManager(this.composition);
      this.filters = DEFAULT_FILTERS.slice(0);
    }
    loadDocument(document2) {
      return this.loadSnapshot({
        document: document2,
        selectedRange: [0, 0]
      });
    }
    loadHTML() {
      let html2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      const document2 = HTMLParser.parse(html2, {
        referenceElement: this.element
      }).getDocument();
      return this.loadDocument(document2);
    }
    loadJSON(_ref) {
      let {
        document: document2,
        selectedRange
      } = _ref;
      document2 = Document.fromJSON(document2);
      return this.loadSnapshot({
        document: document2,
        selectedRange
      });
    }
    loadSnapshot(snapshot) {
      this.undoManager = new UndoManager(this.composition);
      return this.composition.loadSnapshot(snapshot);
    }
    getDocument() {
      return this.composition.document;
    }
    getSelectedDocument() {
      return this.composition.getSelectedDocument();
    }
    getSnapshot() {
      return this.composition.getSnapshot();
    }
    toJSON() {
      return this.getSnapshot();
    }
    deleteInDirection(direction) {
      return this.composition.deleteInDirection(direction);
    }
    insertAttachment(attachment) {
      return this.composition.insertAttachment(attachment);
    }
    insertAttachments(attachments2) {
      return this.composition.insertAttachments(attachments2);
    }
    insertDocument(document2) {
      return this.composition.insertDocument(document2);
    }
    insertFile(file) {
      return this.composition.insertFile(file);
    }
    insertFiles(files) {
      return this.composition.insertFiles(files);
    }
    insertHTML(html2) {
      return this.composition.insertHTML(html2);
    }
    insertString(string) {
      return this.composition.insertString(string);
    }
    insertText(text) {
      return this.composition.insertText(text);
    }
    insertLineBreak() {
      return this.composition.insertLineBreak();
    }
    getSelectedRange() {
      return this.composition.getSelectedRange();
    }
    getPosition() {
      return this.composition.getPosition();
    }
    getClientRectAtPosition(position) {
      const locationRange = this.getDocument().locationRangeFromRange([position, position + 1]);
      return this.selectionManager.getClientRectAtLocationRange(locationRange);
    }
    expandSelectionInDirection(direction) {
      return this.composition.expandSelectionInDirection(direction);
    }
    moveCursorInDirection(direction) {
      return this.composition.moveCursorInDirection(direction);
    }
    setSelectedRange(selectedRange) {
      return this.composition.setSelectedRange(selectedRange);
    }
    activateAttribute(name) {
      let value = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
      return this.composition.setCurrentAttribute(name, value);
    }
    attributeIsActive(name) {
      return this.composition.hasCurrentAttribute(name);
    }
    canActivateAttribute(name) {
      return this.composition.canSetCurrentAttribute(name);
    }
    deactivateAttribute(name) {
      return this.composition.removeCurrentAttribute(name);
    }
    canDecreaseNestingLevel() {
      return this.composition.canDecreaseNestingLevel();
    }
    canIncreaseNestingLevel() {
      return this.composition.canIncreaseNestingLevel();
    }
    decreaseNestingLevel() {
      if (this.canDecreaseNestingLevel()) {
        return this.composition.decreaseNestingLevel();
      }
    }
    increaseNestingLevel() {
      if (this.canIncreaseNestingLevel()) {
        return this.composition.increaseNestingLevel();
      }
    }
    canRedo() {
      return this.undoManager.canRedo();
    }
    canUndo() {
      return this.undoManager.canUndo();
    }
    recordUndoEntry(description) {
      let {
        context,
        consolidatable
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      return this.undoManager.recordUndoEntry(description, {
        context,
        consolidatable
      });
    }
    redo() {
      if (this.canRedo()) {
        return this.undoManager.redo();
      }
    }
    undo() {
      if (this.canUndo()) {
        return this.undoManager.undo();
      }
    }
  };
  var LocationMapper = class {
    constructor(element) {
      this.element = element;
    }
    findLocationFromContainerAndOffset(container, offset2) {
      let {
        strict
      } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
        strict: true
      };
      let childIndex = 0;
      let foundBlock = false;
      const location2 = {
        index: 0,
        offset: 0
      };
      const attachmentElement = this.findAttachmentElementParentForNode(container);
      if (attachmentElement) {
        container = attachmentElement.parentNode;
        offset2 = findChildIndexOfNode(attachmentElement);
      }
      const walker = walkTree(this.element, {
        usingFilter: rejectAttachmentContents
      });
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === container && nodeIsTextNode(container)) {
          if (!nodeIsCursorTarget(node)) {
            location2.offset += offset2;
          }
          break;
        } else {
          if (node.parentNode === container) {
            if (childIndex++ === offset2) {
              break;
            }
          } else if (!elementContainsNode(container, node)) {
            if (childIndex > 0) {
              break;
            }
          }
          if (nodeIsBlockStart(node, {
            strict
          })) {
            if (foundBlock) {
              location2.index++;
            }
            location2.offset = 0;
            foundBlock = true;
          } else {
            location2.offset += nodeLength(node);
          }
        }
      }
      return location2;
    }
    findContainerAndOffsetFromLocation(location2) {
      let container, offset2;
      if (location2.index === 0 && location2.offset === 0) {
        container = this.element;
        offset2 = 0;
        while (container.firstChild) {
          container = container.firstChild;
          if (nodeIsBlockContainer(container)) {
            offset2 = 1;
            break;
          }
        }
        return [container, offset2];
      }
      let [node, nodeOffset] = this.findNodeAndOffsetFromLocation(location2);
      if (!node)
        return;
      if (nodeIsTextNode(node)) {
        if (nodeLength(node) === 0) {
          container = node.parentNode.parentNode;
          offset2 = findChildIndexOfNode(node.parentNode);
          if (nodeIsCursorTarget(node, {
            name: "right"
          })) {
            offset2++;
          }
        } else {
          container = node;
          offset2 = location2.offset - nodeOffset;
        }
      } else {
        container = node.parentNode;
        if (!nodeIsBlockStart(node.previousSibling)) {
          if (!nodeIsBlockContainer(container)) {
            while (node === container.lastChild) {
              node = container;
              container = container.parentNode;
              if (nodeIsBlockContainer(container)) {
                break;
              }
            }
          }
        }
        offset2 = findChildIndexOfNode(node);
        if (location2.offset !== 0) {
          offset2++;
        }
      }
      return [container, offset2];
    }
    findNodeAndOffsetFromLocation(location2) {
      let node, nodeOffset;
      let offset2 = 0;
      for (const currentNode of this.getSignificantNodesForIndex(location2.index)) {
        const length = nodeLength(currentNode);
        if (location2.offset <= offset2 + length) {
          if (nodeIsTextNode(currentNode)) {
            node = currentNode;
            nodeOffset = offset2;
            if (location2.offset === nodeOffset && nodeIsCursorTarget(node)) {
              break;
            }
          } else if (!node) {
            node = currentNode;
            nodeOffset = offset2;
          }
        }
        offset2 += length;
        if (offset2 > location2.offset) {
          break;
        }
      }
      return [node, nodeOffset];
    }
    findAttachmentElementParentForNode(node) {
      while (node && node !== this.element) {
        if (nodeIsAttachmentElement(node)) {
          return node;
        }
        node = node.parentNode;
      }
    }
    getSignificantNodesForIndex(index) {
      const nodes = [];
      const walker = walkTree(this.element, {
        usingFilter: acceptSignificantNodes
      });
      let recordingNodes = false;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (nodeIsBlockStartComment(node)) {
          var blockIndex;
          if (blockIndex != null) {
            blockIndex++;
          } else {
            blockIndex = 0;
          }
          if (blockIndex === index) {
            recordingNodes = true;
          } else if (recordingNodes) {
            break;
          }
        } else if (recordingNodes) {
          nodes.push(node);
        }
      }
      return nodes;
    }
  };
  var nodeLength = function(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (nodeIsCursorTarget(node)) {
        return 0;
      } else {
        const string = node.textContent;
        return string.length;
      }
    } else if (tagName(node) === "br" || nodeIsAttachmentElement(node)) {
      return 1;
    } else {
      return 0;
    }
  };
  var acceptSignificantNodes = function(node) {
    if (rejectEmptyTextNodes(node) === NodeFilter.FILTER_ACCEPT) {
      return rejectAttachmentContents(node);
    } else {
      return NodeFilter.FILTER_REJECT;
    }
  };
  var rejectEmptyTextNodes = function(node) {
    if (nodeIsEmptyTextNode(node)) {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var rejectAttachmentContents = function(node) {
    if (nodeIsAttachmentElement(node.parentNode)) {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var PointMapper = class {
    createDOMRangeFromPoint(_ref) {
      let {
        x,
        y
      } = _ref;
      let domRange;
      if (document.caretPositionFromPoint) {
        const {
          offsetNode,
          offset: offset2
        } = document.caretPositionFromPoint(x, y);
        domRange = document.createRange();
        domRange.setStart(offsetNode, offset2);
        return domRange;
      } else if (document.caretRangeFromPoint) {
        return document.caretRangeFromPoint(x, y);
      } else if (document.body.createTextRange) {
        const originalDOMRange = getDOMRange();
        try {
          const textRange = document.body.createTextRange();
          textRange.moveToPoint(x, y);
          textRange.select();
        } catch (error2) {
        }
        domRange = getDOMRange();
        setDOMRange(originalDOMRange);
        return domRange;
      }
    }
    getClientRectsForDOMRange(domRange) {
      const array = Array.from(domRange.getClientRects());
      const start3 = array[0];
      const end2 = array[array.length - 1];
      return [start3, end2];
    }
  };
  var SelectionManager = class extends BasicObject {
    constructor(element) {
      super(...arguments);
      this.didMouseDown = this.didMouseDown.bind(this);
      this.selectionDidChange = this.selectionDidChange.bind(this);
      this.element = element;
      this.locationMapper = new LocationMapper(this.element);
      this.pointMapper = new PointMapper();
      this.lockCount = 0;
      handleEvent("mousedown", {
        onElement: this.element,
        withCallback: this.didMouseDown
      });
    }
    getLocationRange() {
      let options2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (options2.strict === false) {
        return this.createLocationRangeFromDOMRange(getDOMRange());
      } else if (options2.ignoreLock) {
        return this.currentLocationRange;
      } else if (this.lockedLocationRange) {
        return this.lockedLocationRange;
      } else {
        return this.currentLocationRange;
      }
    }
    setLocationRange(locationRange) {
      if (this.lockedLocationRange)
        return;
      locationRange = normalizeRange(locationRange);
      const domRange = this.createDOMRangeFromLocationRange(locationRange);
      if (domRange) {
        setDOMRange(domRange);
        this.updateCurrentLocationRange(locationRange);
      }
    }
    setLocationRangeFromPointRange(pointRange) {
      pointRange = normalizeRange(pointRange);
      const startLocation = this.getLocationAtPoint(pointRange[0]);
      const endLocation = this.getLocationAtPoint(pointRange[1]);
      this.setLocationRange([startLocation, endLocation]);
    }
    getClientRectAtLocationRange(locationRange) {
      const domRange = this.createDOMRangeFromLocationRange(locationRange);
      if (domRange) {
        return this.getClientRectsForDOMRange(domRange)[1];
      }
    }
    locationIsCursorTarget(location2) {
      const node = Array.from(this.findNodeAndOffsetFromLocation(location2))[0];
      return nodeIsCursorTarget(node);
    }
    lock() {
      if (this.lockCount++ === 0) {
        this.updateCurrentLocationRange();
        this.lockedLocationRange = this.getLocationRange();
      }
    }
    unlock() {
      if (--this.lockCount === 0) {
        const {
          lockedLocationRange
        } = this;
        this.lockedLocationRange = null;
        if (lockedLocationRange != null) {
          return this.setLocationRange(lockedLocationRange);
        }
      }
    }
    clearSelection() {
      var _getDOMSelection;
      return (_getDOMSelection = getDOMSelection()) === null || _getDOMSelection === void 0 ? void 0 : _getDOMSelection.removeAllRanges();
    }
    selectionIsCollapsed() {
      var _getDOMRange;
      return ((_getDOMRange = getDOMRange()) === null || _getDOMRange === void 0 ? void 0 : _getDOMRange.collapsed) === true;
    }
    selectionIsExpanded() {
      return !this.selectionIsCollapsed();
    }
    createLocationRangeFromDOMRange(domRange, options2) {
      if (domRange == null || !this.domRangeWithinElement(domRange))
        return;
      const start3 = this.findLocationFromContainerAndOffset(domRange.startContainer, domRange.startOffset, options2);
      if (!start3)
        return;
      const end2 = domRange.collapsed ? void 0 : this.findLocationFromContainerAndOffset(domRange.endContainer, domRange.endOffset, options2);
      return normalizeRange([start3, end2]);
    }
    didMouseDown() {
      return this.pauseTemporarily();
    }
    pauseTemporarily() {
      let resumeHandlers;
      this.paused = true;
      const resume = () => {
        this.paused = false;
        clearTimeout(resumeTimeout);
        Array.from(resumeHandlers).forEach((handler) => {
          handler.destroy();
        });
        if (elementContainsNode(document, this.element)) {
          return this.selectionDidChange();
        }
      };
      const resumeTimeout = setTimeout(resume, 200);
      resumeHandlers = ["mousemove", "keydown"].map((eventName) => handleEvent(eventName, {
        onElement: document,
        withCallback: resume
      }));
    }
    selectionDidChange() {
      if (!this.paused && !innerElementIsActive(this.element)) {
        return this.updateCurrentLocationRange();
      }
    }
    updateCurrentLocationRange(locationRange) {
      if (locationRange != null ? locationRange : locationRange = this.createLocationRangeFromDOMRange(getDOMRange())) {
        if (!rangesAreEqual(locationRange, this.currentLocationRange)) {
          var _this$delegate, _this$delegate$locati;
          this.currentLocationRange = locationRange;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$locati = _this$delegate.locationRangeDidChange) === null || _this$delegate$locati === void 0 ? void 0 : _this$delegate$locati.call(_this$delegate, this.currentLocationRange.slice(0));
        }
      }
    }
    createDOMRangeFromLocationRange(locationRange) {
      const rangeStart = this.findContainerAndOffsetFromLocation(locationRange[0]);
      const rangeEnd = rangeIsCollapsed(locationRange) ? rangeStart : this.findContainerAndOffsetFromLocation(locationRange[1]) || rangeStart;
      if (rangeStart != null && rangeEnd != null) {
        const domRange = document.createRange();
        domRange.setStart(...Array.from(rangeStart || []));
        domRange.setEnd(...Array.from(rangeEnd || []));
        return domRange;
      }
    }
    getLocationAtPoint(point) {
      const domRange = this.createDOMRangeFromPoint(point);
      if (domRange) {
        var _this$createLocationR;
        return (_this$createLocationR = this.createLocationRangeFromDOMRange(domRange)) === null || _this$createLocationR === void 0 ? void 0 : _this$createLocationR[0];
      }
    }
    domRangeWithinElement(domRange) {
      if (domRange.collapsed) {
        return elementContainsNode(this.element, domRange.startContainer);
      } else {
        return elementContainsNode(this.element, domRange.startContainer) && elementContainsNode(this.element, domRange.endContainer);
      }
    }
  };
  SelectionManager.proxyMethod("locationMapper.findLocationFromContainerAndOffset");
  SelectionManager.proxyMethod("locationMapper.findContainerAndOffsetFromLocation");
  SelectionManager.proxyMethod("locationMapper.findNodeAndOffsetFromLocation");
  SelectionManager.proxyMethod("pointMapper.createDOMRangeFromPoint");
  SelectionManager.proxyMethod("pointMapper.getClientRectsForDOMRange");
  var models = {
    Attachment,
    AttachmentManager,
    AttachmentPiece,
    Block,
    Composition,
    Cocument: Document,
    Editor,
    HTMLParser,
    HTMLSanitizer,
    LineBreakInsertion,
    LocationMapper,
    ManagedAttachment,
    Piece,
    PointMapper,
    SelectionManager,
    SplittableList,
    StringPiece,
    Text,
    UndoManager
  };
  var Trix = {
    VERSION: version,
    config
  };
  Object.assign(Trix, models);
  window.Trix = Trix;
  var ObjectGroup = class {
    static groupObjects() {
      let ungroupedObjects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      let {
        depth,
        asTree
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let group;
      if (asTree) {
        if (depth == null) {
          depth = 0;
        }
      }
      const objects = [];
      Array.from(ungroupedObjects).forEach((object2) => {
        var _object$canBeGrouped2;
        if (group) {
          var _object$canBeGrouped, _group$canBeGroupedWi, _group;
          if ((_object$canBeGrouped = object2.canBeGrouped) !== null && _object$canBeGrouped !== void 0 && _object$canBeGrouped.call(object2, depth) && (_group$canBeGroupedWi = (_group = group[group.length - 1]).canBeGroupedWith) !== null && _group$canBeGroupedWi !== void 0 && _group$canBeGroupedWi.call(_group, object2, depth)) {
            group.push(object2);
            return;
          } else {
            objects.push(new this(group, {
              depth,
              asTree
            }));
            group = null;
          }
        }
        if ((_object$canBeGrouped2 = object2.canBeGrouped) !== null && _object$canBeGrouped2 !== void 0 && _object$canBeGrouped2.call(object2, depth)) {
          group = [object2];
        } else {
          objects.push(object2);
        }
      });
      if (group) {
        objects.push(new this(group, {
          depth,
          asTree
        }));
      }
      return objects;
    }
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      let {
        depth,
        asTree
      } = arguments.length > 1 ? arguments[1] : void 0;
      this.objects = objects;
      if (asTree) {
        this.depth = depth;
        this.objects = this.constructor.groupObjects(this.objects, {
          asTree,
          depth: this.depth + 1
        });
      }
    }
    getObjects() {
      return this.objects;
    }
    getDepth() {
      return this.depth;
    }
    getCacheKey() {
      const keys = ["objectGroup"];
      Array.from(this.getObjects()).forEach((object2) => {
        keys.push(object2.getCacheKey());
      });
      return keys.join("/");
    }
  };
  var ElementStore = class {
    constructor(elements) {
      this.reset(elements);
    }
    add(element) {
      const key = getKey(element);
      this.elements[key] = element;
    }
    remove(element) {
      const key = getKey(element);
      const value = this.elements[key];
      if (value) {
        delete this.elements[key];
        return value;
      }
    }
    reset() {
      let elements = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      this.elements = {};
      Array.from(elements).forEach((element) => {
        this.add(element);
      });
      return elements;
    }
  };
  var getKey = (element) => element.dataset.trixStoreKey;
  var ObjectView = class extends BasicObject {
    constructor(object2) {
      let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.object = object2;
      this.options = options2;
      this.childViews = [];
      this.rootView = this;
    }
    getNodes() {
      if (!this.nodes) {
        this.nodes = this.createNodes();
      }
      return this.nodes.map((node) => node.cloneNode(true));
    }
    invalidate() {
      var _this$parentView;
      this.nodes = null;
      this.childViews = [];
      return (_this$parentView = this.parentView) === null || _this$parentView === void 0 ? void 0 : _this$parentView.invalidate();
    }
    invalidateViewForObject(object2) {
      var _this$findViewForObje;
      return (_this$findViewForObje = this.findViewForObject(object2)) === null || _this$findViewForObje === void 0 ? void 0 : _this$findViewForObje.invalidate();
    }
    findOrCreateCachedChildView(viewClass, object2, options2) {
      let view = this.getCachedViewForObject(object2);
      if (view) {
        this.recordChildView(view);
      } else {
        view = this.createChildView(...arguments);
        this.cacheViewForObject(view, object2);
      }
      return view;
    }
    createChildView(viewClass, object2) {
      let options2 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      if (object2 instanceof ObjectGroup) {
        options2.viewClass = viewClass;
        viewClass = ObjectGroupView;
      }
      const view = new viewClass(object2, options2);
      return this.recordChildView(view);
    }
    recordChildView(view) {
      view.parentView = this;
      view.rootView = this.rootView;
      this.childViews.push(view);
      return view;
    }
    getAllChildViews() {
      let views = [];
      this.childViews.forEach((childView) => {
        views.push(childView);
        views = views.concat(childView.getAllChildViews());
      });
      return views;
    }
    findElement() {
      return this.findElementForObject(this.object);
    }
    findElementForObject(object2) {
      const id2 = object2 === null || object2 === void 0 ? void 0 : object2.id;
      if (id2) {
        return this.rootView.element.querySelector("[data-trix-id='".concat(id2, "']"));
      }
    }
    findViewForObject(object2) {
      for (const view of this.getAllChildViews()) {
        if (view.object === object2) {
          return view;
        }
      }
    }
    getViewCache() {
      if (this.rootView === this) {
        if (this.isViewCachingEnabled()) {
          if (!this.viewCache) {
            this.viewCache = {};
          }
          return this.viewCache;
        }
      } else {
        return this.rootView.getViewCache();
      }
    }
    isViewCachingEnabled() {
      return this.shouldCacheViews !== false;
    }
    enableViewCaching() {
      this.shouldCacheViews = true;
    }
    disableViewCaching() {
      this.shouldCacheViews = false;
    }
    getCachedViewForObject(object2) {
      var _this$getViewCache;
      return (_this$getViewCache = this.getViewCache()) === null || _this$getViewCache === void 0 ? void 0 : _this$getViewCache[object2.getCacheKey()];
    }
    cacheViewForObject(view, object2) {
      const cache2 = this.getViewCache();
      if (cache2) {
        cache2[object2.getCacheKey()] = view;
      }
    }
    garbageCollectCachedViews() {
      const cache2 = this.getViewCache();
      if (cache2) {
        const views = this.getAllChildViews().concat(this);
        const objectKeys = views.map((view) => view.object.getCacheKey());
        for (const key in cache2) {
          if (!objectKeys.includes(key)) {
            delete cache2[key];
          }
        }
      }
    }
  };
  var ObjectGroupView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.objectGroup = this.object;
      this.viewClass = this.options.viewClass;
      delete this.options.viewClass;
    }
    getChildViews() {
      if (!this.childViews.length) {
        Array.from(this.objectGroup.getObjects()).forEach((object2) => {
          this.findOrCreateCachedChildView(this.viewClass, object2, this.options);
        });
      }
      return this.childViews;
    }
    createNodes() {
      const element = this.createContainerElement();
      this.getChildViews().forEach((view) => {
        Array.from(view.getNodes()).forEach((node) => {
          element.appendChild(node);
        });
      });
      return [element];
    }
    createContainerElement() {
      let depth = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.objectGroup.getDepth();
      return this.getChildViews()[0].createContainerElement(depth);
    }
  };
  var {
    css: css$2
  } = config;
  var AttachmentView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.attachment = this.object;
      this.attachment.uploadProgressDelegate = this;
      this.attachmentPiece = this.options.piece;
    }
    createContentNodes() {
      return [];
    }
    createNodes() {
      let innerElement;
      const figure = innerElement = makeElement({
        tagName: "figure",
        className: this.getClassName(),
        data: this.getData(),
        editable: false
      });
      const href = this.getHref();
      if (href) {
        innerElement = makeElement({
          tagName: "a",
          editable: false,
          attributes: {
            href,
            tabindex: -1
          }
        });
        figure.appendChild(innerElement);
      }
      if (this.attachment.hasContent()) {
        innerElement.innerHTML = this.attachment.getContent();
      } else {
        this.createContentNodes().forEach((node) => {
          innerElement.appendChild(node);
        });
      }
      innerElement.appendChild(this.createCaptionElement());
      if (this.attachment.isPending()) {
        this.progressElement = makeElement({
          tagName: "progress",
          attributes: {
            class: css$2.attachmentProgress,
            value: this.attachment.getUploadProgress(),
            max: 100
          },
          data: {
            trixMutable: true,
            trixStoreKey: ["progressElement", this.attachment.id].join("/")
          }
        });
        figure.appendChild(this.progressElement);
      }
      return [createCursorTarget("left"), figure, createCursorTarget("right")];
    }
    createCaptionElement() {
      const figcaption = makeElement({
        tagName: "figcaption",
        className: css$2.attachmentCaption
      });
      const caption = this.attachmentPiece.getCaption();
      if (caption) {
        figcaption.classList.add("".concat(css$2.attachmentCaption, "--edited"));
        figcaption.textContent = caption;
      } else {
        let name, size;
        const captionConfig = this.getCaptionConfig();
        if (captionConfig.name) {
          name = this.attachment.getFilename();
        }
        if (captionConfig.size) {
          size = this.attachment.getFormattedFilesize();
        }
        if (name) {
          const nameElement = makeElement({
            tagName: "span",
            className: css$2.attachmentName,
            textContent: name
          });
          figcaption.appendChild(nameElement);
        }
        if (size) {
          if (name) {
            figcaption.appendChild(document.createTextNode(" "));
          }
          const sizeElement = makeElement({
            tagName: "span",
            className: css$2.attachmentSize,
            textContent: size
          });
          figcaption.appendChild(sizeElement);
        }
      }
      return figcaption;
    }
    getClassName() {
      const names = [css$2.attachment, "".concat(css$2.attachment, "--").concat(this.attachment.getType())];
      const extension = this.attachment.getExtension();
      if (extension) {
        names.push("".concat(css$2.attachment, "--").concat(extension));
      }
      return names.join(" ");
    }
    getData() {
      const data = {
        trixAttachment: JSON.stringify(this.attachment),
        trixContentType: this.attachment.getContentType(),
        trixId: this.attachment.id
      };
      const {
        attributes: attributes2
      } = this.attachmentPiece;
      if (!attributes2.isEmpty()) {
        data.trixAttributes = JSON.stringify(attributes2);
      }
      if (this.attachment.isPending()) {
        data.trixSerialize = false;
      }
      return data;
    }
    getHref() {
      if (!htmlContainsTagName(this.attachment.getContent(), "a")) {
        return this.attachment.getHref();
      }
    }
    getCaptionConfig() {
      var _config$attachments$t;
      const type = this.attachment.getType();
      const captionConfig = copyObject((_config$attachments$t = config.attachments[type]) === null || _config$attachments$t === void 0 ? void 0 : _config$attachments$t.caption);
      if (type === "file") {
        captionConfig.name = true;
      }
      return captionConfig;
    }
    findProgressElement() {
      var _this$findElement;
      return (_this$findElement = this.findElement()) === null || _this$findElement === void 0 ? void 0 : _this$findElement.querySelector("progress");
    }
    attachmentDidChangeUploadProgress() {
      const value = this.attachment.getUploadProgress();
      const progressElement = this.findProgressElement();
      if (progressElement) {
        progressElement.value = value;
      }
    }
  };
  var createCursorTarget = (name) => makeElement({
    tagName: "span",
    textContent: ZERO_WIDTH_SPACE,
    data: {
      trixCursorTarget: name,
      trixSerialize: false
    }
  });
  var htmlContainsTagName = function(html2, tagName2) {
    const div = makeElement("div");
    div.innerHTML = html2 || "";
    return div.querySelector(tagName2);
  };
  var PreviewableAttachmentView = class extends AttachmentView {
    constructor() {
      super(...arguments);
      this.attachment.previewDelegate = this;
    }
    createContentNodes() {
      this.image = makeElement({
        tagName: "img",
        attributes: {
          src: ""
        },
        data: {
          trixMutable: true
        }
      });
      this.refresh(this.image);
      return [this.image];
    }
    createCaptionElement() {
      const figcaption = super.createCaptionElement(...arguments);
      if (!figcaption.textContent) {
        figcaption.setAttribute("data-trix-placeholder", config.lang.captionPlaceholder);
      }
      return figcaption;
    }
    refresh(image) {
      if (!image) {
        var _this$findElement;
        image = (_this$findElement = this.findElement()) === null || _this$findElement === void 0 ? void 0 : _this$findElement.querySelector("img");
      }
      if (image) {
        return this.updateAttributesForImage(image);
      }
    }
    updateAttributesForImage(image) {
      const url = this.attachment.getURL();
      const previewURL = this.attachment.getPreviewURL();
      image.src = previewURL || url;
      if (previewURL === url) {
        image.removeAttribute("data-trix-serialized-attributes");
      } else {
        const serializedAttributes = JSON.stringify({
          src: url
        });
        image.setAttribute("data-trix-serialized-attributes", serializedAttributes);
      }
      const width = this.attachment.getWidth();
      const height = this.attachment.getHeight();
      if (width != null) {
        image.width = width;
      }
      if (height != null) {
        image.height = height;
      }
      const storeKey = ["imageElement", this.attachment.id, image.src, image.width, image.height].join("/");
      image.dataset.trixStoreKey = storeKey;
    }
    attachmentDidChangeAttributes() {
      this.refresh(this.image);
      return this.refresh();
    }
  };
  var PieceView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.piece = this.object;
      this.attributes = this.piece.getAttributes();
      this.textConfig = this.options.textConfig;
      this.context = this.options.context;
      if (this.piece.attachment) {
        this.attachment = this.piece.attachment;
      } else {
        this.string = this.piece.toString();
      }
    }
    createNodes() {
      let nodes = this.attachment ? this.createAttachmentNodes() : this.createStringNodes();
      const element = this.createElement();
      if (element) {
        const innerElement = findInnerElement(element);
        Array.from(nodes).forEach((node) => {
          innerElement.appendChild(node);
        });
        nodes = [element];
      }
      return nodes;
    }
    createAttachmentNodes() {
      const constructor = this.attachment.isPreviewable() ? PreviewableAttachmentView : AttachmentView;
      const view = this.createChildView(constructor, this.piece.attachment, {
        piece: this.piece
      });
      return view.getNodes();
    }
    createStringNodes() {
      var _this$textConfig;
      if ((_this$textConfig = this.textConfig) !== null && _this$textConfig !== void 0 && _this$textConfig.plaintext) {
        return [document.createTextNode(this.string)];
      } else {
        const nodes = [];
        const iterable = this.string.split("\n");
        for (let index = 0; index < iterable.length; index++) {
          const substring = iterable[index];
          if (index > 0) {
            const element = makeElement("br");
            nodes.push(element);
          }
          if (substring.length) {
            const node = document.createTextNode(this.preserveSpaces(substring));
            nodes.push(node);
          }
        }
        return nodes;
      }
    }
    createElement() {
      let element, key, value;
      const styles = {};
      for (key in this.attributes) {
        value = this.attributes[key];
        const config2 = getTextConfig(key);
        if (config2) {
          if (config2.tagName) {
            var innerElement;
            const pendingElement = makeElement(config2.tagName);
            if (innerElement) {
              innerElement.appendChild(pendingElement);
              innerElement = pendingElement;
            } else {
              element = innerElement = pendingElement;
            }
          }
          if (config2.styleProperty) {
            styles[config2.styleProperty] = value;
          }
          if (config2.style) {
            for (key in config2.style) {
              value = config2.style[key];
              styles[key] = value;
            }
          }
        }
      }
      if (Object.keys(styles).length) {
        if (!element) {
          element = makeElement("span");
        }
        for (key in styles) {
          value = styles[key];
          element.style[key] = value;
        }
      }
      return element;
    }
    createContainerElement() {
      for (const key in this.attributes) {
        const value = this.attributes[key];
        const config2 = getTextConfig(key);
        if (config2) {
          if (config2.groupTagName) {
            const attributes2 = {};
            attributes2[key] = value;
            return makeElement(config2.groupTagName, attributes2);
          }
        }
      }
    }
    preserveSpaces(string) {
      if (this.context.isLast) {
        string = string.replace(/\ $/, NON_BREAKING_SPACE);
      }
      string = string.replace(/(\S)\ {3}(\S)/g, "$1 ".concat(NON_BREAKING_SPACE, " $2")).replace(/\ {2}/g, "".concat(NON_BREAKING_SPACE, " ")).replace(/\ {2}/g, " ".concat(NON_BREAKING_SPACE));
      if (this.context.isFirst || this.context.followsWhitespace) {
        string = string.replace(/^\ /, NON_BREAKING_SPACE);
      }
      return string;
    }
  };
  var TextView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.text = this.object;
      this.textConfig = this.options.textConfig;
    }
    createNodes() {
      const nodes = [];
      const pieces = ObjectGroup.groupObjects(this.getPieces());
      const lastIndex = pieces.length - 1;
      for (let index = 0; index < pieces.length; index++) {
        const piece = pieces[index];
        const context = {};
        if (index === 0) {
          context.isFirst = true;
        }
        if (index === lastIndex) {
          context.isLast = true;
        }
        if (endsWithWhitespace(previousPiece)) {
          context.followsWhitespace = true;
        }
        const view = this.findOrCreateCachedChildView(PieceView, piece, {
          textConfig: this.textConfig,
          context
        });
        nodes.push(...Array.from(view.getNodes() || []));
        var previousPiece = piece;
      }
      return nodes;
    }
    getPieces() {
      return Array.from(this.text.getPieces()).filter((piece) => !piece.hasAttribute("blockBreak"));
    }
  };
  var endsWithWhitespace = (piece) => /\s$/.test(piece === null || piece === void 0 ? void 0 : piece.toString());
  var {
    css: css$1
  } = config;
  var BlockView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.block = this.object;
      this.attributes = this.block.getAttributes();
    }
    createNodes() {
      const comment = document.createComment("block");
      const nodes = [comment];
      if (this.block.isEmpty()) {
        nodes.push(makeElement("br"));
      } else {
        var _getBlockConfig;
        const textConfig = (_getBlockConfig = getBlockConfig(this.block.getLastAttribute())) === null || _getBlockConfig === void 0 ? void 0 : _getBlockConfig.text;
        const textView = this.findOrCreateCachedChildView(TextView, this.block.text, {
          textConfig
        });
        nodes.push(...Array.from(textView.getNodes() || []));
        if (this.shouldAddExtraNewlineElement()) {
          nodes.push(makeElement("br"));
        }
      }
      if (this.attributes.length) {
        return nodes;
      } else {
        let attributes2;
        const {
          tagName: tagName2
        } = config.blockAttributes.default;
        if (this.block.isRTL()) {
          attributes2 = {
            dir: "rtl"
          };
        }
        const element = makeElement({
          tagName: tagName2,
          attributes: attributes2
        });
        nodes.forEach((node) => element.appendChild(node));
        return [element];
      }
    }
    createContainerElement(depth) {
      let attributes2, className;
      const attributeName = this.attributes[depth];
      const {
        tagName: tagName2
      } = getBlockConfig(attributeName);
      if (depth === 0 && this.block.isRTL()) {
        attributes2 = {
          dir: "rtl"
        };
      }
      if (attributeName === "attachmentGallery") {
        const size = this.block.getBlockBreakPosition();
        className = "".concat(css$1.attachmentGallery, " ").concat(css$1.attachmentGallery, "--").concat(size);
      }
      return makeElement({
        tagName: tagName2,
        className,
        attributes: attributes2
      });
    }
    shouldAddExtraNewlineElement() {
      return /\n\n$/.test(this.block.toString());
    }
  };
  var DocumentView = class extends ObjectView {
    static render(document2) {
      const element = makeElement("div");
      const view = new this(document2, {
        element
      });
      view.render();
      view.sync();
      return element;
    }
    constructor() {
      super(...arguments);
      this.element = this.options.element;
      this.elementStore = new ElementStore();
      this.setDocument(this.object);
    }
    setDocument(document2) {
      if (!document2.isEqualTo(this.document)) {
        this.document = this.object = document2;
      }
    }
    render() {
      this.childViews = [];
      this.shadowElement = makeElement("div");
      if (!this.document.isEmpty()) {
        const objects = ObjectGroup.groupObjects(this.document.getBlocks(), {
          asTree: true
        });
        Array.from(objects).forEach((object2) => {
          const view = this.findOrCreateCachedChildView(BlockView, object2);
          Array.from(view.getNodes()).map((node) => this.shadowElement.appendChild(node));
        });
      }
    }
    isSynced() {
      return elementsHaveEqualHTML(this.shadowElement, this.element);
    }
    sync() {
      const fragment = this.createDocumentFragmentForSync();
      while (this.element.lastChild) {
        this.element.removeChild(this.element.lastChild);
      }
      this.element.appendChild(fragment);
      return this.didSync();
    }
    didSync() {
      this.elementStore.reset(findStoredElements(this.element));
      return defer(() => this.garbageCollectCachedViews());
    }
    createDocumentFragmentForSync() {
      const fragment = document.createDocumentFragment();
      Array.from(this.shadowElement.childNodes).forEach((node) => {
        fragment.appendChild(node.cloneNode(true));
      });
      Array.from(findStoredElements(fragment)).forEach((element) => {
        const storedElement = this.elementStore.remove(element);
        if (storedElement) {
          element.parentNode.replaceChild(storedElement, element);
        }
      });
      return fragment;
    }
  };
  var findStoredElements = (element) => element.querySelectorAll("[data-trix-store-key]");
  var elementsHaveEqualHTML = (element, otherElement) => ignoreSpaces(element.innerHTML) === ignoreSpaces(otherElement.innerHTML);
  var ignoreSpaces = (html2) => html2.replace(/&nbsp;/g, " ");
  var unserializableElementSelector = "[data-trix-serialize=false]";
  var unserializableAttributeNames = ["contenteditable", "data-trix-id", "data-trix-store-key", "data-trix-mutable", "data-trix-placeholder", "tabindex"];
  var serializedAttributesAttribute = "data-trix-serialized-attributes";
  var serializedAttributesSelector = "[".concat(serializedAttributesAttribute, "]");
  var blockCommentPattern = new RegExp("<!--block-->", "g");
  var serializers = {
    "application/json": function(serializable) {
      let document2;
      if (serializable instanceof Document) {
        document2 = serializable;
      } else if (serializable instanceof HTMLElement) {
        document2 = HTMLParser.parse(serializable.innerHTML).getDocument();
      } else {
        throw new Error("unserializable object");
      }
      return document2.toSerializableDocument().toJSONString();
    },
    "text/html": function(serializable) {
      let element;
      if (serializable instanceof Document) {
        element = DocumentView.render(serializable);
      } else if (serializable instanceof HTMLElement) {
        element = serializable.cloneNode(true);
      } else {
        throw new Error("unserializable object");
      }
      Array.from(element.querySelectorAll(unserializableElementSelector)).forEach((el) => {
        removeNode(el);
      });
      unserializableAttributeNames.forEach((attribute) => {
        Array.from(element.querySelectorAll("[".concat(attribute, "]"))).forEach((el) => {
          el.removeAttribute(attribute);
        });
      });
      Array.from(element.querySelectorAll(serializedAttributesSelector)).forEach((el) => {
        try {
          const attributes2 = JSON.parse(el.getAttribute(serializedAttributesAttribute));
          el.removeAttribute(serializedAttributesAttribute);
          for (const name in attributes2) {
            const value = attributes2[name];
            el.setAttribute(name, value);
          }
        } catch (error2) {
        }
      });
      return element.innerHTML.replace(blockCommentPattern, "");
    }
  };
  var serializeToContentType = function(serializable, contentType) {
    const serializer = serializers[contentType];
    if (serializer) {
      return serializer(serializable);
    } else {
      throw new Error("unknown content type: ".concat(contentType));
    }
  };
  var mutableAttributeName = "data-trix-mutable";
  var mutableSelector = "[".concat(mutableAttributeName, "]");
  var options = {
    attributes: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
    subtree: true
  };
  var MutationObserver2 = class extends BasicObject {
    constructor(element) {
      super(element);
      this.didMutate = this.didMutate.bind(this);
      this.element = element;
      this.observer = new window.MutationObserver(this.didMutate);
      this.start();
    }
    start() {
      this.reset();
      return this.observer.observe(this.element, options);
    }
    stop() {
      return this.observer.disconnect();
    }
    didMutate(mutations) {
      this.mutations.push(...Array.from(this.findSignificantMutations(mutations) || []));
      if (this.mutations.length) {
        var _this$delegate, _this$delegate$elemen;
        (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$elemen = _this$delegate.elementDidMutate) === null || _this$delegate$elemen === void 0 ? void 0 : _this$delegate$elemen.call(_this$delegate, this.getMutationSummary());
        return this.reset();
      }
    }
    reset() {
      this.mutations = [];
    }
    findSignificantMutations(mutations) {
      return mutations.filter((mutation) => {
        return this.mutationIsSignificant(mutation);
      });
    }
    mutationIsSignificant(mutation) {
      if (this.nodeIsMutable(mutation.target)) {
        return false;
      }
      for (const node of Array.from(this.nodesModifiedByMutation(mutation))) {
        if (this.nodeIsSignificant(node))
          return true;
      }
      return false;
    }
    nodeIsSignificant(node) {
      return node !== this.element && !this.nodeIsMutable(node) && !nodeIsEmptyTextNode(node);
    }
    nodeIsMutable(node) {
      return findClosestElementFromNode(node, {
        matchingSelector: mutableSelector
      });
    }
    nodesModifiedByMutation(mutation) {
      const nodes = [];
      switch (mutation.type) {
        case "attributes":
          if (mutation.attributeName !== mutableAttributeName) {
            nodes.push(mutation.target);
          }
          break;
        case "characterData":
          nodes.push(mutation.target.parentNode);
          nodes.push(mutation.target);
          break;
        case "childList":
          nodes.push(...Array.from(mutation.addedNodes || []));
          nodes.push(...Array.from(mutation.removedNodes || []));
          break;
      }
      return nodes;
    }
    getMutationSummary() {
      return this.getTextMutationSummary();
    }
    getTextMutationSummary() {
      const {
        additions,
        deletions
      } = this.getTextChangesFromCharacterData();
      const textChanges = this.getTextChangesFromChildList();
      Array.from(textChanges.additions).forEach((addition) => {
        if (!Array.from(additions).includes(addition)) {
          additions.push(addition);
        }
      });
      deletions.push(...Array.from(textChanges.deletions || []));
      const summary = {};
      const added = additions.join("");
      if (added) {
        summary.textAdded = added;
      }
      const deleted = deletions.join("");
      if (deleted) {
        summary.textDeleted = deleted;
      }
      return summary;
    }
    getMutationsByType(type) {
      return Array.from(this.mutations).filter((mutation) => mutation.type === type);
    }
    getTextChangesFromChildList() {
      let textAdded, textRemoved;
      const addedNodes = [];
      const removedNodes = [];
      Array.from(this.getMutationsByType("childList")).forEach((mutation) => {
        addedNodes.push(...Array.from(mutation.addedNodes || []));
        removedNodes.push(...Array.from(mutation.removedNodes || []));
      });
      const singleBlockCommentRemoved = addedNodes.length === 0 && removedNodes.length === 1 && nodeIsBlockStartComment(removedNodes[0]);
      if (singleBlockCommentRemoved) {
        textAdded = [];
        textRemoved = ["\n"];
      } else {
        textAdded = getTextForNodes(addedNodes);
        textRemoved = getTextForNodes(removedNodes);
      }
      const additions = textAdded.filter((text, index) => text !== textRemoved[index]).map(normalizeSpaces);
      const deletions = textRemoved.filter((text, index) => text !== textAdded[index]).map(normalizeSpaces);
      return {
        additions,
        deletions
      };
    }
    getTextChangesFromCharacterData() {
      let added, removed;
      const characterMutations = this.getMutationsByType("characterData");
      if (characterMutations.length) {
        const startMutation = characterMutations[0], endMutation = characterMutations[characterMutations.length - 1];
        const oldString = normalizeSpaces(startMutation.oldValue);
        const newString = normalizeSpaces(endMutation.target.data);
        const summarized = summarizeStringChange(oldString, newString);
        added = summarized.added;
        removed = summarized.removed;
      }
      return {
        additions: added ? [added] : [],
        deletions: removed ? [removed] : []
      };
    }
  };
  var getTextForNodes = function() {
    let nodes = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const text = [];
    for (const node of Array.from(nodes)) {
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          text.push(node.data);
          break;
        case Node.ELEMENT_NODE:
          if (tagName(node) === "br") {
            text.push("\n");
          } else {
            text.push(...Array.from(getTextForNodes(node.childNodes) || []));
          }
          break;
      }
    }
    return text;
  };
  var Controller2 = class extends BasicObject {
  };
  var FileVerificationOperation = class extends Operation {
    constructor(file) {
      super(...arguments);
      this.file = file;
    }
    perform(callback) {
      const reader = new FileReader();
      reader.onerror = () => callback(false);
      reader.onload = () => {
        reader.onerror = null;
        try {
          reader.abort();
        } catch (error2) {
        }
        return callback(true, this.file);
      };
      return reader.readAsArrayBuffer(this.file);
    }
  };
  var InputController = class extends BasicObject {
    constructor(element) {
      super(...arguments);
      this.element = element;
      this.mutationObserver = new MutationObserver2(this.element);
      this.mutationObserver.delegate = this;
      for (const eventName in this.constructor.events) {
        handleEvent(eventName, {
          onElement: this.element,
          withCallback: this.handlerFor(eventName)
        });
      }
    }
    elementDidMutate(mutationSummary) {
    }
    editorWillSyncDocumentView() {
      return this.mutationObserver.stop();
    }
    editorDidSyncDocumentView() {
      return this.mutationObserver.start();
    }
    requestRender() {
      var _this$delegate, _this$delegate$inputC;
      return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidRequestRender) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
    }
    requestReparse() {
      var _this$delegate2, _this$delegate2$input;
      (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$input = _this$delegate2.inputControllerDidRequestReparse) === null || _this$delegate2$input === void 0 ? void 0 : _this$delegate2$input.call(_this$delegate2);
      return this.requestRender();
    }
    attachFiles(files) {
      const operations = Array.from(files).map((file) => new FileVerificationOperation(file));
      return Promise.all(operations).then((files2) => {
        this.handleInput(function() {
          var _this$delegate3, _this$responder;
          (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.inputControllerWillAttachFiles();
          (_this$responder = this.responder) === null || _this$responder === void 0 ? void 0 : _this$responder.insertFiles(files2);
          return this.requestRender();
        });
      });
    }
    handlerFor(eventName) {
      return (event) => {
        if (!event.defaultPrevented) {
          this.handleInput(() => {
            if (!innerElementIsActive(this.element)) {
              this.eventName = eventName;
              this.constructor.events[eventName].call(this, event);
            }
          });
        }
      };
    }
    handleInput(callback) {
      try {
        var _this$delegate4;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillHandleInput();
        callback.call(this);
      } finally {
        var _this$delegate5;
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.inputControllerDidHandleInput();
      }
    }
    createLinkHTML(href, text) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = text ? text : href;
      return link.outerHTML;
    }
  };
  _defineProperty(InputController, "events", {});
  var _$codePointAt;
  var _;
  var {
    browser,
    keyNames: keyNames$1
  } = config;
  var pastedFileCount = 0;
  var Level0InputController = class extends InputController {
    constructor() {
      super(...arguments);
      this.resetInputSummary();
    }
    setInputSummary() {
      let summary = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      this.inputSummary.eventName = this.eventName;
      for (const key in summary) {
        const value = summary[key];
        this.inputSummary[key] = value;
      }
      return this.inputSummary;
    }
    resetInputSummary() {
      this.inputSummary = {};
    }
    reset() {
      this.resetInputSummary();
      return selectionChangeObserver.reset();
    }
    elementDidMutate(mutationSummary) {
      if (this.isComposing()) {
        var _this$delegate, _this$delegate$inputC;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidAllowUnhandledInput) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
      } else {
        return this.handleInput(function() {
          if (this.mutationIsSignificant(mutationSummary)) {
            if (this.mutationIsExpected(mutationSummary)) {
              this.requestRender();
            } else {
              this.requestReparse();
            }
          }
          return this.reset();
        });
      }
    }
    mutationIsExpected(_ref) {
      let {
        textAdded,
        textDeleted
      } = _ref;
      if (this.inputSummary.preferDocument) {
        return true;
      }
      const mutationAdditionMatchesSummary = textAdded != null ? textAdded === this.inputSummary.textAdded : !this.inputSummary.textAdded;
      const mutationDeletionMatchesSummary = textDeleted != null ? this.inputSummary.didDelete : !this.inputSummary.didDelete;
      const unexpectedNewlineAddition = ["\n", " \n"].includes(textAdded) && !mutationAdditionMatchesSummary;
      const unexpectedNewlineDeletion = textDeleted === "\n" && !mutationDeletionMatchesSummary;
      const singleUnexpectedNewline = unexpectedNewlineAddition && !unexpectedNewlineDeletion || unexpectedNewlineDeletion && !unexpectedNewlineAddition;
      if (singleUnexpectedNewline) {
        const range = this.getSelectedRange();
        if (range) {
          var _this$responder;
          const offset2 = unexpectedNewlineAddition ? textAdded.replace(/\n$/, "").length || -1 : (textAdded === null || textAdded === void 0 ? void 0 : textAdded.length) || 1;
          if ((_this$responder = this.responder) !== null && _this$responder !== void 0 && _this$responder.positionIsBlockBreak(range[1] + offset2)) {
            return true;
          }
        }
      }
      return mutationAdditionMatchesSummary && mutationDeletionMatchesSummary;
    }
    mutationIsSignificant(mutationSummary) {
      var _this$compositionInpu;
      const textChanged = Object.keys(mutationSummary).length > 0;
      const composedEmptyString = ((_this$compositionInpu = this.compositionInput) === null || _this$compositionInpu === void 0 ? void 0 : _this$compositionInpu.getEndData()) === "";
      return textChanged || !composedEmptyString;
    }
    getCompositionInput() {
      if (this.isComposing()) {
        return this.compositionInput;
      } else {
        this.compositionInput = new CompositionInput(this);
      }
    }
    isComposing() {
      return this.compositionInput && !this.compositionInput.isEnded();
    }
    deleteInDirection(direction, event) {
      var _this$responder2;
      if (((_this$responder2 = this.responder) === null || _this$responder2 === void 0 ? void 0 : _this$responder2.deleteInDirection(direction)) === false) {
        if (event) {
          event.preventDefault();
          return this.requestRender();
        }
      } else {
        return this.setInputSummary({
          didDelete: true
        });
      }
    }
    serializeSelectionToDataTransfer(dataTransfer) {
      var _this$responder3;
      if (!dataTransferIsWritable(dataTransfer))
        return;
      const document2 = (_this$responder3 = this.responder) === null || _this$responder3 === void 0 ? void 0 : _this$responder3.getSelectedDocument().toSerializableDocument();
      dataTransfer.setData("application/x-trix-document", JSON.stringify(document2));
      dataTransfer.setData("text/html", DocumentView.render(document2).innerHTML);
      dataTransfer.setData("text/plain", document2.toString().replace(/\n$/, ""));
      return true;
    }
    canAcceptDataTransfer(dataTransfer) {
      const types = {};
      Array.from((dataTransfer === null || dataTransfer === void 0 ? void 0 : dataTransfer.types) || []).forEach((type) => {
        types[type] = true;
      });
      return types.Files || types["application/x-trix-document"] || types["text/html"] || types["text/plain"];
    }
    getPastedHTMLUsingHiddenElement(callback) {
      const selectedRange = this.getSelectedRange();
      const style = {
        position: "absolute",
        left: "".concat(window.pageXOffset, "px"),
        top: "".concat(window.pageYOffset, "px"),
        opacity: 0
      };
      const element = makeElement({
        style,
        tagName: "div",
        editable: true
      });
      document.body.appendChild(element);
      element.focus();
      return requestAnimationFrame(() => {
        const html2 = element.innerHTML;
        removeNode(element);
        this.setSelectedRange(selectedRange);
        return callback(html2);
      });
    }
  };
  _defineProperty(Level0InputController, "events", {
    keydown(event) {
      if (!this.isComposing()) {
        this.resetInputSummary();
      }
      this.inputSummary.didInput = true;
      const keyName = keyNames$1[event.keyCode];
      if (keyName) {
        var _context2;
        let context = this.keys;
        ["ctrl", "alt", "shift", "meta"].forEach((modifier) => {
          if (event["".concat(modifier, "Key")]) {
            var _context;
            if (modifier === "ctrl") {
              modifier = "control";
            }
            context = (_context = context) === null || _context === void 0 ? void 0 : _context[modifier];
          }
        });
        if (((_context2 = context) === null || _context2 === void 0 ? void 0 : _context2[keyName]) != null) {
          this.setInputSummary({
            keyName
          });
          selectionChangeObserver.reset();
          context[keyName].call(this, event);
        }
      }
      if (keyEventIsKeyboardCommand(event)) {
        const character = String.fromCharCode(event.keyCode).toLowerCase();
        if (character) {
          var _this$delegate3;
          const keys = ["alt", "shift"].map((modifier) => {
            if (event["".concat(modifier, "Key")]) {
              return modifier;
            }
          }).filter((key) => key);
          keys.push(character);
          if ((_this$delegate3 = this.delegate) !== null && _this$delegate3 !== void 0 && _this$delegate3.inputControllerDidReceiveKeyboardCommand(keys)) {
            event.preventDefault();
          }
        }
      }
    },
    keypress(event) {
      if (this.inputSummary.eventName != null)
        return;
      if (event.metaKey)
        return;
      if (event.ctrlKey && !event.altKey)
        return;
      const string = stringFromKeyEvent(event);
      if (string) {
        var _this$delegate4, _this$responder9;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillPerformTyping();
        (_this$responder9 = this.responder) === null || _this$responder9 === void 0 ? void 0 : _this$responder9.insertString(string);
        return this.setInputSummary({
          textAdded: string,
          didDelete: this.selectionIsExpanded()
        });
      }
    },
    textInput(event) {
      const {
        data
      } = event;
      const {
        textAdded
      } = this.inputSummary;
      if (textAdded && textAdded !== data && textAdded.toUpperCase() === data) {
        var _this$responder10;
        const range = this.getSelectedRange();
        this.setSelectedRange([range[0], range[1] + textAdded.length]);
        (_this$responder10 = this.responder) === null || _this$responder10 === void 0 ? void 0 : _this$responder10.insertString(data);
        this.setInputSummary({
          textAdded: data
        });
        return this.setSelectedRange(range);
      }
    },
    dragenter(event) {
      event.preventDefault();
    },
    dragstart(event) {
      var _this$delegate5, _this$delegate5$input;
      this.serializeSelectionToDataTransfer(event.dataTransfer);
      this.draggedRange = this.getSelectedRange();
      return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$input = _this$delegate5.inputControllerDidStartDrag) === null || _this$delegate5$input === void 0 ? void 0 : _this$delegate5$input.call(_this$delegate5);
    },
    dragover(event) {
      if (this.draggedRange || this.canAcceptDataTransfer(event.dataTransfer)) {
        event.preventDefault();
        const draggingPoint = {
          x: event.clientX,
          y: event.clientY
        };
        if (!objectsAreEqual(draggingPoint, this.draggingPoint)) {
          var _this$delegate6, _this$delegate6$input;
          this.draggingPoint = draggingPoint;
          return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$input = _this$delegate6.inputControllerDidReceiveDragOverPoint) === null || _this$delegate6$input === void 0 ? void 0 : _this$delegate6$input.call(_this$delegate6, this.draggingPoint);
        }
      }
    },
    dragend(event) {
      var _this$delegate7, _this$delegate7$input;
      (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$input = _this$delegate7.inputControllerDidCancelDrag) === null || _this$delegate7$input === void 0 ? void 0 : _this$delegate7$input.call(_this$delegate7);
      this.draggedRange = null;
      this.draggingPoint = null;
    },
    drop(event) {
      var _event$dataTransfer, _this$responder11;
      event.preventDefault();
      const files = (_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 ? void 0 : _event$dataTransfer.files;
      const documentJSON = event.dataTransfer.getData("application/x-trix-document");
      const point = {
        x: event.clientX,
        y: event.clientY
      };
      (_this$responder11 = this.responder) === null || _this$responder11 === void 0 ? void 0 : _this$responder11.setLocationRangeFromPointRange(point);
      if (files !== null && files !== void 0 && files.length) {
        this.attachFiles(files);
      } else if (this.draggedRange) {
        var _this$delegate8, _this$responder12;
        (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : _this$delegate8.inputControllerWillMoveText();
        (_this$responder12 = this.responder) === null || _this$responder12 === void 0 ? void 0 : _this$responder12.moveTextFromRange(this.draggedRange);
        this.draggedRange = null;
        this.requestRender();
      } else if (documentJSON) {
        var _this$responder13;
        const document2 = Document.fromJSONString(documentJSON);
        (_this$responder13 = this.responder) === null || _this$responder13 === void 0 ? void 0 : _this$responder13.insertDocument(document2);
        this.requestRender();
      }
      this.draggedRange = null;
      this.draggingPoint = null;
    },
    cut(event) {
      var _this$responder14;
      if ((_this$responder14 = this.responder) !== null && _this$responder14 !== void 0 && _this$responder14.selectionIsExpanded()) {
        var _this$delegate9;
        if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
          event.preventDefault();
        }
        (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.inputControllerWillCutText();
        this.deleteInDirection("backward");
        if (event.defaultPrevented) {
          return this.requestRender();
        }
      }
    },
    copy(event) {
      var _this$responder15;
      if ((_this$responder15 = this.responder) !== null && _this$responder15 !== void 0 && _this$responder15.selectionIsExpanded()) {
        if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
          event.preventDefault();
        }
      }
    },
    paste(event) {
      const clipboard = event.clipboardData || event.testClipboardData;
      const paste = {
        clipboard
      };
      if (!clipboard || pasteEventIsCrippledSafariHTMLPaste(event)) {
        this.getPastedHTMLUsingHiddenElement((html3) => {
          var _this$delegate10, _this$responder16, _this$delegate11;
          paste.type = "text/html";
          paste.html = html3;
          (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : _this$delegate10.inputControllerWillPaste(paste);
          (_this$responder16 = this.responder) === null || _this$responder16 === void 0 ? void 0 : _this$responder16.insertHTML(paste.html);
          this.requestRender();
          return (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : _this$delegate11.inputControllerDidPaste(paste);
        });
        return;
      }
      const href = clipboard.getData("URL");
      const html2 = clipboard.getData("text/html");
      const name = clipboard.getData("public.url-name");
      if (href) {
        var _this$delegate12, _this$responder17, _this$delegate13;
        let string;
        paste.type = "text/html";
        if (name) {
          string = squishBreakableWhitespace(name).trim();
        } else {
          string = href;
        }
        paste.html = this.createLinkHTML(href, string);
        (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : _this$delegate12.inputControllerWillPaste(paste);
        this.setInputSummary({
          textAdded: string,
          didDelete: this.selectionIsExpanded()
        });
        (_this$responder17 = this.responder) === null || _this$responder17 === void 0 ? void 0 : _this$responder17.insertHTML(paste.html);
        this.requestRender();
        (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : _this$delegate13.inputControllerDidPaste(paste);
      } else if (dataTransferIsPlainText(clipboard)) {
        var _this$delegate14, _this$responder18, _this$delegate15;
        paste.type = "text/plain";
        paste.string = clipboard.getData("text/plain");
        (_this$delegate14 = this.delegate) === null || _this$delegate14 === void 0 ? void 0 : _this$delegate14.inputControllerWillPaste(paste);
        this.setInputSummary({
          textAdded: paste.string,
          didDelete: this.selectionIsExpanded()
        });
        (_this$responder18 = this.responder) === null || _this$responder18 === void 0 ? void 0 : _this$responder18.insertString(paste.string);
        this.requestRender();
        (_this$delegate15 = this.delegate) === null || _this$delegate15 === void 0 ? void 0 : _this$delegate15.inputControllerDidPaste(paste);
      } else if (html2) {
        var _this$delegate16, _this$responder19, _this$delegate17;
        paste.type = "text/html";
        paste.html = html2;
        (_this$delegate16 = this.delegate) === null || _this$delegate16 === void 0 ? void 0 : _this$delegate16.inputControllerWillPaste(paste);
        (_this$responder19 = this.responder) === null || _this$responder19 === void 0 ? void 0 : _this$responder19.insertHTML(paste.html);
        this.requestRender();
        (_this$delegate17 = this.delegate) === null || _this$delegate17 === void 0 ? void 0 : _this$delegate17.inputControllerDidPaste(paste);
      } else if (Array.from(clipboard.types).includes("Files")) {
        var _clipboard$items, _clipboard$items$, _clipboard$items$$get;
        const file = (_clipboard$items = clipboard.items) === null || _clipboard$items === void 0 ? void 0 : (_clipboard$items$ = _clipboard$items[0]) === null || _clipboard$items$ === void 0 ? void 0 : (_clipboard$items$$get = _clipboard$items$.getAsFile) === null || _clipboard$items$$get === void 0 ? void 0 : _clipboard$items$$get.call(_clipboard$items$);
        if (file) {
          var _this$delegate18, _this$responder20, _this$delegate19;
          const extension = extensionForFile(file);
          if (!file.name && extension) {
            file.name = "pasted-file-".concat(++pastedFileCount, ".").concat(extension);
          }
          paste.type = "File";
          paste.file = file;
          (_this$delegate18 = this.delegate) === null || _this$delegate18 === void 0 ? void 0 : _this$delegate18.inputControllerWillAttachFiles();
          (_this$responder20 = this.responder) === null || _this$responder20 === void 0 ? void 0 : _this$responder20.insertFile(paste.file);
          this.requestRender();
          (_this$delegate19 = this.delegate) === null || _this$delegate19 === void 0 ? void 0 : _this$delegate19.inputControllerDidPaste(paste);
        }
      }
      event.preventDefault();
    },
    compositionstart(event) {
      return this.getCompositionInput().start(event.data);
    },
    compositionupdate(event) {
      return this.getCompositionInput().update(event.data);
    },
    compositionend(event) {
      return this.getCompositionInput().end(event.data);
    },
    beforeinput(event) {
      this.inputSummary.didInput = true;
    },
    input(event) {
      this.inputSummary.didInput = true;
      return event.stopPropagation();
    }
  });
  _defineProperty(Level0InputController, "keys", {
    backspace(event) {
      var _this$delegate20;
      (_this$delegate20 = this.delegate) === null || _this$delegate20 === void 0 ? void 0 : _this$delegate20.inputControllerWillPerformTyping();
      return this.deleteInDirection("backward", event);
    },
    delete(event) {
      var _this$delegate21;
      (_this$delegate21 = this.delegate) === null || _this$delegate21 === void 0 ? void 0 : _this$delegate21.inputControllerWillPerformTyping();
      return this.deleteInDirection("forward", event);
    },
    return(event) {
      var _this$delegate22, _this$responder21;
      this.setInputSummary({
        preferDocument: true
      });
      (_this$delegate22 = this.delegate) === null || _this$delegate22 === void 0 ? void 0 : _this$delegate22.inputControllerWillPerformTyping();
      return (_this$responder21 = this.responder) === null || _this$responder21 === void 0 ? void 0 : _this$responder21.insertLineBreak();
    },
    tab(event) {
      var _this$responder22;
      if ((_this$responder22 = this.responder) !== null && _this$responder22 !== void 0 && _this$responder22.canIncreaseNestingLevel()) {
        var _this$responder23;
        (_this$responder23 = this.responder) === null || _this$responder23 === void 0 ? void 0 : _this$responder23.increaseNestingLevel();
        this.requestRender();
        event.preventDefault();
      }
    },
    left(event) {
      if (this.selectionIsInCursorTarget()) {
        var _this$responder24;
        event.preventDefault();
        return (_this$responder24 = this.responder) === null || _this$responder24 === void 0 ? void 0 : _this$responder24.moveCursorInDirection("backward");
      }
    },
    right(event) {
      if (this.selectionIsInCursorTarget()) {
        var _this$responder25;
        event.preventDefault();
        return (_this$responder25 = this.responder) === null || _this$responder25 === void 0 ? void 0 : _this$responder25.moveCursorInDirection("forward");
      }
    },
    control: {
      d(event) {
        var _this$delegate23;
        (_this$delegate23 = this.delegate) === null || _this$delegate23 === void 0 ? void 0 : _this$delegate23.inputControllerWillPerformTyping();
        return this.deleteInDirection("forward", event);
      },
      h(event) {
        var _this$delegate24;
        (_this$delegate24 = this.delegate) === null || _this$delegate24 === void 0 ? void 0 : _this$delegate24.inputControllerWillPerformTyping();
        return this.deleteInDirection("backward", event);
      },
      o(event) {
        var _this$delegate25, _this$responder26;
        event.preventDefault();
        (_this$delegate25 = this.delegate) === null || _this$delegate25 === void 0 ? void 0 : _this$delegate25.inputControllerWillPerformTyping();
        (_this$responder26 = this.responder) === null || _this$responder26 === void 0 ? void 0 : _this$responder26.insertString("\n", {
          updatePosition: false
        });
        return this.requestRender();
      }
    },
    shift: {
      return(event) {
        var _this$delegate26, _this$responder27;
        (_this$delegate26 = this.delegate) === null || _this$delegate26 === void 0 ? void 0 : _this$delegate26.inputControllerWillPerformTyping();
        (_this$responder27 = this.responder) === null || _this$responder27 === void 0 ? void 0 : _this$responder27.insertString("\n");
        this.requestRender();
        event.preventDefault();
      },
      tab(event) {
        var _this$responder28;
        if ((_this$responder28 = this.responder) !== null && _this$responder28 !== void 0 && _this$responder28.canDecreaseNestingLevel()) {
          var _this$responder29;
          (_this$responder29 = this.responder) === null || _this$responder29 === void 0 ? void 0 : _this$responder29.decreaseNestingLevel();
          this.requestRender();
          event.preventDefault();
        }
      },
      left(event) {
        if (this.selectionIsInCursorTarget()) {
          event.preventDefault();
          return this.expandSelectionInDirection("backward");
        }
      },
      right(event) {
        if (this.selectionIsInCursorTarget()) {
          event.preventDefault();
          return this.expandSelectionInDirection("forward");
        }
      }
    },
    alt: {
      backspace(event) {
        var _this$delegate27;
        this.setInputSummary({
          preferDocument: false
        });
        return (_this$delegate27 = this.delegate) === null || _this$delegate27 === void 0 ? void 0 : _this$delegate27.inputControllerWillPerformTyping();
      }
    },
    meta: {
      backspace(event) {
        var _this$delegate28;
        this.setInputSummary({
          preferDocument: false
        });
        return (_this$delegate28 = this.delegate) === null || _this$delegate28 === void 0 ? void 0 : _this$delegate28.inputControllerWillPerformTyping();
      }
    }
  });
  Level0InputController.proxyMethod("responder?.getSelectedRange");
  Level0InputController.proxyMethod("responder?.setSelectedRange");
  Level0InputController.proxyMethod("responder?.expandSelectionInDirection");
  Level0InputController.proxyMethod("responder?.selectionIsInCursorTarget");
  Level0InputController.proxyMethod("responder?.selectionIsExpanded");
  var extensionForFile = (file) => {
    var _file$type, _file$type$match;
    return (_file$type = file.type) === null || _file$type === void 0 ? void 0 : (_file$type$match = _file$type.match(/\/(\w+)$/)) === null || _file$type$match === void 0 ? void 0 : _file$type$match[1];
  };
  var hasStringCodePointAt = !!((_$codePointAt = (_ = " ").codePointAt) !== null && _$codePointAt !== void 0 && _$codePointAt.call(_, 0));
  var stringFromKeyEvent = function(event) {
    if (event.key && hasStringCodePointAt && event.key.codePointAt(0) === event.keyCode) {
      return event.key;
    } else {
      let code;
      if (event.which === null) {
        code = event.keyCode;
      } else if (event.which !== 0 && event.charCode !== 0) {
        code = event.charCode;
      }
      if (code != null && keyNames$1[code] !== "escape") {
        return UTF16String.fromCodepoints([code]).toString();
      }
    }
  };
  var pasteEventIsCrippledSafariHTMLPaste = function(event) {
    const paste = event.clipboardData;
    if (paste) {
      if (paste.types.includes("text/html")) {
        for (const type of paste.types) {
          const hasPasteboardFlavor = /^CorePasteboardFlavorType/.test(type);
          const hasReadableDynamicData = /^dyn\./.test(type) && paste.getData(type);
          const mightBePasteAndMatchStyle = hasPasteboardFlavor || hasReadableDynamicData;
          if (mightBePasteAndMatchStyle) {
            return true;
          }
        }
        return false;
      } else {
        const isExternalHTMLPaste = paste.types.includes("com.apple.webarchive");
        const isExternalRichTextPaste = paste.types.includes("com.apple.flat-rtfd");
        return isExternalHTMLPaste || isExternalRichTextPaste;
      }
    }
  };
  var CompositionInput = class extends BasicObject {
    constructor(inputController) {
      super(...arguments);
      this.inputController = inputController;
      this.responder = this.inputController.responder;
      this.delegate = this.inputController.delegate;
      this.inputSummary = this.inputController.inputSummary;
      this.data = {};
    }
    start(data) {
      this.data.start = data;
      if (this.isSignificant()) {
        var _this$responder5;
        if (this.inputSummary.eventName === "keypress" && this.inputSummary.textAdded) {
          var _this$responder4;
          (_this$responder4 = this.responder) === null || _this$responder4 === void 0 ? void 0 : _this$responder4.deleteInDirection("left");
        }
        if (!this.selectionIsExpanded()) {
          this.insertPlaceholder();
          this.requestRender();
        }
        this.range = (_this$responder5 = this.responder) === null || _this$responder5 === void 0 ? void 0 : _this$responder5.getSelectedRange();
      }
    }
    update(data) {
      this.data.update = data;
      if (this.isSignificant()) {
        const range = this.selectPlaceholder();
        if (range) {
          this.forgetPlaceholder();
          this.range = range;
        }
      }
    }
    end(data) {
      this.data.end = data;
      if (this.isSignificant()) {
        this.forgetPlaceholder();
        if (this.canApplyToDocument()) {
          var _this$delegate2, _this$responder6, _this$responder7, _this$responder8;
          this.setInputSummary({
            preferDocument: true,
            didInput: false
          });
          (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.inputControllerWillPerformTyping();
          (_this$responder6 = this.responder) === null || _this$responder6 === void 0 ? void 0 : _this$responder6.setSelectedRange(this.range);
          (_this$responder7 = this.responder) === null || _this$responder7 === void 0 ? void 0 : _this$responder7.insertString(this.data.end);
          return (_this$responder8 = this.responder) === null || _this$responder8 === void 0 ? void 0 : _this$responder8.setSelectedRange(this.range[0] + this.data.end.length);
        } else if (this.data.start != null || this.data.update != null) {
          this.requestReparse();
          return this.inputController.reset();
        }
      } else {
        return this.inputController.reset();
      }
    }
    getEndData() {
      return this.data.end;
    }
    isEnded() {
      return this.getEndData() != null;
    }
    isSignificant() {
      if (browser.composesExistingText) {
        return this.inputSummary.didInput;
      } else {
        return true;
      }
    }
    canApplyToDocument() {
      var _this$data$start, _this$data$end;
      return ((_this$data$start = this.data.start) === null || _this$data$start === void 0 ? void 0 : _this$data$start.length) === 0 && ((_this$data$end = this.data.end) === null || _this$data$end === void 0 ? void 0 : _this$data$end.length) > 0 && this.range;
    }
  };
  CompositionInput.proxyMethod("inputController.setInputSummary");
  CompositionInput.proxyMethod("inputController.requestRender");
  CompositionInput.proxyMethod("inputController.requestReparse");
  CompositionInput.proxyMethod("responder?.selectionIsExpanded");
  CompositionInput.proxyMethod("responder?.insertPlaceholder");
  CompositionInput.proxyMethod("responder?.selectPlaceholder");
  CompositionInput.proxyMethod("responder?.forgetPlaceholder");
  var Level2InputController = class extends InputController {
    constructor() {
      super(...arguments);
      this.render = this.render.bind(this);
    }
    elementDidMutate() {
      if (this.scheduledRender) {
        if (this.composing) {
          var _this$delegate, _this$delegate$inputC;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidAllowUnhandledInput) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
        }
      } else {
        return this.reparse();
      }
    }
    scheduleRender() {
      return this.scheduledRender ? this.scheduledRender : this.scheduledRender = requestAnimationFrame(this.render);
    }
    render() {
      var _this$afterRender;
      cancelAnimationFrame(this.scheduledRender);
      this.scheduledRender = null;
      if (!this.composing) {
        var _this$delegate2;
        (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.render();
      }
      (_this$afterRender = this.afterRender) === null || _this$afterRender === void 0 ? void 0 : _this$afterRender.call(this);
      this.afterRender = null;
    }
    reparse() {
      var _this$delegate3;
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.reparse();
    }
    insertString() {
      var _this$delegate4;
      let string = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      let options2 = arguments.length > 1 ? arguments[1] : void 0;
      (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillPerformTyping();
      return this.withTargetDOMRange(function() {
        var _this$responder;
        return (_this$responder = this.responder) === null || _this$responder === void 0 ? void 0 : _this$responder.insertString(string, options2);
      });
    }
    toggleAttributeIfSupported(attributeName) {
      if (getAllAttributeNames().includes(attributeName)) {
        var _this$delegate5;
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.inputControllerWillPerformFormatting(attributeName);
        return this.withTargetDOMRange(function() {
          var _this$responder2;
          return (_this$responder2 = this.responder) === null || _this$responder2 === void 0 ? void 0 : _this$responder2.toggleCurrentAttribute(attributeName);
        });
      }
    }
    activateAttributeIfSupported(attributeName, value) {
      if (getAllAttributeNames().includes(attributeName)) {
        var _this$delegate6;
        (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : _this$delegate6.inputControllerWillPerformFormatting(attributeName);
        return this.withTargetDOMRange(function() {
          var _this$responder3;
          return (_this$responder3 = this.responder) === null || _this$responder3 === void 0 ? void 0 : _this$responder3.setCurrentAttribute(attributeName, value);
        });
      }
    }
    deleteInDirection(direction) {
      let {
        recordUndoEntry
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        recordUndoEntry: true
      };
      if (recordUndoEntry) {
        var _this$delegate7;
        (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : _this$delegate7.inputControllerWillPerformTyping();
      }
      const perform = () => {
        var _this$responder4;
        return (_this$responder4 = this.responder) === null || _this$responder4 === void 0 ? void 0 : _this$responder4.deleteInDirection(direction);
      };
      const domRange = this.getTargetDOMRange({
        minLength: 2
      });
      if (domRange) {
        return this.withTargetDOMRange(domRange, perform);
      } else {
        return perform();
      }
    }
    withTargetDOMRange(domRange, fn2) {
      if (typeof domRange === "function") {
        fn2 = domRange;
        domRange = this.getTargetDOMRange();
      }
      if (domRange) {
        var _this$responder5;
        return (_this$responder5 = this.responder) === null || _this$responder5 === void 0 ? void 0 : _this$responder5.withTargetDOMRange(domRange, fn2.bind(this));
      } else {
        selectionChangeObserver.reset();
        return fn2.call(this);
      }
    }
    getTargetDOMRange() {
      var _this$event$getTarget, _this$event;
      let {
        minLength
      } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {
        minLength: 0
      };
      const targetRanges = (_this$event$getTarget = (_this$event = this.event).getTargetRanges) === null || _this$event$getTarget === void 0 ? void 0 : _this$event$getTarget.call(_this$event);
      if (targetRanges) {
        if (targetRanges.length) {
          const domRange = staticRangeToRange(targetRanges[0]);
          if (minLength === 0 || domRange.toString().length >= minLength) {
            return domRange;
          }
        }
      }
    }
    withEvent(event, fn2) {
      let result;
      this.event = event;
      try {
        result = fn2.call(this);
      } finally {
        this.event = null;
      }
      return result;
    }
  };
  _defineProperty(Level2InputController, "events", {
    keydown(event) {
      if (keyEventIsKeyboardCommand(event)) {
        var _this$delegate8;
        const command = keyboardCommandFromKeyEvent(event);
        if ((_this$delegate8 = this.delegate) !== null && _this$delegate8 !== void 0 && _this$delegate8.inputControllerDidReceiveKeyboardCommand(command)) {
          event.preventDefault();
        }
      } else {
        let name = event.key;
        if (event.altKey) {
          name += "+Alt";
        }
        if (event.shiftKey) {
          name += "+Shift";
        }
        const handler = this.constructor.keys[name];
        if (handler) {
          return this.withEvent(event, handler);
        }
      }
    },
    paste(event) {
      var _event$clipboardData;
      let paste;
      const href = (_event$clipboardData = event.clipboardData) === null || _event$clipboardData === void 0 ? void 0 : _event$clipboardData.getData("URL");
      if (pasteEventHasFilesOnly(event)) {
        event.preventDefault();
        return this.attachFiles(event.clipboardData.files);
      } else if (pasteEventHasPlainTextOnly(event)) {
        var _this$delegate9, _this$responder6, _this$delegate10;
        event.preventDefault();
        paste = {
          type: "text/plain",
          string: event.clipboardData.getData("text/plain")
        };
        (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.inputControllerWillPaste(paste);
        (_this$responder6 = this.responder) === null || _this$responder6 === void 0 ? void 0 : _this$responder6.insertString(paste.string);
        this.render();
        return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : _this$delegate10.inputControllerDidPaste(paste);
      } else if (href) {
        var _this$delegate11, _this$responder7, _this$delegate12;
        event.preventDefault();
        paste = {
          type: "text/html",
          html: this.createLinkHTML(href)
        };
        (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : _this$delegate11.inputControllerWillPaste(paste);
        (_this$responder7 = this.responder) === null || _this$responder7 === void 0 ? void 0 : _this$responder7.insertHTML(paste.html);
        this.render();
        return (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : _this$delegate12.inputControllerDidPaste(paste);
      }
    },
    beforeinput(event) {
      const handler = this.constructor.inputTypes[event.inputType];
      if (handler) {
        this.withEvent(event, handler);
        return this.scheduleRender();
      }
    },
    input(event) {
      return selectionChangeObserver.reset();
    },
    dragstart(event) {
      var _this$responder8;
      if ((_this$responder8 = this.responder) !== null && _this$responder8 !== void 0 && _this$responder8.selectionContainsAttachments()) {
        var _this$responder9;
        event.dataTransfer.setData("application/x-trix-dragging", true);
        this.dragging = {
          range: (_this$responder9 = this.responder) === null || _this$responder9 === void 0 ? void 0 : _this$responder9.getSelectedRange(),
          point: pointFromEvent(event)
        };
      }
    },
    dragenter(event) {
      if (dragEventHasFiles(event)) {
        event.preventDefault();
      }
    },
    dragover(event) {
      if (this.dragging) {
        event.preventDefault();
        const point = pointFromEvent(event);
        if (!objectsAreEqual(point, this.dragging.point)) {
          var _this$responder10;
          this.dragging.point = point;
          return (_this$responder10 = this.responder) === null || _this$responder10 === void 0 ? void 0 : _this$responder10.setLocationRangeFromPointRange(point);
        }
      } else if (dragEventHasFiles(event)) {
        event.preventDefault();
      }
    },
    drop(event) {
      if (this.dragging) {
        var _this$delegate13, _this$responder11;
        event.preventDefault();
        (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : _this$delegate13.inputControllerWillMoveText();
        (_this$responder11 = this.responder) === null || _this$responder11 === void 0 ? void 0 : _this$responder11.moveTextFromRange(this.dragging.range);
        this.dragging = null;
        return this.scheduleRender();
      } else if (dragEventHasFiles(event)) {
        var _this$responder12;
        event.preventDefault();
        const point = pointFromEvent(event);
        (_this$responder12 = this.responder) === null || _this$responder12 === void 0 ? void 0 : _this$responder12.setLocationRangeFromPointRange(point);
        return this.attachFiles(event.dataTransfer.files);
      }
    },
    dragend() {
      if (this.dragging) {
        var _this$responder13;
        (_this$responder13 = this.responder) === null || _this$responder13 === void 0 ? void 0 : _this$responder13.setSelectedRange(this.dragging.range);
        this.dragging = null;
      }
    },
    compositionend(event) {
      if (this.composing) {
        this.composing = false;
        return this.scheduleRender();
      }
    }
  });
  _defineProperty(Level2InputController, "keys", {
    ArrowLeft() {
      var _this$responder14;
      if ((_this$responder14 = this.responder) !== null && _this$responder14 !== void 0 && _this$responder14.shouldManageMovingCursorInDirection("backward")) {
        var _this$responder15;
        this.event.preventDefault();
        return (_this$responder15 = this.responder) === null || _this$responder15 === void 0 ? void 0 : _this$responder15.moveCursorInDirection("backward");
      }
    },
    ArrowRight() {
      var _this$responder16;
      if ((_this$responder16 = this.responder) !== null && _this$responder16 !== void 0 && _this$responder16.shouldManageMovingCursorInDirection("forward")) {
        var _this$responder17;
        this.event.preventDefault();
        return (_this$responder17 = this.responder) === null || _this$responder17 === void 0 ? void 0 : _this$responder17.moveCursorInDirection("forward");
      }
    },
    Backspace() {
      var _this$responder18;
      if ((_this$responder18 = this.responder) !== null && _this$responder18 !== void 0 && _this$responder18.shouldManageDeletingInDirection("backward")) {
        var _this$delegate14, _this$responder19;
        this.event.preventDefault();
        (_this$delegate14 = this.delegate) === null || _this$delegate14 === void 0 ? void 0 : _this$delegate14.inputControllerWillPerformTyping();
        (_this$responder19 = this.responder) === null || _this$responder19 === void 0 ? void 0 : _this$responder19.deleteInDirection("backward");
        return this.render();
      }
    },
    Tab() {
      var _this$responder20;
      if ((_this$responder20 = this.responder) !== null && _this$responder20 !== void 0 && _this$responder20.canIncreaseNestingLevel()) {
        var _this$responder21;
        this.event.preventDefault();
        (_this$responder21 = this.responder) === null || _this$responder21 === void 0 ? void 0 : _this$responder21.increaseNestingLevel();
        return this.render();
      }
    },
    "Tab+Shift"() {
      var _this$responder22;
      if ((_this$responder22 = this.responder) !== null && _this$responder22 !== void 0 && _this$responder22.canDecreaseNestingLevel()) {
        var _this$responder23;
        this.event.preventDefault();
        (_this$responder23 = this.responder) === null || _this$responder23 === void 0 ? void 0 : _this$responder23.decreaseNestingLevel();
        return this.render();
      }
    }
  });
  _defineProperty(Level2InputController, "inputTypes", {
    deleteByComposition() {
      return this.deleteInDirection("backward", {
        recordUndoEntry: false
      });
    },
    deleteByCut() {
      return this.deleteInDirection("backward");
    },
    deleteByDrag() {
      this.event.preventDefault();
      return this.withTargetDOMRange(function() {
        var _this$responder24;
        this.deleteByDragRange = (_this$responder24 = this.responder) === null || _this$responder24 === void 0 ? void 0 : _this$responder24.getSelectedRange();
      });
    },
    deleteCompositionText() {
      return this.deleteInDirection("backward", {
        recordUndoEntry: false
      });
    },
    deleteContent() {
      return this.deleteInDirection("backward");
    },
    deleteContentBackward() {
      return this.deleteInDirection("backward");
    },
    deleteContentForward() {
      return this.deleteInDirection("forward");
    },
    deleteEntireSoftLine() {
      return this.deleteInDirection("forward");
    },
    deleteHardLineBackward() {
      return this.deleteInDirection("backward");
    },
    deleteHardLineForward() {
      return this.deleteInDirection("forward");
    },
    deleteSoftLineBackward() {
      return this.deleteInDirection("backward");
    },
    deleteSoftLineForward() {
      return this.deleteInDirection("forward");
    },
    deleteWordBackward() {
      return this.deleteInDirection("backward");
    },
    deleteWordForward() {
      return this.deleteInDirection("forward");
    },
    formatBackColor() {
      return this.activateAttributeIfSupported("backgroundColor", this.event.data);
    },
    formatBold() {
      return this.toggleAttributeIfSupported("bold");
    },
    formatFontColor() {
      return this.activateAttributeIfSupported("color", this.event.data);
    },
    formatFontName() {
      return this.activateAttributeIfSupported("font", this.event.data);
    },
    formatIndent() {
      var _this$responder25;
      if ((_this$responder25 = this.responder) !== null && _this$responder25 !== void 0 && _this$responder25.canIncreaseNestingLevel()) {
        return this.withTargetDOMRange(function() {
          var _this$responder26;
          return (_this$responder26 = this.responder) === null || _this$responder26 === void 0 ? void 0 : _this$responder26.increaseNestingLevel();
        });
      }
    },
    formatItalic() {
      return this.toggleAttributeIfSupported("italic");
    },
    formatJustifyCenter() {
      return this.toggleAttributeIfSupported("justifyCenter");
    },
    formatJustifyFull() {
      return this.toggleAttributeIfSupported("justifyFull");
    },
    formatJustifyLeft() {
      return this.toggleAttributeIfSupported("justifyLeft");
    },
    formatJustifyRight() {
      return this.toggleAttributeIfSupported("justifyRight");
    },
    formatOutdent() {
      var _this$responder27;
      if ((_this$responder27 = this.responder) !== null && _this$responder27 !== void 0 && _this$responder27.canDecreaseNestingLevel()) {
        return this.withTargetDOMRange(function() {
          var _this$responder28;
          return (_this$responder28 = this.responder) === null || _this$responder28 === void 0 ? void 0 : _this$responder28.decreaseNestingLevel();
        });
      }
    },
    formatRemove() {
      this.withTargetDOMRange(function() {
        for (const attributeName in (_this$responder29 = this.responder) === null || _this$responder29 === void 0 ? void 0 : _this$responder29.getCurrentAttributes()) {
          var _this$responder29, _this$responder30;
          (_this$responder30 = this.responder) === null || _this$responder30 === void 0 ? void 0 : _this$responder30.removeCurrentAttribute(attributeName);
        }
      });
    },
    formatSetBlockTextDirection() {
      return this.activateAttributeIfSupported("blockDir", this.event.data);
    },
    formatSetInlineTextDirection() {
      return this.activateAttributeIfSupported("textDir", this.event.data);
    },
    formatStrikeThrough() {
      return this.toggleAttributeIfSupported("strike");
    },
    formatSubscript() {
      return this.toggleAttributeIfSupported("sub");
    },
    formatSuperscript() {
      return this.toggleAttributeIfSupported("sup");
    },
    formatUnderline() {
      return this.toggleAttributeIfSupported("underline");
    },
    historyRedo() {
      var _this$delegate15;
      return (_this$delegate15 = this.delegate) === null || _this$delegate15 === void 0 ? void 0 : _this$delegate15.inputControllerWillPerformRedo();
    },
    historyUndo() {
      var _this$delegate16;
      return (_this$delegate16 = this.delegate) === null || _this$delegate16 === void 0 ? void 0 : _this$delegate16.inputControllerWillPerformUndo();
    },
    insertCompositionText() {
      this.composing = true;
      return this.insertString(this.event.data);
    },
    insertFromComposition() {
      this.composing = false;
      return this.insertString(this.event.data);
    },
    insertFromDrop() {
      const range = this.deleteByDragRange;
      if (range) {
        var _this$delegate17;
        this.deleteByDragRange = null;
        (_this$delegate17 = this.delegate) === null || _this$delegate17 === void 0 ? void 0 : _this$delegate17.inputControllerWillMoveText();
        return this.withTargetDOMRange(function() {
          var _this$responder31;
          return (_this$responder31 = this.responder) === null || _this$responder31 === void 0 ? void 0 : _this$responder31.moveTextFromRange(range);
        });
      }
    },
    insertFromPaste() {
      var _dataTransfer$files;
      const {
        dataTransfer
      } = this.event;
      const paste = {
        dataTransfer
      };
      const href = dataTransfer.getData("URL");
      const html2 = dataTransfer.getData("text/html");
      if (href) {
        var _this$delegate18;
        let string;
        this.event.preventDefault();
        paste.type = "text/html";
        const name = dataTransfer.getData("public.url-name");
        if (name) {
          string = squishBreakableWhitespace(name).trim();
        } else {
          string = href;
        }
        paste.html = this.createLinkHTML(href, string);
        (_this$delegate18 = this.delegate) === null || _this$delegate18 === void 0 ? void 0 : _this$delegate18.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder32;
          return (_this$responder32 = this.responder) === null || _this$responder32 === void 0 ? void 0 : _this$responder32.insertHTML(paste.html);
        });
        this.afterRender = () => {
          var _this$delegate19;
          return (_this$delegate19 = this.delegate) === null || _this$delegate19 === void 0 ? void 0 : _this$delegate19.inputControllerDidPaste(paste);
        };
      } else if (dataTransferIsPlainText(dataTransfer)) {
        var _this$delegate20;
        paste.type = "text/plain";
        paste.string = dataTransfer.getData("text/plain");
        (_this$delegate20 = this.delegate) === null || _this$delegate20 === void 0 ? void 0 : _this$delegate20.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder33;
          return (_this$responder33 = this.responder) === null || _this$responder33 === void 0 ? void 0 : _this$responder33.insertString(paste.string);
        });
        this.afterRender = () => {
          var _this$delegate21;
          return (_this$delegate21 = this.delegate) === null || _this$delegate21 === void 0 ? void 0 : _this$delegate21.inputControllerDidPaste(paste);
        };
      } else if (html2) {
        var _this$delegate22;
        this.event.preventDefault();
        paste.type = "text/html";
        paste.html = html2;
        (_this$delegate22 = this.delegate) === null || _this$delegate22 === void 0 ? void 0 : _this$delegate22.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder34;
          return (_this$responder34 = this.responder) === null || _this$responder34 === void 0 ? void 0 : _this$responder34.insertHTML(paste.html);
        });
        this.afterRender = () => {
          var _this$delegate23;
          return (_this$delegate23 = this.delegate) === null || _this$delegate23 === void 0 ? void 0 : _this$delegate23.inputControllerDidPaste(paste);
        };
      } else if ((_dataTransfer$files = dataTransfer.files) !== null && _dataTransfer$files !== void 0 && _dataTransfer$files.length) {
        var _this$delegate24;
        paste.type = "File";
        paste.file = dataTransfer.files[0];
        (_this$delegate24 = this.delegate) === null || _this$delegate24 === void 0 ? void 0 : _this$delegate24.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder35;
          return (_this$responder35 = this.responder) === null || _this$responder35 === void 0 ? void 0 : _this$responder35.insertFile(paste.file);
        });
        this.afterRender = () => {
          var _this$delegate25;
          return (_this$delegate25 = this.delegate) === null || _this$delegate25 === void 0 ? void 0 : _this$delegate25.inputControllerDidPaste(paste);
        };
      }
    },
    insertFromYank() {
      return this.insertString(this.event.data);
    },
    insertLineBreak() {
      return this.insertString("\n");
    },
    insertLink() {
      return this.activateAttributeIfSupported("href", this.event.data);
    },
    insertOrderedList() {
      return this.toggleAttributeIfSupported("number");
    },
    insertParagraph() {
      var _this$delegate26;
      (_this$delegate26 = this.delegate) === null || _this$delegate26 === void 0 ? void 0 : _this$delegate26.inputControllerWillPerformTyping();
      return this.withTargetDOMRange(function() {
        var _this$responder36;
        return (_this$responder36 = this.responder) === null || _this$responder36 === void 0 ? void 0 : _this$responder36.insertLineBreak();
      });
    },
    insertReplacementText() {
      return this.insertString(this.event.dataTransfer.getData("text/plain"), {
        updatePosition: false
      });
    },
    insertText() {
      var _this$event$dataTrans;
      return this.insertString(this.event.data || ((_this$event$dataTrans = this.event.dataTransfer) === null || _this$event$dataTrans === void 0 ? void 0 : _this$event$dataTrans.getData("text/plain")));
    },
    insertTranspose() {
      return this.insertString(this.event.data);
    },
    insertUnorderedList() {
      return this.toggleAttributeIfSupported("bullet");
    }
  });
  var staticRangeToRange = function(staticRange) {
    const range = document.createRange();
    range.setStart(staticRange.startContainer, staticRange.startOffset);
    range.setEnd(staticRange.endContainer, staticRange.endOffset);
    return range;
  };
  var dragEventHasFiles = (event) => {
    var _event$dataTransfer;
    return Array.from(((_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 ? void 0 : _event$dataTransfer.types) || []).includes("Files");
  };
  var pasteEventHasFilesOnly = function(event) {
    const clipboard = event.clipboardData;
    if (clipboard) {
      return clipboard.types.includes("Files") && clipboard.types.length === 1 && clipboard.files.length >= 1;
    }
  };
  var pasteEventHasPlainTextOnly = function(event) {
    const clipboard = event.clipboardData;
    if (clipboard) {
      return clipboard.types.includes("text/plain") && clipboard.types.length === 1;
    }
  };
  var keyboardCommandFromKeyEvent = function(event) {
    const command = [];
    if (event.altKey) {
      command.push("alt");
    }
    if (event.shiftKey) {
      command.push("shift");
    }
    command.push(event.key);
    return command;
  };
  var pointFromEvent = (event) => ({
    x: event.clientX,
    y: event.clientY
  });
  var {
    lang,
    css,
    keyNames
  } = config;
  var undoable = function(fn2) {
    return function() {
      const commands = fn2.apply(this, arguments);
      commands.do();
      if (!this.undos) {
        this.undos = [];
      }
      this.undos.push(commands.undo);
    };
  };
  var AttachmentEditorController = class extends BasicObject {
    constructor(attachmentPiece, _element, container) {
      let options2 = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
      super(...arguments);
      _defineProperty(this, "makeElementMutable", undoable(() => {
        return {
          do: () => {
            this.element.dataset.trixMutable = true;
          },
          undo: () => delete this.element.dataset.trixMutable
        };
      }));
      _defineProperty(this, "addToolbar", undoable(() => {
        const element = makeElement({
          tagName: "div",
          className: css.attachmentToolbar,
          data: {
            trixMutable: true
          },
          childNodes: makeElement({
            tagName: "div",
            className: "trix-button-row",
            childNodes: makeElement({
              tagName: "span",
              className: "trix-button-group trix-button-group--actions",
              childNodes: makeElement({
                tagName: "button",
                className: "trix-button trix-button--remove",
                textContent: lang.remove,
                attributes: {
                  title: lang.remove
                },
                data: {
                  trixAction: "remove"
                }
              })
            })
          })
        });
        if (this.attachment.isPreviewable()) {
          element.appendChild(makeElement({
            tagName: "div",
            className: css.attachmentMetadataContainer,
            childNodes: makeElement({
              tagName: "span",
              className: css.attachmentMetadata,
              childNodes: [makeElement({
                tagName: "span",
                className: css.attachmentName,
                textContent: this.attachment.getFilename(),
                attributes: {
                  title: this.attachment.getFilename()
                }
              }), makeElement({
                tagName: "span",
                className: css.attachmentSize,
                textContent: this.attachment.getFormattedFilesize()
              })]
            })
          }));
        }
        handleEvent("click", {
          onElement: element,
          withCallback: this.didClickToolbar
        });
        handleEvent("click", {
          onElement: element,
          matchingSelector: "[data-trix-action]",
          withCallback: this.didClickActionButton
        });
        return {
          do: () => this.element.appendChild(element),
          undo: () => removeNode(element)
        };
      }));
      _defineProperty(this, "installCaptionEditor", undoable(() => {
        const textarea = makeElement({
          tagName: "textarea",
          className: css.attachmentCaptionEditor,
          attributes: {
            placeholder: lang.captionPlaceholder
          },
          data: {
            trixMutable: true
          }
        });
        textarea.value = this.attachmentPiece.getCaption();
        const textareaClone = textarea.cloneNode();
        textareaClone.classList.add("trix-autoresize-clone");
        textareaClone.tabIndex = -1;
        const autoresize = function() {
          textareaClone.value = textarea.value;
          textarea.style.height = textareaClone.scrollHeight + "px";
        };
        handleEvent("input", {
          onElement: textarea,
          withCallback: autoresize
        });
        handleEvent("input", {
          onElement: textarea,
          withCallback: this.didInputCaption
        });
        handleEvent("keydown", {
          onElement: textarea,
          withCallback: this.didKeyDownCaption
        });
        handleEvent("change", {
          onElement: textarea,
          withCallback: this.didChangeCaption
        });
        handleEvent("blur", {
          onElement: textarea,
          withCallback: this.didBlurCaption
        });
        const figcaption = this.element.querySelector("figcaption");
        const editingFigcaption = figcaption.cloneNode();
        return {
          do: () => {
            figcaption.style.display = "none";
            editingFigcaption.appendChild(textarea);
            editingFigcaption.appendChild(textareaClone);
            editingFigcaption.classList.add("".concat(css.attachmentCaption, "--editing"));
            figcaption.parentElement.insertBefore(editingFigcaption, figcaption);
            autoresize();
            if (this.options.editCaption) {
              return defer(() => textarea.focus());
            }
          },
          undo() {
            removeNode(editingFigcaption);
            figcaption.style.display = null;
          }
        };
      }));
      this.didClickToolbar = this.didClickToolbar.bind(this);
      this.didClickActionButton = this.didClickActionButton.bind(this);
      this.didKeyDownCaption = this.didKeyDownCaption.bind(this);
      this.didInputCaption = this.didInputCaption.bind(this);
      this.didChangeCaption = this.didChangeCaption.bind(this);
      this.didBlurCaption = this.didBlurCaption.bind(this);
      this.attachmentPiece = attachmentPiece;
      this.element = _element;
      this.container = container;
      this.options = options2;
      this.attachment = this.attachmentPiece.attachment;
      if (tagName(this.element) === "a") {
        this.element = this.element.firstChild;
      }
      this.install();
    }
    install() {
      this.makeElementMutable();
      this.addToolbar();
      if (this.attachment.isPreviewable()) {
        this.installCaptionEditor();
      }
    }
    uninstall() {
      var _this$delegate;
      let undo = this.undos.pop();
      this.savePendingCaption();
      while (undo) {
        undo();
        undo = this.undos.pop();
      }
      (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : _this$delegate.didUninstallAttachmentEditor(this);
    }
    savePendingCaption() {
      if (this.pendingCaption) {
        const caption = this.pendingCaption;
        this.pendingCaption = null;
        if (caption) {
          var _this$delegate2, _this$delegate2$attac;
          (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$attac = _this$delegate2.attachmentEditorDidRequestUpdatingAttributesForAttachment) === null || _this$delegate2$attac === void 0 ? void 0 : _this$delegate2$attac.call(_this$delegate2, {
            caption
          }, this.attachment);
        } else {
          var _this$delegate3, _this$delegate3$attac;
          (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$attac = _this$delegate3.attachmentEditorDidRequestRemovingAttributeForAttachment) === null || _this$delegate3$attac === void 0 ? void 0 : _this$delegate3$attac.call(_this$delegate3, "caption", this.attachment);
        }
      }
    }
    didClickToolbar(event) {
      event.preventDefault();
      return event.stopPropagation();
    }
    didClickActionButton(event) {
      var _this$delegate4;
      const action = event.target.getAttribute("data-trix-action");
      switch (action) {
        case "remove":
          return (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.attachmentEditorDidRequestRemovalOfAttachment(this.attachment);
      }
    }
    didKeyDownCaption(event) {
      if (keyNames[event.keyCode] === "return") {
        var _this$delegate5, _this$delegate5$attac;
        event.preventDefault();
        this.savePendingCaption();
        return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$attac = _this$delegate5.attachmentEditorDidRequestDeselectingAttachment) === null || _this$delegate5$attac === void 0 ? void 0 : _this$delegate5$attac.call(_this$delegate5, this.attachment);
      }
    }
    didInputCaption(event) {
      this.pendingCaption = event.target.value.replace(/\s/g, " ").trim();
    }
    didChangeCaption(event) {
      return this.savePendingCaption();
    }
    didBlurCaption(event) {
      return this.savePendingCaption();
    }
  };
  var CompositionController = class extends BasicObject {
    constructor(element, composition) {
      super(...arguments);
      this.didFocus = this.didFocus.bind(this);
      this.didBlur = this.didBlur.bind(this);
      this.didClickAttachment = this.didClickAttachment.bind(this);
      this.element = element;
      this.composition = composition;
      this.documentView = new DocumentView(this.composition.document, {
        element: this.element
      });
      handleEvent("focus", {
        onElement: this.element,
        withCallback: this.didFocus
      });
      handleEvent("blur", {
        onElement: this.element,
        withCallback: this.didBlur
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: "a[contenteditable=false]",
        preventDefault: true
      });
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: attachmentSelector,
        withCallback: this.didClickAttachment
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: "a".concat(attachmentSelector),
        preventDefault: true
      });
    }
    didFocus(event) {
      var _this$blurPromise;
      const perform = () => {
        if (!this.focused) {
          var _this$delegate, _this$delegate$compos;
          this.focused = true;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$compos = _this$delegate.compositionControllerDidFocus) === null || _this$delegate$compos === void 0 ? void 0 : _this$delegate$compos.call(_this$delegate);
        }
      };
      return ((_this$blurPromise = this.blurPromise) === null || _this$blurPromise === void 0 ? void 0 : _this$blurPromise.then(perform)) || perform();
    }
    didBlur(event) {
      this.blurPromise = new Promise((resolve) => {
        return defer(() => {
          if (!innerElementIsActive(this.element)) {
            var _this$delegate2, _this$delegate2$compo;
            this.focused = null;
            (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$compo = _this$delegate2.compositionControllerDidBlur) === null || _this$delegate2$compo === void 0 ? void 0 : _this$delegate2$compo.call(_this$delegate2);
          }
          this.blurPromise = null;
          return resolve();
        });
      });
    }
    didClickAttachment(event, target) {
      var _this$delegate3, _this$delegate3$compo;
      const attachment = this.findAttachmentForElement(target);
      const editCaption = !!findClosestElementFromNode(event.target, {
        matchingSelector: "figcaption"
      });
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$compo = _this$delegate3.compositionControllerDidSelectAttachment) === null || _this$delegate3$compo === void 0 ? void 0 : _this$delegate3$compo.call(_this$delegate3, attachment, {
        editCaption
      });
    }
    getSerializableElement() {
      if (this.isEditingAttachment()) {
        return this.documentView.shadowElement;
      } else {
        return this.element;
      }
    }
    render() {
      var _this$delegate6, _this$delegate6$compo;
      if (this.revision !== this.composition.revision) {
        this.documentView.setDocument(this.composition.document);
        this.documentView.render();
        this.revision = this.composition.revision;
      }
      if (this.canSyncDocumentView() && !this.documentView.isSynced()) {
        var _this$delegate4, _this$delegate4$compo, _this$delegate5, _this$delegate5$compo;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : (_this$delegate4$compo = _this$delegate4.compositionControllerWillSyncDocumentView) === null || _this$delegate4$compo === void 0 ? void 0 : _this$delegate4$compo.call(_this$delegate4);
        this.documentView.sync();
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$compo = _this$delegate5.compositionControllerDidSyncDocumentView) === null || _this$delegate5$compo === void 0 ? void 0 : _this$delegate5$compo.call(_this$delegate5);
      }
      return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$compo = _this$delegate6.compositionControllerDidRender) === null || _this$delegate6$compo === void 0 ? void 0 : _this$delegate6$compo.call(_this$delegate6);
    }
    rerenderViewForObject(object2) {
      this.invalidateViewForObject(object2);
      return this.render();
    }
    invalidateViewForObject(object2) {
      return this.documentView.invalidateViewForObject(object2);
    }
    isViewCachingEnabled() {
      return this.documentView.isViewCachingEnabled();
    }
    enableViewCaching() {
      return this.documentView.enableViewCaching();
    }
    disableViewCaching() {
      return this.documentView.disableViewCaching();
    }
    refreshViewCache() {
      return this.documentView.garbageCollectCachedViews();
    }
    isEditingAttachment() {
      return !!this.attachmentEditor;
    }
    installAttachmentEditorForAttachment(attachment, options2) {
      var _this$attachmentEdito;
      if (((_this$attachmentEdito = this.attachmentEditor) === null || _this$attachmentEdito === void 0 ? void 0 : _this$attachmentEdito.attachment) === attachment)
        return;
      const element = this.documentView.findElementForObject(attachment);
      if (!element)
        return;
      this.uninstallAttachmentEditor();
      const attachmentPiece = this.composition.document.getAttachmentPieceForAttachment(attachment);
      this.attachmentEditor = new AttachmentEditorController(attachmentPiece, element, this.element, options2);
      this.attachmentEditor.delegate = this;
    }
    uninstallAttachmentEditor() {
      var _this$attachmentEdito2;
      return (_this$attachmentEdito2 = this.attachmentEditor) === null || _this$attachmentEdito2 === void 0 ? void 0 : _this$attachmentEdito2.uninstall();
    }
    didUninstallAttachmentEditor() {
      this.attachmentEditor = null;
      return this.render();
    }
    attachmentEditorDidRequestUpdatingAttributesForAttachment(attributes2, attachment) {
      var _this$delegate7, _this$delegate7$compo;
      (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$compo = _this$delegate7.compositionControllerWillUpdateAttachment) === null || _this$delegate7$compo === void 0 ? void 0 : _this$delegate7$compo.call(_this$delegate7, attachment);
      return this.composition.updateAttributesForAttachment(attributes2, attachment);
    }
    attachmentEditorDidRequestRemovingAttributeForAttachment(attribute, attachment) {
      var _this$delegate8, _this$delegate8$compo;
      (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : (_this$delegate8$compo = _this$delegate8.compositionControllerWillUpdateAttachment) === null || _this$delegate8$compo === void 0 ? void 0 : _this$delegate8$compo.call(_this$delegate8, attachment);
      return this.composition.removeAttributeForAttachment(attribute, attachment);
    }
    attachmentEditorDidRequestRemovalOfAttachment(attachment) {
      var _this$delegate9, _this$delegate9$compo;
      return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : (_this$delegate9$compo = _this$delegate9.compositionControllerDidRequestRemovalOfAttachment) === null || _this$delegate9$compo === void 0 ? void 0 : _this$delegate9$compo.call(_this$delegate9, attachment);
    }
    attachmentEditorDidRequestDeselectingAttachment(attachment) {
      var _this$delegate10, _this$delegate10$comp;
      return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : (_this$delegate10$comp = _this$delegate10.compositionControllerDidRequestDeselectingAttachment) === null || _this$delegate10$comp === void 0 ? void 0 : _this$delegate10$comp.call(_this$delegate10, attachment);
    }
    canSyncDocumentView() {
      return !this.isEditingAttachment();
    }
    findAttachmentForElement(element) {
      return this.composition.document.getAttachmentById(parseInt(element.dataset.trixId, 10));
    }
  };
  var attributeButtonSelector = "[data-trix-attribute]";
  var actionButtonSelector = "[data-trix-action]";
  var toolbarButtonSelector = "".concat(attributeButtonSelector, ", ").concat(actionButtonSelector);
  var dialogSelector = "[data-trix-dialog]";
  var activeDialogSelector = "".concat(dialogSelector, "[data-trix-active]");
  var dialogButtonSelector = "".concat(dialogSelector, " [data-trix-method]");
  var dialogInputSelector = "".concat(dialogSelector, " [data-trix-input]");
  var getInputForDialog = (element, attributeName) => {
    if (!attributeName) {
      attributeName = getAttributeName(element);
    }
    return element.querySelector("[data-trix-input][name='".concat(attributeName, "']"));
  };
  var getActionName = (element) => element.getAttribute("data-trix-action");
  var getAttributeName = (element) => {
    return element.getAttribute("data-trix-attribute") || element.getAttribute("data-trix-dialog-attribute");
  };
  var getDialogName = (element) => element.getAttribute("data-trix-dialog");
  var ToolbarController = class extends BasicObject {
    constructor(element) {
      super(element);
      this.didClickActionButton = this.didClickActionButton.bind(this);
      this.didClickAttributeButton = this.didClickAttributeButton.bind(this);
      this.didClickDialogButton = this.didClickDialogButton.bind(this);
      this.didKeyDownDialogInput = this.didKeyDownDialogInput.bind(this);
      this.element = element;
      this.attributes = {};
      this.actions = {};
      this.resetDialogInputs();
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: actionButtonSelector,
        withCallback: this.didClickActionButton
      });
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: attributeButtonSelector,
        withCallback: this.didClickAttributeButton
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: toolbarButtonSelector,
        preventDefault: true
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: dialogButtonSelector,
        withCallback: this.didClickDialogButton
      });
      handleEvent("keydown", {
        onElement: this.element,
        matchingSelector: dialogInputSelector,
        withCallback: this.didKeyDownDialogInput
      });
    }
    didClickActionButton(event, element) {
      var _this$delegate;
      (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : _this$delegate.toolbarDidClickButton();
      event.preventDefault();
      const actionName = getActionName(element);
      if (this.getDialog(actionName)) {
        return this.toggleDialog(actionName);
      } else {
        var _this$delegate2;
        return (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.toolbarDidInvokeAction(actionName);
      }
    }
    didClickAttributeButton(event, element) {
      var _this$delegate3;
      (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.toolbarDidClickButton();
      event.preventDefault();
      const attributeName = getAttributeName(element);
      if (this.getDialog(attributeName)) {
        this.toggleDialog(attributeName);
      } else {
        var _this$delegate4;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.toolbarDidToggleAttribute(attributeName);
      }
      return this.refreshAttributeButtons();
    }
    didClickDialogButton(event, element) {
      const dialogElement = findClosestElementFromNode(element, {
        matchingSelector: dialogSelector
      });
      const method = element.getAttribute("data-trix-method");
      return this[method].call(this, dialogElement);
    }
    didKeyDownDialogInput(event, element) {
      if (event.keyCode === 13) {
        event.preventDefault();
        const attribute = element.getAttribute("name");
        const dialog = this.getDialog(attribute);
        this.setAttribute(dialog);
      }
      if (event.keyCode === 27) {
        event.preventDefault();
        return this.hideDialog();
      }
    }
    updateActions(actions) {
      this.actions = actions;
      return this.refreshActionButtons();
    }
    refreshActionButtons() {
      return this.eachActionButton((element, actionName) => {
        element.disabled = this.actions[actionName] === false;
      });
    }
    eachActionButton(callback) {
      return Array.from(this.element.querySelectorAll(actionButtonSelector)).map((element) => callback(element, getActionName(element)));
    }
    updateAttributes(attributes2) {
      this.attributes = attributes2;
      return this.refreshAttributeButtons();
    }
    refreshAttributeButtons() {
      return this.eachAttributeButton((element, attributeName) => {
        element.disabled = this.attributes[attributeName] === false;
        if (this.attributes[attributeName] || this.dialogIsVisible(attributeName)) {
          element.setAttribute("data-trix-active", "");
          return element.classList.add("trix-active");
        } else {
          element.removeAttribute("data-trix-active");
          return element.classList.remove("trix-active");
        }
      });
    }
    eachAttributeButton(callback) {
      return Array.from(this.element.querySelectorAll(attributeButtonSelector)).map((element) => callback(element, getAttributeName(element)));
    }
    applyKeyboardCommand(keys) {
      const keyString = JSON.stringify(keys.sort());
      for (const button of Array.from(this.element.querySelectorAll("[data-trix-key]"))) {
        const buttonKeys = button.getAttribute("data-trix-key").split("+");
        const buttonKeyString = JSON.stringify(buttonKeys.sort());
        if (buttonKeyString === keyString) {
          triggerEvent("mousedown", {
            onElement: button
          });
          return true;
        }
      }
      return false;
    }
    dialogIsVisible(dialogName) {
      const element = this.getDialog(dialogName);
      if (element) {
        return element.hasAttribute("data-trix-active");
      }
    }
    toggleDialog(dialogName) {
      if (this.dialogIsVisible(dialogName)) {
        return this.hideDialog();
      } else {
        return this.showDialog(dialogName);
      }
    }
    showDialog(dialogName) {
      var _this$delegate5, _this$delegate6;
      this.hideDialog();
      (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.toolbarWillShowDialog();
      const element = this.getDialog(dialogName);
      element.setAttribute("data-trix-active", "");
      element.classList.add("trix-active");
      Array.from(element.querySelectorAll("input[disabled]")).forEach((disabledInput) => {
        disabledInput.removeAttribute("disabled");
      });
      const attributeName = getAttributeName(element);
      if (attributeName) {
        const input2 = getInputForDialog(element, dialogName);
        if (input2) {
          input2.value = this.attributes[attributeName] || "";
          input2.select();
        }
      }
      return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : _this$delegate6.toolbarDidShowDialog(dialogName);
    }
    setAttribute(dialogElement) {
      const attributeName = getAttributeName(dialogElement);
      const input2 = getInputForDialog(dialogElement, attributeName);
      if (input2.willValidate && !input2.checkValidity()) {
        input2.setAttribute("data-trix-validate", "");
        input2.classList.add("trix-validate");
        return input2.focus();
      } else {
        var _this$delegate7;
        (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : _this$delegate7.toolbarDidUpdateAttribute(attributeName, input2.value);
        return this.hideDialog();
      }
    }
    removeAttribute(dialogElement) {
      var _this$delegate8;
      const attributeName = getAttributeName(dialogElement);
      (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : _this$delegate8.toolbarDidRemoveAttribute(attributeName);
      return this.hideDialog();
    }
    hideDialog() {
      const element = this.element.querySelector(activeDialogSelector);
      if (element) {
        var _this$delegate9;
        element.removeAttribute("data-trix-active");
        element.classList.remove("trix-active");
        this.resetDialogInputs();
        return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.toolbarDidHideDialog(getDialogName(element));
      }
    }
    resetDialogInputs() {
      Array.from(this.element.querySelectorAll(dialogInputSelector)).forEach((input2) => {
        input2.setAttribute("disabled", "disabled");
        input2.removeAttribute("data-trix-validate");
        input2.classList.remove("trix-validate");
      });
    }
    getDialog(dialogName) {
      return this.element.querySelector("[data-trix-dialog=".concat(dialogName, "]"));
    }
  };
  var snapshotsAreEqual = (a, b) => rangesAreEqual(a.selectedRange, b.selectedRange) && a.document.isEqualTo(b.document);
  var EditorController = class extends Controller2 {
    constructor(_ref) {
      let {
        editorElement,
        document: document2,
        html: html2
      } = _ref;
      super(...arguments);
      this.editorElement = editorElement;
      this.selectionManager = new SelectionManager(this.editorElement);
      this.selectionManager.delegate = this;
      this.composition = new Composition();
      this.composition.delegate = this;
      this.attachmentManager = new AttachmentManager(this.composition.getAttachments());
      this.attachmentManager.delegate = this;
      this.inputController = config.input.getLevel() === 2 ? new Level2InputController(this.editorElement) : new Level0InputController(this.editorElement);
      this.inputController.delegate = this;
      this.inputController.responder = this.composition;
      this.compositionController = new CompositionController(this.editorElement, this.composition);
      this.compositionController.delegate = this;
      this.toolbarController = new ToolbarController(this.editorElement.toolbarElement);
      this.toolbarController.delegate = this;
      this.editor = new Editor(this.composition, this.selectionManager, this.editorElement);
      if (document2) {
        this.editor.loadDocument(document2);
      } else {
        this.editor.loadHTML(html2);
      }
    }
    registerSelectionManager() {
      return selectionChangeObserver.registerSelectionManager(this.selectionManager);
    }
    unregisterSelectionManager() {
      return selectionChangeObserver.unregisterSelectionManager(this.selectionManager);
    }
    render() {
      return this.compositionController.render();
    }
    reparse() {
      return this.composition.replaceHTML(this.editorElement.innerHTML);
    }
    compositionDidChangeDocument(document2) {
      this.notifyEditorElement("document-change");
      if (!this.handlingInput) {
        return this.render();
      }
    }
    compositionDidChangeCurrentAttributes(currentAttributes) {
      this.currentAttributes = currentAttributes;
      this.toolbarController.updateAttributes(this.currentAttributes);
      this.updateCurrentActions();
      return this.notifyEditorElement("attributes-change", {
        attributes: this.currentAttributes
      });
    }
    compositionDidPerformInsertionAtRange(range) {
      if (this.pasting) {
        this.pastedRange = range;
      }
    }
    compositionShouldAcceptFile(file) {
      return this.notifyEditorElement("file-accept", {
        file
      });
    }
    compositionDidAddAttachment(attachment) {
      const managedAttachment = this.attachmentManager.manageAttachment(attachment);
      return this.notifyEditorElement("attachment-add", {
        attachment: managedAttachment
      });
    }
    compositionDidEditAttachment(attachment) {
      this.compositionController.rerenderViewForObject(attachment);
      const managedAttachment = this.attachmentManager.manageAttachment(attachment);
      this.notifyEditorElement("attachment-edit", {
        attachment: managedAttachment
      });
      return this.notifyEditorElement("change");
    }
    compositionDidChangeAttachmentPreviewURL(attachment) {
      this.compositionController.invalidateViewForObject(attachment);
      return this.notifyEditorElement("change");
    }
    compositionDidRemoveAttachment(attachment) {
      const managedAttachment = this.attachmentManager.unmanageAttachment(attachment);
      return this.notifyEditorElement("attachment-remove", {
        attachment: managedAttachment
      });
    }
    compositionDidStartEditingAttachment(attachment, options2) {
      this.attachmentLocationRange = this.composition.document.getLocationRangeOfAttachment(attachment);
      this.compositionController.installAttachmentEditorForAttachment(attachment, options2);
      return this.selectionManager.setLocationRange(this.attachmentLocationRange);
    }
    compositionDidStopEditingAttachment(attachment) {
      this.compositionController.uninstallAttachmentEditor();
      this.attachmentLocationRange = null;
    }
    compositionDidRequestChangingSelectionToLocationRange(locationRange) {
      if (this.loadingSnapshot && !this.isFocused())
        return;
      this.requestedLocationRange = locationRange;
      this.compositionRevisionWhenLocationRangeRequested = this.composition.revision;
      if (!this.handlingInput) {
        return this.render();
      }
    }
    compositionWillLoadSnapshot() {
      this.loadingSnapshot = true;
    }
    compositionDidLoadSnapshot() {
      this.compositionController.refreshViewCache();
      this.render();
      this.loadingSnapshot = false;
    }
    getSelectionManager() {
      return this.selectionManager;
    }
    attachmentManagerDidRequestRemovalOfAttachment(attachment) {
      return this.removeAttachment(attachment);
    }
    compositionControllerWillSyncDocumentView() {
      this.inputController.editorWillSyncDocumentView();
      this.selectionManager.lock();
      return this.selectionManager.clearSelection();
    }
    compositionControllerDidSyncDocumentView() {
      this.inputController.editorDidSyncDocumentView();
      this.selectionManager.unlock();
      this.updateCurrentActions();
      return this.notifyEditorElement("sync");
    }
    compositionControllerDidRender() {
      if (this.requestedLocationRange) {
        if (this.compositionRevisionWhenLocationRangeRequested === this.composition.revision) {
          this.selectionManager.setLocationRange(this.requestedLocationRange);
        }
        this.requestedLocationRange = null;
        this.compositionRevisionWhenLocationRangeRequested = null;
      }
      if (this.renderedCompositionRevision !== this.composition.revision) {
        this.runEditorFilters();
        this.composition.updateCurrentAttributes();
        this.notifyEditorElement("render");
      }
      this.renderedCompositionRevision = this.composition.revision;
    }
    compositionControllerDidFocus() {
      if (this.isFocusedInvisibly()) {
        this.setLocationRange({
          index: 0,
          offset: 0
        });
      }
      this.toolbarController.hideDialog();
      return this.notifyEditorElement("focus");
    }
    compositionControllerDidBlur() {
      return this.notifyEditorElement("blur");
    }
    compositionControllerDidSelectAttachment(attachment, options2) {
      this.toolbarController.hideDialog();
      return this.composition.editAttachment(attachment, options2);
    }
    compositionControllerDidRequestDeselectingAttachment(attachment) {
      const locationRange = this.attachmentLocationRange || this.composition.document.getLocationRangeOfAttachment(attachment);
      return this.selectionManager.setLocationRange(locationRange[1]);
    }
    compositionControllerWillUpdateAttachment(attachment) {
      return this.editor.recordUndoEntry("Edit Attachment", {
        context: attachment.id,
        consolidatable: true
      });
    }
    compositionControllerDidRequestRemovalOfAttachment(attachment) {
      return this.removeAttachment(attachment);
    }
    inputControllerWillHandleInput() {
      this.handlingInput = true;
      this.requestedRender = false;
    }
    inputControllerDidRequestRender() {
      this.requestedRender = true;
    }
    inputControllerDidHandleInput() {
      this.handlingInput = false;
      if (this.requestedRender) {
        this.requestedRender = false;
        return this.render();
      }
    }
    inputControllerDidAllowUnhandledInput() {
      return this.notifyEditorElement("change");
    }
    inputControllerDidRequestReparse() {
      return this.reparse();
    }
    inputControllerWillPerformTyping() {
      return this.recordTypingUndoEntry();
    }
    inputControllerWillPerformFormatting(attributeName) {
      return this.recordFormattingUndoEntry(attributeName);
    }
    inputControllerWillCutText() {
      return this.editor.recordUndoEntry("Cut");
    }
    inputControllerWillPaste(paste) {
      this.editor.recordUndoEntry("Paste");
      this.pasting = true;
      return this.notifyEditorElement("before-paste", {
        paste
      });
    }
    inputControllerDidPaste(paste) {
      paste.range = this.pastedRange;
      this.pastedRange = null;
      this.pasting = null;
      return this.notifyEditorElement("paste", {
        paste
      });
    }
    inputControllerWillMoveText() {
      return this.editor.recordUndoEntry("Move");
    }
    inputControllerWillAttachFiles() {
      return this.editor.recordUndoEntry("Drop Files");
    }
    inputControllerWillPerformUndo() {
      return this.editor.undo();
    }
    inputControllerWillPerformRedo() {
      return this.editor.redo();
    }
    inputControllerDidReceiveKeyboardCommand(keys) {
      return this.toolbarController.applyKeyboardCommand(keys);
    }
    inputControllerDidStartDrag() {
      this.locationRangeBeforeDrag = this.selectionManager.getLocationRange();
    }
    inputControllerDidReceiveDragOverPoint(point) {
      return this.selectionManager.setLocationRangeFromPointRange(point);
    }
    inputControllerDidCancelDrag() {
      this.selectionManager.setLocationRange(this.locationRangeBeforeDrag);
      this.locationRangeBeforeDrag = null;
    }
    locationRangeDidChange(locationRange) {
      this.composition.updateCurrentAttributes();
      this.updateCurrentActions();
      if (this.attachmentLocationRange && !rangesAreEqual(this.attachmentLocationRange, locationRange)) {
        this.composition.stopEditingAttachment();
      }
      return this.notifyEditorElement("selection-change");
    }
    toolbarDidClickButton() {
      if (!this.getLocationRange()) {
        return this.setLocationRange({
          index: 0,
          offset: 0
        });
      }
    }
    toolbarDidInvokeAction(actionName) {
      return this.invokeAction(actionName);
    }
    toolbarDidToggleAttribute(attributeName) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.toggleCurrentAttribute(attributeName);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarDidUpdateAttribute(attributeName, value) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.setCurrentAttribute(attributeName, value);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarDidRemoveAttribute(attributeName) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.removeCurrentAttribute(attributeName);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarWillShowDialog(dialogElement) {
      this.composition.expandSelectionForEditing();
      return this.freezeSelection();
    }
    toolbarDidShowDialog(dialogName) {
      return this.notifyEditorElement("toolbar-dialog-show", {
        dialogName
      });
    }
    toolbarDidHideDialog(dialogName) {
      this.thawSelection();
      this.editorElement.focus();
      return this.notifyEditorElement("toolbar-dialog-hide", {
        dialogName
      });
    }
    freezeSelection() {
      if (!this.selectionFrozen) {
        this.selectionManager.lock();
        this.composition.freezeSelection();
        this.selectionFrozen = true;
        return this.render();
      }
    }
    thawSelection() {
      if (this.selectionFrozen) {
        this.composition.thawSelection();
        this.selectionManager.unlock();
        this.selectionFrozen = false;
        return this.render();
      }
    }
    canInvokeAction(actionName) {
      if (this.actionIsExternal(actionName)) {
        return true;
      } else {
        var _this$actions$actionN, _this$actions$actionN2;
        return !!((_this$actions$actionN = this.actions[actionName]) !== null && _this$actions$actionN !== void 0 && (_this$actions$actionN2 = _this$actions$actionN.test) !== null && _this$actions$actionN2 !== void 0 && _this$actions$actionN2.call(this));
      }
    }
    invokeAction(actionName) {
      if (this.actionIsExternal(actionName)) {
        return this.notifyEditorElement("action-invoke", {
          actionName
        });
      } else {
        var _this$actions$actionN3, _this$actions$actionN4;
        return (_this$actions$actionN3 = this.actions[actionName]) === null || _this$actions$actionN3 === void 0 ? void 0 : (_this$actions$actionN4 = _this$actions$actionN3.perform) === null || _this$actions$actionN4 === void 0 ? void 0 : _this$actions$actionN4.call(this);
      }
    }
    actionIsExternal(actionName) {
      return /^x-./.test(actionName);
    }
    getCurrentActions() {
      const result = {};
      for (const actionName in this.actions) {
        result[actionName] = this.canInvokeAction(actionName);
      }
      return result;
    }
    updateCurrentActions() {
      const currentActions = this.getCurrentActions();
      if (!objectsAreEqual(currentActions, this.currentActions)) {
        this.currentActions = currentActions;
        this.toolbarController.updateActions(this.currentActions);
        return this.notifyEditorElement("actions-change", {
          actions: this.currentActions
        });
      }
    }
    runEditorFilters() {
      let snapshot = this.composition.getSnapshot();
      Array.from(this.editor.filters).forEach((filter) => {
        const {
          document: document2,
          selectedRange
        } = snapshot;
        snapshot = filter.call(this.editor, snapshot) || {};
        if (!snapshot.document) {
          snapshot.document = document2;
        }
        if (!snapshot.selectedRange) {
          snapshot.selectedRange = selectedRange;
        }
      });
      if (!snapshotsAreEqual(snapshot, this.composition.getSnapshot())) {
        return this.composition.loadSnapshot(snapshot);
      }
    }
    updateInputElement() {
      const element = this.compositionController.getSerializableElement();
      const value = serializeToContentType(element, "text/html");
      return this.editorElement.setInputElementValue(value);
    }
    notifyEditorElement(message, data) {
      switch (message) {
        case "document-change":
          this.documentChangedSinceLastRender = true;
          break;
        case "render":
          if (this.documentChangedSinceLastRender) {
            this.documentChangedSinceLastRender = false;
            this.notifyEditorElement("change");
          }
          break;
        case "change":
        case "attachment-add":
        case "attachment-edit":
        case "attachment-remove":
          this.updateInputElement();
          break;
      }
      return this.editorElement.notify(message, data);
    }
    removeAttachment(attachment) {
      this.editor.recordUndoEntry("Delete Attachment");
      this.composition.removeAttachment(attachment);
      return this.render();
    }
    recordFormattingUndoEntry(attributeName) {
      const blockConfig = getBlockConfig(attributeName);
      const locationRange = this.selectionManager.getLocationRange();
      if (blockConfig || !rangeIsCollapsed(locationRange)) {
        return this.editor.recordUndoEntry("Formatting", {
          context: this.getUndoContext(),
          consolidatable: true
        });
      }
    }
    recordTypingUndoEntry() {
      return this.editor.recordUndoEntry("Typing", {
        context: this.getUndoContext(this.currentAttributes),
        consolidatable: true
      });
    }
    getUndoContext() {
      for (var _len = arguments.length, context = new Array(_len), _key = 0; _key < _len; _key++) {
        context[_key] = arguments[_key];
      }
      return [this.getLocationContext(), this.getTimeContext(), ...Array.from(context)];
    }
    getLocationContext() {
      const locationRange = this.selectionManager.getLocationRange();
      if (rangeIsCollapsed(locationRange)) {
        return locationRange[0].index;
      } else {
        return locationRange;
      }
    }
    getTimeContext() {
      if (config.undoInterval > 0) {
        return Math.floor(new Date().getTime() / config.undoInterval);
      } else {
        return 0;
      }
    }
    isFocused() {
      var _this$editorElement$o;
      return this.editorElement === ((_this$editorElement$o = this.editorElement.ownerDocument) === null || _this$editorElement$o === void 0 ? void 0 : _this$editorElement$o.activeElement);
    }
    isFocusedInvisibly() {
      return this.isFocused() && !this.getLocationRange();
    }
    get actions() {
      return this.constructor.actions;
    }
  };
  _defineProperty(EditorController, "actions", {
    undo: {
      test() {
        return this.editor.canUndo();
      },
      perform() {
        return this.editor.undo();
      }
    },
    redo: {
      test() {
        return this.editor.canRedo();
      },
      perform() {
        return this.editor.redo();
      }
    },
    link: {
      test() {
        return this.editor.canActivateAttribute("href");
      }
    },
    increaseNestingLevel: {
      test() {
        return this.editor.canIncreaseNestingLevel();
      },
      perform() {
        return this.editor.increaseNestingLevel() && this.render();
      }
    },
    decreaseNestingLevel: {
      test() {
        return this.editor.canDecreaseNestingLevel();
      },
      perform() {
        return this.editor.decreaseNestingLevel() && this.render();
      }
    },
    attachFiles: {
      test() {
        return true;
      },
      perform() {
        return config.input.pickFiles(this.editor.insertFiles);
      }
    }
  });
  EditorController.proxyMethod("getSelectionManager().setLocationRange");
  EditorController.proxyMethod("getSelectionManager().getLocationRange");
  installDefaultCSSForTagName("trix-toolbar", "%t {\n  display: block;\n}\n\n%t {\n  white-space: nowrap;\n}\n\n%t [data-trix-dialog] {\n  display: none;\n}\n\n%t [data-trix-dialog][data-trix-active] {\n  display: block;\n}\n\n%t [data-trix-dialog] [data-trix-validate]:invalid {\n  background-color: #ffdddd;\n}");
  var TrixToolbarElement = class extends HTMLElement {
    connectedCallback() {
      if (this.innerHTML === "") {
        this.innerHTML = config.toolbar.getDefaultHTML();
      }
    }
  };
  window.customElements.define("trix-toolbar", TrixToolbarElement);
  var id = 0;
  var autofocus = function(element) {
    if (!document.querySelector(":focus")) {
      if (element.hasAttribute("autofocus") && document.querySelector("[autofocus]") === element) {
        return element.focus();
      }
    }
  };
  var makeEditable = function(element) {
    if (element.hasAttribute("contenteditable")) {
      return;
    }
    element.setAttribute("contenteditable", "");
    return handleEventOnce("focus", {
      onElement: element,
      withCallback() {
        return configureContentEditable(element);
      }
    });
  };
  var configureContentEditable = function(element) {
    disableObjectResizing(element);
    return setDefaultParagraphSeparator(element);
  };
  var disableObjectResizing = function(element) {
    var _document$queryComman, _document;
    if ((_document$queryComman = (_document = document).queryCommandSupported) !== null && _document$queryComman !== void 0 && _document$queryComman.call(_document, "enableObjectResizing")) {
      document.execCommand("enableObjectResizing", false, false);
      return handleEvent("mscontrolselect", {
        onElement: element,
        preventDefault: true
      });
    }
  };
  var setDefaultParagraphSeparator = function(element) {
    var _document$queryComman2, _document2;
    if ((_document$queryComman2 = (_document2 = document).queryCommandSupported) !== null && _document$queryComman2 !== void 0 && _document$queryComman2.call(_document2, "DefaultParagraphSeparator")) {
      const {
        tagName: tagName2
      } = config.blockAttributes.default;
      if (["div", "p"].includes(tagName2)) {
        return document.execCommand("DefaultParagraphSeparator", false, tagName2);
      }
    }
  };
  var addAccessibilityRole = function(element) {
    if (element.hasAttribute("role")) {
      return;
    }
    return element.setAttribute("role", "textbox");
  };
  var ensureAriaLabel = function(element) {
    if (element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby")) {
      return;
    }
    const update = function() {
      const texts = Array.from(element.labels).map((label) => {
        if (!label.contains(element))
          return label.textContent;
      }).filter((text2) => text2);
      const text = texts.join(" ");
      if (text) {
        return element.setAttribute("aria-label", text);
      } else {
        return element.removeAttribute("aria-label");
      }
    };
    update();
    return handleEvent("focus", {
      onElement: element,
      withCallback: update
    });
  };
  var cursorTargetStyles = function() {
    if (config.browser.forcesObjectResizing) {
      return {
        display: "inline",
        width: "auto"
      };
    } else {
      return {
        display: "inline-block",
        width: "1px"
      };
    }
  }();
  installDefaultCSSForTagName("trix-editor", "%t {\n    display: block;\n}\n\n%t:empty:not(:focus)::before {\n    content: attr(placeholder);\n    color: graytext;\n    cursor: text;\n    pointer-events: none;\n    white-space: pre-line;\n}\n\n%t a[contenteditable=false] {\n    cursor: text;\n}\n\n%t img {\n    max-width: 100%;\n    height: auto;\n}\n\n%t ".concat(attachmentSelector, " figcaption textarea {\n    resize: none;\n}\n\n%t ").concat(attachmentSelector, " figcaption textarea.trix-autoresize-clone {\n    position: absolute;\n    left: -9999px;\n    max-height: 0px;\n}\n\n%t ").concat(attachmentSelector, " figcaption[data-trix-placeholder]:empty::before {\n    content: attr(data-trix-placeholder);\n    color: graytext;\n}\n\n%t [data-trix-cursor-target] {\n    display: ").concat(cursorTargetStyles.display, " !important;\n    width: ").concat(cursorTargetStyles.width, " !important;\n    padding: 0 !important;\n    margin: 0 !important;\n    border: none !important;\n}\n\n%t [data-trix-cursor-target=left] {\n    vertical-align: top !important;\n    margin-left: -1px !important;\n}\n\n%t [data-trix-cursor-target=right] {\n    vertical-align: bottom !important;\n    margin-right: -1px !important;\n}"));
  var TrixEditorElement = class extends HTMLElement {
    get trixId() {
      if (this.hasAttribute("trix-id")) {
        return this.getAttribute("trix-id");
      } else {
        this.setAttribute("trix-id", ++id);
        return this.trixId;
      }
    }
    get labels() {
      const labels = [];
      if (this.id && this.ownerDocument) {
        labels.push(...Array.from(this.ownerDocument.querySelectorAll("label[for='".concat(this.id, "']")) || []));
      }
      const label = findClosestElementFromNode(this, {
        matchingSelector: "label"
      });
      if (label) {
        if ([this, null].includes(label.control)) {
          labels.push(label);
        }
      }
      return labels;
    }
    get toolbarElement() {
      if (this.hasAttribute("toolbar")) {
        var _this$ownerDocument;
        return (_this$ownerDocument = this.ownerDocument) === null || _this$ownerDocument === void 0 ? void 0 : _this$ownerDocument.getElementById(this.getAttribute("toolbar"));
      } else if (this.parentNode) {
        const toolbarId = "trix-toolbar-".concat(this.trixId);
        this.setAttribute("toolbar", toolbarId);
        const element = makeElement("trix-toolbar", {
          id: toolbarId
        });
        this.parentNode.insertBefore(element, this);
        return element;
      } else {
        return void 0;
      }
    }
    get form() {
      var _this$inputElement;
      return (_this$inputElement = this.inputElement) === null || _this$inputElement === void 0 ? void 0 : _this$inputElement.form;
    }
    get inputElement() {
      if (this.hasAttribute("input")) {
        var _this$ownerDocument2;
        return (_this$ownerDocument2 = this.ownerDocument) === null || _this$ownerDocument2 === void 0 ? void 0 : _this$ownerDocument2.getElementById(this.getAttribute("input"));
      } else if (this.parentNode) {
        const inputId = "trix-input-".concat(this.trixId);
        this.setAttribute("input", inputId);
        const element = makeElement("input", {
          type: "hidden",
          id: inputId
        });
        this.parentNode.insertBefore(element, this.nextElementSibling);
        return element;
      } else {
        return void 0;
      }
    }
    get editor() {
      var _this$editorControlle;
      return (_this$editorControlle = this.editorController) === null || _this$editorControlle === void 0 ? void 0 : _this$editorControlle.editor;
    }
    get name() {
      var _this$inputElement2;
      return (_this$inputElement2 = this.inputElement) === null || _this$inputElement2 === void 0 ? void 0 : _this$inputElement2.name;
    }
    get value() {
      var _this$inputElement3;
      return (_this$inputElement3 = this.inputElement) === null || _this$inputElement3 === void 0 ? void 0 : _this$inputElement3.value;
    }
    set value(defaultValue) {
      var _this$editor;
      this.defaultValue = defaultValue;
      (_this$editor = this.editor) === null || _this$editor === void 0 ? void 0 : _this$editor.loadHTML(this.defaultValue);
    }
    notify(message, data) {
      if (this.editorController) {
        return triggerEvent("trix-".concat(message), {
          onElement: this,
          attributes: data
        });
      }
    }
    setInputElementValue(value) {
      if (this.inputElement) {
        this.inputElement.value = value;
      }
    }
    connectedCallback() {
      if (!this.hasAttribute("data-trix-internal")) {
        makeEditable(this);
        addAccessibilityRole(this);
        ensureAriaLabel(this);
        if (!this.editorController) {
          triggerEvent("trix-before-initialize", {
            onElement: this
          });
          this.editorController = new EditorController({
            editorElement: this,
            html: this.defaultValue = this.value
          });
          requestAnimationFrame(() => triggerEvent("trix-initialize", {
            onElement: this
          }));
        }
        this.editorController.registerSelectionManager();
        this.registerResetListener();
        this.registerClickListener();
        autofocus(this);
      }
    }
    disconnectedCallback() {
      var _this$editorControlle2;
      (_this$editorControlle2 = this.editorController) === null || _this$editorControlle2 === void 0 ? void 0 : _this$editorControlle2.unregisterSelectionManager();
      this.unregisterResetListener();
      return this.unregisterClickListener();
    }
    registerResetListener() {
      this.resetListener = this.resetBubbled.bind(this);
      return window.addEventListener("reset", this.resetListener, false);
    }
    unregisterResetListener() {
      return window.removeEventListener("reset", this.resetListener, false);
    }
    registerClickListener() {
      this.clickListener = this.clickBubbled.bind(this);
      return window.addEventListener("click", this.clickListener, false);
    }
    unregisterClickListener() {
      return window.removeEventListener("click", this.clickListener, false);
    }
    resetBubbled(event) {
      if (event.defaultPrevented)
        return;
      if (event.target !== this.form)
        return;
      return this.reset();
    }
    clickBubbled(event) {
      if (event.defaultPrevented)
        return;
      if (this.contains(event.target))
        return;
      const label = findClosestElementFromNode(event.target, {
        matchingSelector: "label"
      });
      if (!label)
        return;
      if (!Array.from(this.labels).includes(label))
        return;
      return this.focus();
    }
    reset() {
      this.value = this.defaultValue;
    }
  };
  window.customElements.define("trix-editor", TrixEditorElement);

  // node_modules/@rails/actiontext/app/assets/javascripts/actiontext.js
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var activestorage = { exports: {} };
  (function(module, exports) {
    (function(global2, factory) {
      factory(exports);
    })(commonjsGlobal, function(exports2) {
      var sparkMd5 = {
        exports: {}
      };
      (function(module2, exports3) {
        (function(factory) {
          {
            module2.exports = factory();
          }
        })(function(undefined$1) {
          var hex_chr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
          function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a += (b & c | ~b & d) + k[0] - 680876936 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[1] - 389564586 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[2] + 606105819 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[4] - 176418897 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[7] - 45705983 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[10] - 42063 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[13] - 40341101 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & d | c & ~d) + k[1] - 165796510 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[11] + 643717713 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[0] - 373897302 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[5] - 701558691 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[10] + 38016083 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[15] - 660478335 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[4] - 405537848 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[9] + 568446438 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[3] - 187363961 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[2] - 51403784 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b ^ c ^ d) + k[5] - 378558 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[14] - 35309556 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[7] - 155497632 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[13] + 681279174 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[0] - 358537222 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[3] - 722521979 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[6] + 76029189 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[9] - 640364487 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[12] - 421815835 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[15] + 530742520 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[2] - 995338651 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            x[0] = a + x[0] | 0;
            x[1] = b + x[1] | 0;
            x[2] = c + x[2] | 0;
            x[3] = d + x[3] | 0;
          }
          function md5blk(s) {
            var md5blks = [], i;
            for (i = 0; i < 64; i += 4) {
              md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
            }
            return md5blks;
          }
          function md5blk_array(a) {
            var md5blks = [], i;
            for (i = 0; i < 64; i += 4) {
              md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
            }
            return md5blks;
          }
          function md51(s) {
            var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
            for (i = 64; i <= n; i += 64) {
              md5cycle(state, md5blk(s.substring(i - 64, i)));
            }
            s = s.substring(i - 64);
            length = s.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
            }
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(state, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(state, tail);
            return state;
          }
          function md51_array(a) {
            var n = a.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
            for (i = 64; i <= n; i += 64) {
              md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
            }
            a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
            length = a.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= a[i] << (i % 4 << 3);
            }
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(state, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(state, tail);
            return state;
          }
          function rhex(n) {
            var s = "", j;
            for (j = 0; j < 4; j += 1) {
              s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
            }
            return s;
          }
          function hex(x) {
            var i;
            for (i = 0; i < x.length; i += 1) {
              x[i] = rhex(x[i]);
            }
            return x.join("");
          }
          if (hex(md51("hello")) !== "5d41402abc4b2a76b9719d911017c592")
            ;
          if (typeof ArrayBuffer !== "undefined" && !ArrayBuffer.prototype.slice) {
            (function() {
              function clamp(val, length) {
                val = val | 0 || 0;
                if (val < 0) {
                  return Math.max(val + length, 0);
                }
                return Math.min(val, length);
              }
              ArrayBuffer.prototype.slice = function(from, to) {
                var length = this.byteLength, begin = clamp(from, length), end2 = length, num, target, targetArray, sourceArray;
                if (to !== undefined$1) {
                  end2 = clamp(to, length);
                }
                if (begin > end2) {
                  return new ArrayBuffer(0);
                }
                num = end2 - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);
                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);
                return target;
              };
            })();
          }
          function toUtf8(str) {
            if (/[\u0080-\uFFFF]/.test(str)) {
              str = unescape(encodeURIComponent(str));
            }
            return str;
          }
          function utf8Str2ArrayBuffer(str, returnUInt8Array) {
            var length = str.length, buff = new ArrayBuffer(length), arr = new Uint8Array(buff), i;
            for (i = 0; i < length; i += 1) {
              arr[i] = str.charCodeAt(i);
            }
            return returnUInt8Array ? arr : buff;
          }
          function arrayBuffer2Utf8Str(buff) {
            return String.fromCharCode.apply(null, new Uint8Array(buff));
          }
          function concatenateArrayBuffers(first, second, returnUInt8Array) {
            var result = new Uint8Array(first.byteLength + second.byteLength);
            result.set(new Uint8Array(first));
            result.set(new Uint8Array(second), first.byteLength);
            return returnUInt8Array ? result : result.buffer;
          }
          function hexToBinaryString(hex2) {
            var bytes = [], length = hex2.length, x;
            for (x = 0; x < length - 1; x += 2) {
              bytes.push(parseInt(hex2.substr(x, 2), 16));
            }
            return String.fromCharCode.apply(String, bytes);
          }
          function SparkMD52() {
            this.reset();
          }
          SparkMD52.prototype.append = function(str) {
            this.appendBinary(toUtf8(str));
            return this;
          };
          SparkMD52.prototype.appendBinary = function(contents) {
            this._buff += contents;
            this._length += contents.length;
            var length = this._buff.length, i;
            for (i = 64; i <= length; i += 64) {
              md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
            }
            this._buff = this._buff.substring(i - 64);
            return this;
          };
          SparkMD52.prototype.end = function(raw) {
            var buff = this._buff, length = buff.length, i, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ret;
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
            }
            this._finish(tail, length);
            ret = hex(this._hash);
            if (raw) {
              ret = hexToBinaryString(ret);
            }
            this.reset();
            return ret;
          };
          SparkMD52.prototype.reset = function() {
            this._buff = "";
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];
            return this;
          };
          SparkMD52.prototype.getState = function() {
            return {
              buff: this._buff,
              length: this._length,
              hash: this._hash.slice()
            };
          };
          SparkMD52.prototype.setState = function(state) {
            this._buff = state.buff;
            this._length = state.length;
            this._hash = state.hash;
            return this;
          };
          SparkMD52.prototype.destroy = function() {
            delete this._hash;
            delete this._buff;
            delete this._length;
          };
          SparkMD52.prototype._finish = function(tail, length) {
            var i = length, tmp, lo, hi;
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(this._hash, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = this._length * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(this._hash, tail);
          };
          SparkMD52.hash = function(str, raw) {
            return SparkMD52.hashBinary(toUtf8(str), raw);
          };
          SparkMD52.hashBinary = function(content, raw) {
            var hash3 = md51(content), ret = hex(hash3);
            return raw ? hexToBinaryString(ret) : ret;
          };
          SparkMD52.ArrayBuffer = function() {
            this.reset();
          };
          SparkMD52.ArrayBuffer.prototype.append = function(arr) {
            var buff = concatenateArrayBuffers(this._buff.buffer, arr, true), length = buff.length, i;
            this._length += arr.byteLength;
            for (i = 64; i <= length; i += 64) {
              md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
            }
            this._buff = i - 64 < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
            return this;
          };
          SparkMD52.ArrayBuffer.prototype.end = function(raw) {
            var buff = this._buff, length = buff.length, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], i, ret;
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= buff[i] << (i % 4 << 3);
            }
            this._finish(tail, length);
            ret = hex(this._hash);
            if (raw) {
              ret = hexToBinaryString(ret);
            }
            this.reset();
            return ret;
          };
          SparkMD52.ArrayBuffer.prototype.reset = function() {
            this._buff = new Uint8Array(0);
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];
            return this;
          };
          SparkMD52.ArrayBuffer.prototype.getState = function() {
            var state = SparkMD52.prototype.getState.call(this);
            state.buff = arrayBuffer2Utf8Str(state.buff);
            return state;
          };
          SparkMD52.ArrayBuffer.prototype.setState = function(state) {
            state.buff = utf8Str2ArrayBuffer(state.buff, true);
            return SparkMD52.prototype.setState.call(this, state);
          };
          SparkMD52.ArrayBuffer.prototype.destroy = SparkMD52.prototype.destroy;
          SparkMD52.ArrayBuffer.prototype._finish = SparkMD52.prototype._finish;
          SparkMD52.ArrayBuffer.hash = function(arr, raw) {
            var hash3 = md51_array(new Uint8Array(arr)), ret = hex(hash3);
            return raw ? hexToBinaryString(ret) : ret;
          };
          return SparkMD52;
        });
      })(sparkMd5);
      var SparkMD5 = sparkMd5.exports;
      const fileSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
      class FileChecksum {
        static create(file, callback) {
          const instance = new FileChecksum(file);
          instance.create(callback);
        }
        constructor(file) {
          this.file = file;
          this.chunkSize = 2097152;
          this.chunkCount = Math.ceil(this.file.size / this.chunkSize);
          this.chunkIndex = 0;
        }
        create(callback) {
          this.callback = callback;
          this.md5Buffer = new SparkMD5.ArrayBuffer();
          this.fileReader = new FileReader();
          this.fileReader.addEventListener("load", (event) => this.fileReaderDidLoad(event));
          this.fileReader.addEventListener("error", (event) => this.fileReaderDidError(event));
          this.readNextChunk();
        }
        fileReaderDidLoad(event) {
          this.md5Buffer.append(event.target.result);
          if (!this.readNextChunk()) {
            const binaryDigest = this.md5Buffer.end(true);
            const base64digest = btoa(binaryDigest);
            this.callback(null, base64digest);
          }
        }
        fileReaderDidError(event) {
          this.callback(`Error reading ${this.file.name}`);
        }
        readNextChunk() {
          if (this.chunkIndex < this.chunkCount || this.chunkIndex == 0 && this.chunkCount == 0) {
            const start4 = this.chunkIndex * this.chunkSize;
            const end2 = Math.min(start4 + this.chunkSize, this.file.size);
            const bytes = fileSlice.call(this.file, start4, end2);
            this.fileReader.readAsArrayBuffer(bytes);
            this.chunkIndex++;
            return true;
          } else {
            return false;
          }
        }
      }
      function getMetaValue(name) {
        const element = findElement(document.head, `meta[name="${name}"]`);
        if (element) {
          return element.getAttribute("content");
        }
      }
      function findElements(root, selector) {
        if (typeof root == "string") {
          selector = root;
          root = document;
        }
        const elements = root.querySelectorAll(selector);
        return toArray(elements);
      }
      function findElement(root, selector) {
        if (typeof root == "string") {
          selector = root;
          root = document;
        }
        return root.querySelector(selector);
      }
      function dispatchEvent2(element, type, eventInit = {}) {
        const { disabled } = element;
        const { bubbles, cancelable, detail } = eventInit;
        const event = document.createEvent("Event");
        event.initEvent(type, bubbles || true, cancelable || true);
        event.detail = detail || {};
        try {
          element.disabled = false;
          element.dispatchEvent(event);
        } finally {
          element.disabled = disabled;
        }
        return event;
      }
      function toArray(value) {
        if (Array.isArray(value)) {
          return value;
        } else if (Array.from) {
          return Array.from(value);
        } else {
          return [].slice.call(value);
        }
      }
      class BlobRecord {
        constructor(file, checksum, url) {
          this.file = file;
          this.attributes = {
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            byte_size: file.size,
            checksum
          };
          this.xhr = new XMLHttpRequest();
          this.xhr.open("POST", url, true);
          this.xhr.responseType = "json";
          this.xhr.setRequestHeader("Content-Type", "application/json");
          this.xhr.setRequestHeader("Accept", "application/json");
          this.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
          const csrfToken = getMetaValue("csrf-token");
          if (csrfToken != void 0) {
            this.xhr.setRequestHeader("X-CSRF-Token", csrfToken);
          }
          this.xhr.addEventListener("load", (event) => this.requestDidLoad(event));
          this.xhr.addEventListener("error", (event) => this.requestDidError(event));
        }
        get status() {
          return this.xhr.status;
        }
        get response() {
          const { responseType, response } = this.xhr;
          if (responseType == "json") {
            return response;
          } else {
            return JSON.parse(response);
          }
        }
        create(callback) {
          this.callback = callback;
          this.xhr.send(JSON.stringify({
            blob: this.attributes
          }));
        }
        requestDidLoad(event) {
          if (this.status >= 200 && this.status < 300) {
            const { response } = this;
            const { direct_upload } = response;
            delete response.direct_upload;
            this.attributes = response;
            this.directUploadData = direct_upload;
            this.callback(null, this.toJSON());
          } else {
            this.requestDidError(event);
          }
        }
        requestDidError(event) {
          this.callback(`Error creating Blob for "${this.file.name}". Status: ${this.status}`);
        }
        toJSON() {
          const result = {};
          for (const key in this.attributes) {
            result[key] = this.attributes[key];
          }
          return result;
        }
      }
      class BlobUpload {
        constructor(blob) {
          this.blob = blob;
          this.file = blob.file;
          const { url, headers } = blob.directUploadData;
          this.xhr = new XMLHttpRequest();
          this.xhr.open("PUT", url, true);
          this.xhr.responseType = "text";
          for (const key in headers) {
            this.xhr.setRequestHeader(key, headers[key]);
          }
          this.xhr.addEventListener("load", (event) => this.requestDidLoad(event));
          this.xhr.addEventListener("error", (event) => this.requestDidError(event));
        }
        create(callback) {
          this.callback = callback;
          this.xhr.send(this.file.slice());
        }
        requestDidLoad(event) {
          const { status, response } = this.xhr;
          if (status >= 200 && status < 300) {
            this.callback(null, response);
          } else {
            this.requestDidError(event);
          }
        }
        requestDidError(event) {
          this.callback(`Error storing "${this.file.name}". Status: ${this.xhr.status}`);
        }
      }
      let id2 = 0;
      class DirectUpload {
        constructor(file, url, delegate) {
          this.id = ++id2;
          this.file = file;
          this.url = url;
          this.delegate = delegate;
        }
        create(callback) {
          FileChecksum.create(this.file, (error2, checksum) => {
            if (error2) {
              callback(error2);
              return;
            }
            const blob = new BlobRecord(this.file, checksum, this.url);
            notify(this.delegate, "directUploadWillCreateBlobWithXHR", blob.xhr);
            blob.create((error3) => {
              if (error3) {
                callback(error3);
              } else {
                const upload = new BlobUpload(blob);
                notify(this.delegate, "directUploadWillStoreFileWithXHR", upload.xhr);
                upload.create((error4) => {
                  if (error4) {
                    callback(error4);
                  } else {
                    callback(null, blob.toJSON());
                  }
                });
              }
            });
          });
        }
      }
      function notify(object2, methodName, ...messages) {
        if (object2 && typeof object2[methodName] == "function") {
          return object2[methodName](...messages);
        }
      }
      class DirectUploadController {
        constructor(input2, file) {
          this.input = input2;
          this.file = file;
          this.directUpload = new DirectUpload(this.file, this.url, this);
          this.dispatch("initialize");
        }
        start(callback) {
          const hiddenInput = document.createElement("input");
          hiddenInput.type = "hidden";
          hiddenInput.name = this.input.name;
          this.input.insertAdjacentElement("beforebegin", hiddenInput);
          this.dispatch("start");
          this.directUpload.create((error2, attributes2) => {
            if (error2) {
              hiddenInput.parentNode.removeChild(hiddenInput);
              this.dispatchError(error2);
            } else {
              hiddenInput.value = attributes2.signed_id;
            }
            this.dispatch("end");
            callback(error2);
          });
        }
        uploadRequestDidProgress(event) {
          const progress = event.loaded / event.total * 100;
          if (progress) {
            this.dispatch("progress", {
              progress
            });
          }
        }
        get url() {
          return this.input.getAttribute("data-direct-upload-url");
        }
        dispatch(name, detail = {}) {
          detail.file = this.file;
          detail.id = this.directUpload.id;
          return dispatchEvent2(this.input, `direct-upload:${name}`, {
            detail
          });
        }
        dispatchError(error2) {
          const event = this.dispatch("error", {
            error: error2
          });
          if (!event.defaultPrevented) {
            alert(error2);
          }
        }
        directUploadWillCreateBlobWithXHR(xhr) {
          this.dispatch("before-blob-request", {
            xhr
          });
        }
        directUploadWillStoreFileWithXHR(xhr) {
          this.dispatch("before-storage-request", {
            xhr
          });
          xhr.upload.addEventListener("progress", (event) => this.uploadRequestDidProgress(event));
        }
      }
      const inputSelector = "input[type=file][data-direct-upload-url]:not([disabled])";
      class DirectUploadsController {
        constructor(form) {
          this.form = form;
          this.inputs = findElements(form, inputSelector).filter((input2) => input2.files.length);
        }
        start(callback) {
          const controllers = this.createDirectUploadControllers();
          const startNextController = () => {
            const controller = controllers.shift();
            if (controller) {
              controller.start((error2) => {
                if (error2) {
                  callback(error2);
                  this.dispatch("end");
                } else {
                  startNextController();
                }
              });
            } else {
              callback();
              this.dispatch("end");
            }
          };
          this.dispatch("start");
          startNextController();
        }
        createDirectUploadControllers() {
          const controllers = [];
          this.inputs.forEach((input2) => {
            toArray(input2.files).forEach((file) => {
              const controller = new DirectUploadController(input2, file);
              controllers.push(controller);
            });
          });
          return controllers;
        }
        dispatch(name, detail = {}) {
          return dispatchEvent2(this.form, `direct-uploads:${name}`, {
            detail
          });
        }
      }
      const processingAttribute = "data-direct-uploads-processing";
      const submitButtonsByForm = /* @__PURE__ */ new WeakMap();
      let started = false;
      function start3() {
        if (!started) {
          started = true;
          document.addEventListener("click", didClick, true);
          document.addEventListener("submit", didSubmitForm, true);
          document.addEventListener("ajax:before", didSubmitRemoteElement);
        }
      }
      function didClick(event) {
        const { target } = event;
        if ((target.tagName == "INPUT" || target.tagName == "BUTTON") && target.type == "submit" && target.form) {
          submitButtonsByForm.set(target.form, target);
        }
      }
      function didSubmitForm(event) {
        handleFormSubmissionEvent(event);
      }
      function didSubmitRemoteElement(event) {
        if (event.target.tagName == "FORM") {
          handleFormSubmissionEvent(event);
        }
      }
      function handleFormSubmissionEvent(event) {
        const form = event.target;
        if (form.hasAttribute(processingAttribute)) {
          event.preventDefault();
          return;
        }
        const controller = new DirectUploadsController(form);
        const { inputs } = controller;
        if (inputs.length) {
          event.preventDefault();
          form.setAttribute(processingAttribute, "");
          inputs.forEach(disable);
          controller.start((error2) => {
            form.removeAttribute(processingAttribute);
            if (error2) {
              inputs.forEach(enable);
            } else {
              submitForm(form);
            }
          });
        }
      }
      function submitForm(form) {
        let button = submitButtonsByForm.get(form) || findElement(form, "input[type=submit], button[type=submit]");
        if (button) {
          const { disabled } = button;
          button.disabled = false;
          button.focus();
          button.click();
          button.disabled = disabled;
        } else {
          button = document.createElement("input");
          button.type = "submit";
          button.style.display = "none";
          form.appendChild(button);
          button.click();
          form.removeChild(button);
        }
        submitButtonsByForm.delete(form);
      }
      function disable(input2) {
        input2.disabled = true;
      }
      function enable(input2) {
        input2.disabled = false;
      }
      function autostart() {
        if (window.ActiveStorage) {
          start3();
        }
      }
      setTimeout(autostart, 1);
      exports2.DirectUpload = DirectUpload;
      exports2.start = start3;
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
    });
  })(activestorage, activestorage.exports);
  var AttachmentUpload = class {
    constructor(attachment, element) {
      this.attachment = attachment;
      this.element = element;
      this.directUpload = new activestorage.exports.DirectUpload(attachment.file, this.directUploadUrl, this);
    }
    start() {
      this.directUpload.create(this.directUploadDidComplete.bind(this));
    }
    directUploadWillStoreFileWithXHR(xhr) {
      xhr.upload.addEventListener("progress", (event) => {
        const progress = event.loaded / event.total * 100;
        this.attachment.setUploadProgress(progress);
      });
    }
    directUploadDidComplete(error2, attributes2) {
      if (error2) {
        throw new Error(`Direct upload failed: ${error2}`);
      }
      this.attachment.setAttributes({
        sgid: attributes2.attachable_sgid,
        url: this.createBlobUrl(attributes2.signed_id, attributes2.filename)
      });
    }
    createBlobUrl(signedId, filename) {
      return this.blobUrlTemplate.replace(":signed_id", signedId).replace(":filename", encodeURIComponent(filename));
    }
    get directUploadUrl() {
      return this.element.dataset.directUploadUrl;
    }
    get blobUrlTemplate() {
      return this.element.dataset.blobUrlTemplate;
    }
  };
  addEventListener("trix-attachment-add", (event) => {
    const { attachment, target } = event;
    if (attachment.file) {
      const upload = new AttachmentUpload(attachment, target);
      upload.start();
    }
  });
})();
/*!
  * Bootstrap v5.2.1 (https://getbootstrap.com/)
  * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
//# sourceMappingURL=assets/application.js.map
