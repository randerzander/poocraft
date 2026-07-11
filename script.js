const canvas = document.querySelector("#world");
const ctx = canvas.getContext("2d");
const poopCountEl = document.querySelector("#poopCount");
const dirtCountEl = document.querySelector("#dirtCount");
const stinkMeter = document.querySelector("#stinkMeter");
const toolButtons = [...document.querySelectorAll("[data-tool]")];
const blockButtons = [...document.querySelectorAll("[data-block]")];
const resetButton = document.querySelector("#reset");
const usernameInput = document.querySelector("#username");
const playerStatsEl = document.querySelector("#playerStats");

const tile = 32;
const cols = canvas.width / tile;
const rows = canvas.height / tile;
const inventory = { poop: 0, dirt: 0 };
let activeTool = "mine";
let activeBlock = "poop";
let world = [];
let bob = 0;

const blocks = {
  air: null,
  grass: { top: "#4fbd4b", side: "#7a5634", fleck: "#5a3b24" },
  dirt: { top: "#9a6b3f", side: "#7c4f2e", fleck: "#5f3a22" },
  stone: { top: "#8d8c88", side: "#686762", fleck: "#4f4e4b" },
  poop: { top: "#7b4a28", side: "#56311c", fleck: "#2f1b10" }
};

function randomUsername() {
  return `Miner-${Math.floor(1000 + Math.random() * 9000)}`;
}

function loadUsername() {
  const saved = localStorage.getItem("poocraftUsername");
  usernameInput.value = saved || randomUsername();
  localStorage.setItem("poocraftUsername", usernameInput.value);
}

function currentUsername() {
  const username = usernameInput.value.trim() || randomUsername();
  if (username !== usernameInput.value) usernameInput.value = username;
  localStorage.setItem("poocraftUsername", username);
  return username;
}

function recordBlockEvent(action, block, x, y) {
  fetch("/api/block-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: currentUsername(),
      action,
      block,
      x,
      y
    })
  })
    .then((response) => {
      if (response.ok) loadPlayerStats();
    })
    .catch(() => {});
}

function renderPlayerStats(players) {
  if (!players.length) {
    playerStatsEl.innerHTML = "<p>No blocks logged yet.</p>";
    return;
  }

  playerStatsEl.replaceChildren(
    ...players.map((player) => {
      const row = document.createElement("div");
      row.className = "player-stat";

      const name = document.createElement("strong");
      name.textContent = player.username;

      const counts = document.createElement("span");
      counts.textContent = `${player.mined} mined / ${player.placed} placed`;

      row.append(name, counts);
      return row;
    })
  );
}

function loadPlayerStats() {
  fetch("/api/player-stats")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load player stats");
      return response.json();
    })
    .then((data) => renderPlayerStats(data.players || []))
    .catch(() => {});
}

function makeWorld() {
  inventory.poop = 3;
  inventory.dirt = 6;
  world = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const surface = 7 + Math.floor(Math.sin(x * 0.55) * 1.5);
      if (y < surface) return "air";
      if (y === surface) return "grass";
      if (y < surface + 4) return Math.random() < 0.14 ? "poop" : "dirt";
      return Math.random() < 0.08 ? "poop" : "stone";
    })
  );
  updateHud();
}

function drawBlock(x, y, type) {
  const block = blocks[type];
  if (!block) return;
  const px = x * tile;
  const py = y * tile;

  ctx.fillStyle = block.side;
  ctx.fillRect(px, py, tile, tile);
  ctx.fillStyle = block.top;
  ctx.fillRect(px, py, tile, 8);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

  ctx.fillStyle = block.fleck;
  const seed = (x * 47 + y * 91) % 19;
  ctx.fillRect(px + 7 + seed, py + 15, 4, 3);
  ctx.fillRect(px + 18, py + 22 - (seed % 5), 5, 3);

  if (type === "poop") {
    ctx.fillStyle = "rgba(255, 239, 168, 0.75)";
    ctx.fillRect(px + 12, py + 10, 5, 3);
  }
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#82c9ff");
  sky.addColorStop(0.58, "#b7e3ff");
  sky.addColorStop(1, "#d5f3b1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff7ce";
  ctx.beginPath();
  ctx.arc(835, 78, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(92, 82, 72, 18);
  ctx.fillRect(126, 66, 74, 18);
  ctx.fillRect(680, 112, 110, 18);
}

function drawLittleGuy() {
  const x = 104;
  const y = 190 + Math.sin(bob) * 4;
  ctx.fillStyle = "#2d251f";
  ctx.fillRect(x, y, 26, 34);
  ctx.fillStyle = "#f2c28b";
  ctx.fillRect(x + 5, y - 21, 18, 18);
  ctx.fillStyle = "#1b1712";
  ctx.fillRect(x + 9, y - 15, 4, 4);
  ctx.fillRect(x + 18, y - 15, 4, 4);
  ctx.fillStyle = "#6b3f22";
  ctx.fillRect(x + 31, y + 2, 10, 10);
}

function draw() {
  bob += 0.06;
  drawSky();
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      drawBlock(x, y, world[y][x]);
    }
  }
  drawLittleGuy();
  requestAnimationFrame(draw);
}

function updateHud() {
  poopCountEl.textContent = inventory.poop;
  dirtCountEl.textContent = inventory.dirt;
  stinkMeter.value = Math.min(100, inventory.poop * 8);
}

function setActive(buttons, value, attr) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset[attr] === value);
  });
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
  const current = world[y]?.[x];
  if (!current) return;

  if (activeTool === "mine") {
    if (current !== "air") {
      if (current === "poop" || current === "dirt") inventory[current] += 1;
      if (current === "grass") inventory.dirt += 1;
      if (current === "stone" && Math.random() < 0.2) inventory.poop += 1;
      world[y][x] = "air";
      recordBlockEvent("mine", current, x, y);
    }
  } else if (current === "air" && inventory[activeBlock] > 0) {
    inventory[activeBlock] -= 1;
    world[y][x] = activeBlock;
    recordBlockEvent("place", activeBlock, x, y);
  }
  updateHud();
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeTool = button.dataset.tool;
    setActive(toolButtons, activeTool, "tool");
  });
});

blockButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeBlock = button.dataset.block;
    activeTool = "place";
    setActive(blockButtons, activeBlock, "block");
    setActive(toolButtons, activeTool, "tool");
  });
});

resetButton.addEventListener("click", makeWorld);
canvas.addEventListener("click", handleCanvasClick);
usernameInput.addEventListener("change", currentUsername);
usernameInput.addEventListener("blur", currentUsername);

loadUsername();
loadPlayerStats();
makeWorld();
draw();
