import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type Rule = { title: string; body: string };

const FILE = path.join(process.cwd(), "data", "rules.json");

const DEFAULT_RULES: Rule[] = [
  {
    title: "Curfew sa mga menor de edad",
    body: "Ang mga menor de edad dili gitugotan sa gawas human sa 10:00 PM gawas kung kauban ang ginikanan o tigbantay.",
  },
  {
    title: "Kahilom sa gabii",
    body: "Likayi ang kusog nga tunog, karaoke, ug pagsugod og sagol-sagol nga kasaba human sa 10:00 PM.",
  },
];

async function readRules(): Promise<Rule[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf-8"));
  } catch {
    return DEFAULT_RULES;
  }
}

export async function GET() {
  return NextResponse.json({ items: await readRules() });
}

export async function PUT(req: Request) {
  // TODO: i-check diri nga admin ang naga-request
  const data = await req.json().catch(() => null);
  if (!data || !Array.isArray(data.items)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const items: Rule[] = data.items
    .filter((r: Rule) => typeof r?.title === "string" && typeof r?.body === "string" && r.title.trim())
    .map((r: Rule) => ({ title: r.title.trim(), body: r.body.trim() }));

  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(items, null, 2));
  return NextResponse.json({ items });
}