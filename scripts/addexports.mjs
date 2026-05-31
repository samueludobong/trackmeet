import fs from "node:fs";
const map = {
  "components/signup/SignupFields.tsx": ["Field", "PasswordStrengthBar", "PasswordField", "UsernameField"],
  "components/signup/SignupPickers.tsx": ["DrumPicker", "BirthdayDrumPicker"],
  "components/signup/SignupGrids.tsx": ["StreamingGrid", "ArtistsGrid", "StepDots"],
};
for (const [f, names] of Object.entries(map)) {
  let lines = fs.readFileSync(f, "utf8").split("\n");
  lines = lines.map((l) => {
    for (const n of names) if (new RegExp("^function " + n + "\b").test(l)) return "export " + l;
    return l;
  });
  fs.writeFileSync(f, lines.join("\n"));
}
console.log("done");
