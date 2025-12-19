#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

type LocaleMap = Record<string, any>;

function setNestedValue(target: LocaleMap, dottedKey: string, value: string) {
  const parts = dottedKey.split(".").filter(Boolean);
  let cursor: any = target;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLeaf = i === parts.length - 1;
    if (isLeaf) {
      cursor[part] = value;
    } else {
      if (cursor[part] == null || typeof cursor[part] !== "object") {
        cursor[part] = {};
      }
      cursor = cursor[part];
    }
  }
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [key, value] = token.split("=");
      args[key.slice(2)] = value ?? true;
    } else if (!args._) {
      // positional bucket
      (args as any)._ = [token];
    } else {
      (args as any)._!.push(token);
    }
  }
  return args as {
    _: string[] | undefined;
    input?: string;
    outDir?: string;
    sheet?: string;
    keyCol?: string;
    viCol?: string;
  } & Record<string, string | boolean>;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readWorkbook(inputPath: string) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const buffer = fs.readFileSync(inputPath);
  return XLSX.read(buffer, { type: "buffer" });
}

function normalizeHeader(header: string): string {
  return header.trim();
}

function buildLocalesFromSheet(
  sheet: XLSX.WorkSheet,
  options: {
    keyHeader?: string;
    viHeader?: string;
  }
) {
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });
  if (json.length === 0) {
    throw new Error("The sheet is empty.");
  }

  const headerKeys = Object.keys(json[0]).map(normalizeHeader);
  const keyHeader = options.keyHeader ?? headerKeys[0];
  const viHeader = options.viHeader ?? headerKeys[1];

  // Remaining headers are languages
  const languageHeaders = headerKeys.filter(
    (h) => h !== keyHeader && h !== viHeader
  );

  const locales: Record<string, LocaleMap> = {};
  for (const lang of languageHeaders) {
    locales[lang] = {};
  }

  for (const row of json) {
    const key = String(row[keyHeader] ?? "").trim();
    if (!key) continue;

    for (const lang of languageHeaders) {
      const valueRaw = row[lang];
      let value = valueRaw == null ? "" : String(valueRaw);
      // Preserve placeholders like {0}, {name}, %s, %d, {{var}}
      value = value.replaceAll("\r", "").replaceAll("\n", "\\n");
      setNestedValue(locales[lang], key, value);
    }
  }

  return locales;
}

function writeLocaleFiles(outDir: string, locales: Record<string, LocaleMap>) {
  ensureDir(outDir);
  for (const [lang, map] of Object.entries(locales)) {
    const target = path.join(outDir, `${lang}.json`);
    const jsonText = JSON.stringify(map, null, 2);
    fs.writeFileSync(target, jsonText, "utf8");
    // eslint-disable-next-line no-console
    console.log(`Wrote ${target}`);
  }
}

function detectSheet(workbook: XLSX.WorkBook, sheetName?: string) {
  if (sheetName) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) throw new Error(`Sheet not found: ${sheetName}`);
    return ws;
  }
  const first = workbook.SheetNames[0];
  return workbook.Sheets[first]!;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
Locale Tool - Convert Excel to per-language JSON files

Usage:
  locale-tool --input=path/to/input.xlsx --outDir=path/to/locales [--sheet=Sheet1] [--keyCol=Key] [--viCol=vi]

Notes:
  - First column must be the key (e.g., common.loading)
  - Second column is Vietnamese; remaining columns are language outputs
  - Output file names are derived from column headers (e.g., en, fr, ja)
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) {
    printHelp();
    process.exit(0);
  }

  const input = (args.input || args._?.[0]) as string | undefined;
  const outDir = (args.outDir || "locales") as string;
  const sheetName = (args.sheet as string | undefined) || undefined;
  const keyCol = (args.keyCol as string | undefined) || undefined;
  const viCol = (args.viCol as string | undefined) || undefined;

  if (!input) {
    // eslint-disable-next-line no-console
    console.error(
      "Error: --input=path/to/file.xlsx is required (or provide as first argument)"
    );
    printHelp();
    process.exit(1);
  }

  const workbook = readWorkbook(path.resolve(input));
  const sheet = detectSheet(workbook, sheetName);
  const locales = buildLocalesFromSheet(sheet, {
    keyHeader: keyCol,
    viHeader: viCol,
  });
  writeLocaleFiles(path.resolve(outDir), locales);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
