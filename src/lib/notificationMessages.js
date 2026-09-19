// Copy shown by NotifyPermissionButton (Home/Checklist/Q&A) and
// NotificationToggle (Profile) when notifications can't be turned on.
// Not a failure, so it's shown as a calm 'info' toast, not a red error.
//
// One universal message for every device/browser: "unsupported" and
// "blocked" share it, so no browser detection is needed. "Add to Home
// Screen" isn't iPhone-only — it's in Android/Chrome's menu and
// Safari's Share sheet — so the wording doesn't name a device.
const CANT_ENABLE =
  "Can't enable notifications here. Add the site to your Home Screen (browser menu or Share → Add to Home Screen)."

export const NOTIFICATION_MESSAGES = {
  unsupported: CANT_ENABLE,
  blocked: CANT_ENABLE,
  notGranted: 'No problem — you can turn notifications on any time later.',
}
