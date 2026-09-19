// Copy shown by NotifyPermissionButton (Home/Checklist/Q&A) and
// NotificationToggle (Profile) when notifications can't be turned on.
// Not a failure, so it's shown as a calm 'info' toast, not a red error.
//
// Two universal messages, no browser detection needed:
//  - unsupported: the browser can't do push. "Add to Home Screen"
//    isn't iPhone-only — it's in Android/Chrome's menu and Safari's
//    Share sheet — so the wording doesn't name a device.
//  - blocked: the person (or Chrome) already said no for this site.
//    Adding to the Home Screen wouldn't undo that, so this one points
//    at the site settings instead.
export const NOTIFICATION_MESSAGES = {
  unsupported: "Can't enable notifications here. Add the site to your Home Screen (browser menu or Share → Add to Home Screen).",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
  notGranted: 'No problem — you can turn notifications on any time later.',
}
