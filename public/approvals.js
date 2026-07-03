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

  return {
    getOverallStatus: getOverallStatus,
    approvedCount: approvedCount,
    initialsFor: initialsFor,
    avatarHtml: avatarHtml,
    fetchCardRequest: fetchCardRequest,
    saveCardRequest: saveCardRequest,
  };
})();
