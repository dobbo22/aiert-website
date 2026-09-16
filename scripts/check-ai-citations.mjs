// Tracks whether Perplexity cites mailbroom.app (vs competitors) when
// asked the kind of question a prospect actually types. Perplexity's API
// is the same retrieval/answer engine as perplexity.ai, so this is a real
// proxy for AEO visibility — not a generic web-search check.
//
// As of 2026-09, Perplexity retired the old Sonar /chat/completions API
// (the "sonar" model can't even be selected directly anymore) in favour of
// an Agent API (POST /v1/agent, {preset, input}) that does its own live web
// search + citations via a "fast"/"quality" preset rather than a single
// named model — still Perplexity's own product surface, just a different
// mechanism than before. See docs.perplexity.ai/docs/agent-api.
//
// Requires PERPLEXITY_API_KEY in .env.local (https://www.perplexity.ai/settings/api).
// Run: npm run check:ai-citations
// Writes a dated Markdown report to reports/ai-citations/.

import { config } from "dotenv";
import { writeFile, mkdir } from "fs/promises";

config({ path: ".env.local" });

const API_KEY = process.env.PERPLEXITY_API_KEY;
if (!API_KEY) {
  console.error("Missing PERPLEXITY_API_KEY in .env.local");
  process.exit(1);
}

// Competitors named in the existing comparison blog posts
// (app/mailbroom/webapp/blog/mailbroom-vs-*), plus a few adjacent
// categories a buyer might type instead of "MailBroom" by name.
const COMPETITORS = ["SaneBox", "Clean Email", "BitRecover", "Mailstrom", "CleanEmail", "SimplyTrash", "Trimbox"];

// One list, not split by intent — the report tags each result with which
// bucket it came from so the raw prompt list stays easy to extend.
const PROMPTS = [
  { bucket: "category", text: "What's the best tool for bulk cleaning up Microsoft 365 mailboxes across a whole company?" },
  { bucket: "category", text: "How do I clean up shared mailboxes like info@ or sales@ in Exchange Online?" },
  { bucket: "category", text: "What's the best way to bulk delete old emails in Office 365 for an entire organisation?" },
  { bucket: "category", text: "How can IT reduce Microsoft 365 mailbox storage costs across many users at once?" },
  { bucket: "category", text: "What should I do with a former employee's mailbox after they leave the company?" },
  { bucket: "category", text: "How do I audit which mailboxes are using the most storage in my Microsoft 365 tenant?" },
  { bucket: "category", text: "Is there a tool to shrink mailboxes before a Microsoft 365 tenant-to-tenant migration?" },
  { bucket: "category", text: "How can an MSP bill clients for Microsoft 365 mailbox storage cleanup?" },
  { bucket: "category", text: "What's a good way to handle 'mailbox full' helpdesk tickets at scale in Exchange Online?" },
  { bucket: "category", text: "Are there inbox cleanup tools that respect legal hold and retention policies in Microsoft 365?" },
  { bucket: "category", text: "What are the Exchange Online mailbox storage quotas by Microsoft 365 plan?" },
  { bucket: "category", text: "Does deleting old emails actually reduce a company's carbon footprint?" },
  { bucket: "brand", text: "What is MailBroom for Business and what does it do?" },
  { bucket: "brand", text: "How does MailBroom for Business pricing work?" },
  { bucket: "brand", text: "Is MailBroom for Business GDPR compliant?" },
  { bucket: "comparison", text: "MailBroom vs SaneBox — what's the difference?" },
  { bucket: "comparison", text: "MailBroom vs Clean Email for business use — which is better for a team?" },
  { bucket: "comparison", text: "What are alternatives to Clean Email for cleaning up a company's Microsoft 365 mailboxes?" },
  { bucket: "comparison", text: "What are the best SaneBox alternatives for Microsoft 365?" },
  { bucket: "comparison", text: "Best tools to bulk delete emails in Office 365 without password login, using Microsoft SSO instead?" },
];

async function askPerplexity(prompt) {
  const res = await fetch("https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preset: "fast",
      input: prompt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Perplexity API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const output = data.output ?? [];
  const message = output.find((item) => item.type === "message");
  const content = (message?.content ?? []).map((c) => c.text ?? "").join("\n");
  const searchResults = output.find((item) => item.type === "search_results");
  const citations = (searchResults?.results ?? []).map((r) => r.url).filter(Boolean);
  return { content, citations };
}

function analyse(content, citations) {
  const haystack = `${content}\n${citations.join("\n")}`.toLowerCase();
  const citedMailbroom = haystack.includes("mailbroom");
  const citedCompetitors = COMPETITORS.filter((c) => haystack.includes(c.toLowerCase()));
  return { citedMailbroom, citedCompetitors };
}

async function main() {
  console.log(`Running ${PROMPTS.length} prompts against Perplexity...`);
  const results = [];

  for (const [i, { bucket, text }] of PROMPTS.entries()) {
    process.stdout.write(`[${i + 1}/${PROMPTS.length}] ${text.slice(0, 60)}... `);
    try {
      const { content, citations } = await askPerplexity(text);
      const { citedMailbroom, citedCompetitors } = analyse(content, citations);
      console.log(citedMailbroom ? "✅ cited" : citedCompetitors.length ? `❌ (competitors: ${citedCompetitors.join(", ")})` : "❌ not cited");
      results.push({ bucket, prompt: text, citedMailbroom, citedCompetitors, citations, content });
    } catch (err) {
      console.log(`⚠️ error: ${err.message}`);
      results.push({ bucket, prompt: text, error: err.message });
    }
    // Perplexity rate limits — small delay between calls
    await new Promise((r) => setTimeout(r, 500));
  }

  const citedCount = results.filter((r) => r.citedMailbroom).length;
  const date = new Date().toISOString().slice(0, 10);

  let md = `# AI citation check — ${date}\n\n`;
  md += `MailBroom cited in **${citedCount}/${results.length}** prompts (Perplexity Agent API, preset: fast).\n\n`;
  md += `| # | Bucket | Prompt | MailBroom cited? | Competitors mentioned |\n`;
  md += `|---|--------|--------|-------------------|------------------------|\n`;
  results.forEach((r, i) => {
    md += `| ${i + 1} | ${r.bucket} | ${r.prompt} | ${r.error ? `error: ${r.error}` : r.citedMailbroom ? "✅" : "❌"} | ${r.citedCompetitors?.join(", ") || "—"} |\n`;
  });
  md += `\n---\n\n## Full responses\n\n`;
  results.forEach((r, i) => {
    md += `### ${i + 1}. ${r.prompt}\n\n`;
    if (r.error) {
      md += `Error: ${r.error}\n\n`;
      return;
    }
    md += `${r.content}\n\n**Citations:**\n${(r.citations || []).map((c) => `- ${c}`).join("\n") || "(none returned)"}\n\n`;
  });

  const dir = "reports/ai-citations";
  await mkdir(dir, { recursive: true });
  const outPath = `${dir}/${date}.md`;
  await writeFile(outPath, md, "utf-8");
  console.log(`\nReport written to ${outPath}`);
  console.log(`MailBroom cited in ${citedCount}/${results.length} prompts.`);
}

main();
