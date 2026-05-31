import fs from "node:fs";
const map = {
  _profileCache: "feedCache.profile",
  _myPostsCache: "feedCache.myPosts",
  _conversationsCache: "feedCache.conversations",
  _reactionSeq: "feedCache.reactionSeq",
};
const files = [
  "components/meets/MeetListenerScreen.tsx",
  "components/meets/MeetLiveScreen.tsx",
  "components/meets/StartMeetOverlay.tsx",
  "components/messages/MessagesView.tsx",
  "components/profile/ProfileTabs.tsx",
  "components/profile/ProfileView.tsx",
];
for (const f of files) {
  let t = fs.readFileSync(f, "utf8");
  t = t.split("\n").filter((l) => !/^let (_reactionSeq|_profileCache|_myPostsCache|_conversationsCache)\b/.test(l)).join("\n");
  let used = false;
  for (const [k, v] of Object.entries(map)) {
    const re = new RegExp("\\b" + k + "\\b", "g");
    if (re.test(t)) { t = t.replace(new RegExp("\\b" + k + "\\b", "g"), v); used = true; }
  }
  if (used && !/lib\/feed\/caches/.test(t)) {
    const rel = f.split("/").slice(1, -1).map(() => "..").join("/") + "/";
    const lines = t.split("\n");
    const idx = lines.findIndex((l) => /^import /.test(l));
    lines.splice(idx + 1, 0, `import { feedCache } from "${rel}lib/feed/caches";`);
    t = lines.join("\n");
  }
  fs.writeFileSync(f, t);
  console.log(used ? "rewrote " + f : "no-op " + f);
}
