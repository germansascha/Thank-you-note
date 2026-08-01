import { chromium, devices } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(dir, "index.html");

// CHROMIUM_PATH lets this run against a system Chromium instead of Playwright's
// own download (handy in sandboxes where `playwright install` isn't available).
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const ctx = await browser.newContext({ ...devices["iPhone 14 Pro"] });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

await page.goto(url);
await page.waitForTimeout(300);

/* ---------------------------------------------- 1. headless rules fuzzing */
const sim = await page.evaluate(() => {
  const out = { games: 0, wins: 0, maxSteps: 0, conservation: "ok", problems: [] };
  const roster = [
    { name: "Ada", emoji: "🦊" }, { name: "Bo", emoji: "🐼" }, { name: "Cy", emoji: "🐸" }
  ];
  for (let g = 0; g < 40; g++) {
    newGame(g % 3 === 0 ? roster.slice(0, 2) : roster);
    out.games++;
    let steps = 0;
    while (G.phase !== "over" && steps < 4000) {
      steps++;
      const total = G.deck.length + G.discard.length + G.players.reduce((s, p) => s + p.hand.length, 0);
      if (total !== 108) { out.conservation = "LOST CARDS: " + total + " at step " + steps; break; }
      if (G.phase === "handoff") { G.phase = "play"; continue; }
      const opts = me().hand.filter(playable);
      if (opts.length) {
        const c = opts[(Math.random() * opts.length) | 0];
        commitPlay(c, c.color === "wild" ? COLORS[(Math.random() * 4) | 0] : c.color);
      } else if (!G.hasDrawn) {
        doDraw();
      } else {
        passTurn();
      }
    }
    out.maxSteps = Math.max(out.maxSteps, steps);
    if (G.phase === "over") out.wins++;
    else out.problems.push("game " + g + " did not finish in " + steps + " steps");
  }
  return out;
});
console.log("SIM:", JSON.stringify(sim, null, 2));

/* ------------------------------------------------- 2. real UI walkthrough */
await page.reload();
await page.waitForTimeout(200);

const shot = async (name) => {
  await page.screenshot({ path: path.join(dir, "shots", name + ".png") });
};

await shot("1-setup");

// name the players, then start
const inputs = page.locator("#rows input");
await inputs.nth(0).fill("Mia");
await inputs.nth(1).fill("Leo");
await inputs.nth(2).fill("Papa");
await page.locator("#addRow").click();          // exercise add
await page.locator("#rows .del").last().click();  // ...and remove
await page.locator("#startBtn").click();
await page.waitForTimeout(350);
await shot("2-handoff");

// hold-to-reveal
const btn = page.locator("#holdBtn");
const box = await btn.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(900);
await page.mouse.up();
await page.waitForTimeout(300);
await shot("3-play");

const handVisible = await page.locator("#hand .card").count();
const scoreboardVisible = await page.locator("#players .pchip").count();
console.log("UI: hand cards =", handVisible, " player chips =", scoreboardVisible);

// verify the hand is genuinely NOT in the DOM during a hand-off
const leak = await page.evaluate(() => {
  const before = document.querySelectorAll("#hand .card").length;
  passTurn();                                   // forces a hand-off
  const during = document.querySelectorAll("#hand .card").length;
  const handoffOn = document.querySelector("#handoff").classList.contains("on");
  const topbarShown = getComputedStyle(document.querySelector("#topbar")).display !== "none";
  return { before, during, handoffOn, topbarShown };
});
console.log("SECRECY:", JSON.stringify(leak));

// does the scoreboard actually paint above the hand-off overlay?
const stack = await page.evaluate(() => {
  const chip = document.querySelector("#players .pchip");
  const r = chip.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { topElement: hit ? hit.className || hit.id || hit.tagName : "none",
           insideScoreboard: !!(hit && hit.closest("#players")) };
});
console.log("Z-ORDER:", JSON.stringify(stack));
await shot("4-handoff-live");

// wild colour picker
await page.evaluate(() => {
  G.phase = "play";
  hideAll();
  me().hand.push({ id: 9999, color: "wild", value: "wild4" });
  render();
  tryPlay(me().hand[me().hand.length - 1]);
});
await page.waitForTimeout(250);
await shot("5-colorpick");

// menu sheet
await page.evaluate(() => { hideAll(); G.phase = "play"; render(); });
await page.locator("#menuBtn").click();
await page.waitForTimeout(200);
await shot("6-menu");

// win screen
await page.evaluate(() => {
  hideAll();
  G.winner = G.players[0];
  G.players[0].hand = [];
  G.phase = "over";
  showWin();
});
await page.waitForTimeout(600);
await shot("7-win");

/* ------------------------------------------------------ 3. overflow check */
await page.reload();
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => {
  const de = document.documentElement;
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, scrollH: de.scrollHeight, clientH: de.clientHeight };
});
console.log("OVERFLOW:", JSON.stringify(overflow));

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "ERRORS: none");
await browser.close();
