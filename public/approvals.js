// approvals.js — shared helpers, load this before your page-specific script
// via: <script src="./approvals.js"></script>

var ApprovalsShared = (function () {
  function getOverallStatus(request) {
    if (!request || !request.approvers || request.approvers.length === 0)
      return "none";
    var declined = request.approvers.some(function (a) {
      return a.status === "declined";
    });
    if (declined) return "declined";
    var allApproved = request.approvers.every(function (a) {
      return a.status === "approved";
    });
    if (allApproved) return "approved";
    return "pending";
  }

  function approvedCount(request) {
    if (!request) return 0;
    return request.approvers.filter(function (a) {
      return a.status === "approved";
    }).length;
  }

  function initialsFor(fullName) {
    if (!fullName) return "?";
    var parts = fullName.trim().split(/\s+/);
    // Secure bounds check to ensure the first character exists
    var first = parts[0] ? parts[0][0] : "?";
    var last =
      parts.length > 1 && parts[parts.length - 1]
        ? parts[parts.length - 1][0]
        : "";
    return (first + last).toUpperCase();
  }

  function avatarHtml(member) {
    // member: { avatarUrl, fullName, initials, id, colorSeed }
    if (!member)
      return '<div class="avatar-fallback" style="background:#7a869a">?</div>';

    // 1. If a valid avatar URL is present, use the image element
    if (member.avatarUrl && member.avatarUrl.trim() !== "") {
      return (
        '<img class="avatar-img" src="' +
        member.avatarUrl +
        '" alt="' +
        (member.fullName || "") +
        "\" onerror=\"this.style.display='none'; this.nextElementSibling.style.display='flex';\" />" +
        // Hidden fallback div right behind it just in case the avatarUrl fails to load (404)
        '<div class="avatar-fallback" style="background:#7a869a; display:none;">' +
        initialsFor(member.fullName) +
        "</div>"
      );
    }

    // 2. Otherwise, fall back to a beautifully colored initial circle
    var colors = [
      "#579dff", // Blue
      "#4bce97", // Green
      "#e774bb", // Pink
      "#f5cd47", // Yellow
      "#f87168", // Red
      "#9f8fef", // Purple
    ];

    // Fallback seed calculation to prevent crashes if id or fullName are missing
    var identifier = member.id || member.fullName || String(Math.random());
    var seed = identifier.split("").reduce(function (a, c) {
      return a + c.charCodeAt(0);
    }, 0);

    var bg = colors[seed % colors.length];
    return (
      '<div class="avatar-fallback" style="background:' +
      bg +
      '">' +
      initialsFor(member.fullName) +
      "</div>"
    );
  }

  function fetchCardRequest(t) {
    return t.get("card", "shared", "approvalRequest");
  }

  function saveCardRequest(t, request) {
    return t.set("card", "shared", "approvalRequest", request);
  }

  function removeCardRequest(t) {
    return t.remove("card", "shared", "approvalRequest");
  }

  function countPendingForMember(cards, memberId, pluginId) {
    if (!cards || !memberId || !pluginId) return 0;
    var count = 0;

    cards.forEach(function (card) {
      if (!card.pluginData) return;

      var entry = card.pluginData.find(function (pd) {
        return pd.idPlugin === pluginId;
      });
      if (!entry) return;

      var parsed;
      try {
        parsed = JSON.parse(entry.value);
      } catch (e) {
        return;
      }

      var request =
        (parsed && parsed.approvalRequest) ||
        (parsed && parsed.shared && parsed.shared.approvalRequest);
      if (!request || !request.approvers) return;

      var mine = request.approvers.some(function (a) {
        return a.id === memberId && a.status === "pending";
      });
      if (mine) count += 1;
    });

    return count;
  }

  function timeAgo(timestamp) {
    if (!timestamp) return "";
    var seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";

    var units = [
      { label: "year", secs: 31536000 },
      { label: "month", secs: 2592000 },
      { label: "day", secs: 86400 },
      { label: "hour", secs: 3600 },
      { label: "minute", secs: 60 },
    ];

    for (var i = 0; i < units.length; i++) {
      var count = Math.floor(seconds / units[i].secs);
      if (count >= 1) {
        return count + " " + units[i].label + (count > 1 ? "s" : "") + " ago";
      }
    }
    return "just now";
  }

  function getPendingRequestsForMember(cards, memberId, pluginId) {
    if (!cards || !memberId || !pluginId) return [];
    var results = [];

    cards.forEach(function (card) {
      if (!card.pluginData) return;

      var entry = card.pluginData.find(function (pd) {
        return pd.idPlugin === pluginId;
      });
      if (!entry) return;

      var parsed;
      try {
        parsed = JSON.parse(entry.value);
      } catch (e) {
        return;
      }

      var request =
        (parsed && parsed.approvalRequest) ||
        (parsed && parsed.shared && parsed.shared.approvalRequest);
      if (!request || !request.approvers) return;

      var mine = request.approvers.find(function (a) {
        return a.id === memberId && a.status === "pending";
      });
      if (!mine) return;

      results.push({
        cardId: card.id,
        cardName: card.name,
        cardShortLink: card.shortLink,
        requesterName: request.requesterName,
        createdAt: request.createdAt,
      });
    });

    results.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return results;
  }

  function parsePluginEntry(entry) {
    // Reads a raw card pluginData entry and returns both the request object
    // and a serialize() function that writes an updated request back into
    // the *same* JSON shape it was found in (either the flat
    // {approvalRequest} form or the {shared: {approvalRequest}} form that
    // t.set()/t.get() use). This avoids ever guessing the "correct" shape —
    // whatever shape is already on the card is the shape we preserve.
    var parsed;
    try {
      parsed = JSON.parse(entry.value);
    } catch (e) {
      return null;
    }

    if (parsed && parsed.approvalRequest) {
      return {
        request: parsed.approvalRequest,
        serialize: function (updatedRequest) {
          var clone = JSON.parse(JSON.stringify(parsed));
          clone.approvalRequest = updatedRequest;
          return JSON.stringify(clone);
        },
      };
    }

    if (parsed && parsed.shared && parsed.shared.approvalRequest) {
      return {
        request: parsed.shared.approvalRequest,
        serialize: function (updatedRequest) {
          var clone = JSON.parse(JSON.stringify(parsed));
          clone.shared.approvalRequest = updatedRequest;
          return JSON.stringify(clone);
        },
      };
    }

    return null;
  }

  function respondToRequestRest(opts) {
    // opts: { cardId, apiKey, token, pluginId, memberId, newStatus }
    // Does a read-modify-write against the REST API, since this list is
    // board-scoped and has no card-context iframe to use t.set()/t.get() with.
    var base =
      "https://api.trello.com/1/cards/" +
      encodeURIComponent(opts.cardId) +
      "/pluginData?key=" +
      opts.apiKey +
      "&token=" +
      encodeURIComponent(opts.token);

    return fetch(base)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to fetch card plugin data");
        return res.json();
      })
      .then(function (entries) {
        var entry = entries.find(function (e) {
          return e.idPlugin === opts.pluginId;
        });
        if (!entry) throw new Error("No approval request found on this card");

        var parsedEntry = parsePluginEntry(entry);
        if (!parsedEntry) throw new Error("Could not parse approval request");

        var updated = JSON.parse(JSON.stringify(parsedEntry.request));
        updated.approvers = updated.approvers.map(function (a) {
          if (a.id === opts.memberId) {
            a.status = opts.newStatus;
            a.respondedAt = Date.now();
          }
          return a;
        });

        var valueStr = parsedEntry.serialize(updated);

        return fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: valueStr }),
        }).then(function (res) {
          if (!res.ok) throw new Error("Failed to update approval request");
          return updated;
        });
      });
  }

  function iconAsDataUri(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load icon: " + url);
        return res.text();
      })
      .then(function (svgText) {
        return (
          "data:image/svg+xml;base64," +
          btoa(unescape(encodeURIComponent(svgText)))
        );
      });
  }

  function iconWithBadge(iconDataUri, count) {
    if (!count) return iconDataUri;

    var display = count > 9 ? "9+" : String(count);
    var fontSize = display.length > 1 ? 17 : 19;

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
      '<image href="' +
      iconDataUri +
      '" x="-8" y="-8" width="48" height="48" />' +
      // Kept fully inside the 32x32 box (with room for the stroke) so it
      // can't get clipped by any container the icon is rendered inside.
      '<circle cx="19" cy="13" r="14" fill="#eb5a46" stroke="#1d2125" stroke-width="2" />' +
      '<text x="19" y="14" text-anchor="middle" dominant-baseline="central" ' +
      'font-family="Helvetica, Arial, sans-serif" font-size="' +
      fontSize +
      '" ' +
      'font-weight="700" fill="#ffffff">' +
      display +
      "</text>" +
      "</svg>";

    return (
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)))
    );
  }

  return {
    getOverallStatus: getOverallStatus,
    approvedCount: approvedCount,
    initialsFor: initialsFor,
    avatarHtml: avatarHtml,
    fetchCardRequest: fetchCardRequest,
    saveCardRequest: saveCardRequest,
    removeCardRequest: removeCardRequest,
    countPendingForMember: countPendingForMember,
    getPendingRequestsForMember: getPendingRequestsForMember,
    parsePluginEntry: parsePluginEntry,
    respondToRequestRest: respondToRequestRest,
    timeAgo: timeAgo,
    iconWithBadge: iconWithBadge,
    iconAsDataUri: iconAsDataUri,
  };
})();
