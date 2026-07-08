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
    var initials =
      parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "");
    return initials.toUpperCase();
  }

  function avatarHtml(member) {
    // member: { avatarUrl, fullName, initials, colorSeed }
    if (member.avatarUrl) {
      return (
        '<img class="avatar-img" src="' + member.avatarUrl + '50.png" alt="" />'
      );
    }
    var colors = [
      "#579dff",
      "#4bce97",
      "#e774bb",
      "#f5cd47",
      "#f87168",
      "#9f8fef",
    ];
    var seed = (member.id || member.fullName || "").split("").reduce(function (
      a,
      c,
    ) {
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
      '<circle cx="19" cy="13" r="15" fill="#eb5a46" stroke="#1d2125" stroke-width="2" />' +
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
    countPendingForMember: countPendingForMember,
    iconWithBadge: iconWithBadge,
    iconAsDataUri: iconAsDataUri,
  };
})();
