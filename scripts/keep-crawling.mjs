import { spawn, execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const children = new Map()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function commandLines() {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | ForEach-Object { $_.CommandLine }",
  ])
  return stdout
}

function listed(lines, script) {
  return lines.split(/\r?\n/).some((line) => line.includes(script))
}

function start(script) {
  if (children.has(script)) return
  const child = spawn(process.execPath, [script], { stdio: "inherit" })
  children.set(script, child)
  child.on("exit", () => children.delete(script))
  console.log(`started ${script}`)
}

while (true) {
  try {
    const lines = await commandLines()
    if (!listed(lines, "import-developments.mjs")) start("scripts/import-developments.mjs")
    else console.log("development crawl already running")
    if (!listed(lines, "fill-development-media.mjs")) start("scripts/fill-development-media.mjs")
    else console.log("photo crawl already running")
  } catch (error) {
    console.log(`crawl check failed ${error instanceof Error ? error.message : "failed"}`)
  }
  await sleep(60_000)
}
