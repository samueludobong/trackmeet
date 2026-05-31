import fs from "node:fs";
const cand = ["router","profile","isFollowing","followLoading","followersCount","currentUserId","viewerToken","pinnedPreviewOpen","setPinnedPreviewOpen","socialLinksSheetOpen","setSocialLinksSheetOpen","publicMeet","likedPostIds","onToggleLike","handleJoinMeet","handleFollow","handleDM","getInitials","isOwnProfile","visibleSocial","socialOverflow","AVATAR_OVERLAP","userId"];
const opb = fs.readFileSync("components/profile/OtherProfileBody.tsx", "utf8");
// body = everything after the function signature
const bodyStart = opb.indexOf("return (");
const body = opb.slice(bodyStart);
const used = cand.filter((n) => new RegExp("\\b" + n + "\\b").test(body));

// rewrite the OtherProfileBody signature with the used props
let t = opb.replace(/export function OtherProfileBody\([\s\S]*?\)\s*\{/,
  "export function OtherProfileBody({ " + used.join(", ") + " }: {\n" + used.map((n) => "  " + n + ": any;").join("\n") + "\n}) {");
fs.writeFileSync("components/profile/OtherProfileBody.tsx", t);

// update the call site in user-profile.tsx
let up = fs.readFileSync("app/user-profile.tsx", "utf8");
up = up.replace(/<OtherProfileBody[^/]*\/>/,
  "<OtherProfileBody " + used.map((n) => n + "={" + n + "}").join(" ") + " />");
fs.writeFileSync("app/user-profile.tsx", up);
console.log("wired", used.length, "props:", used.join(", "));
