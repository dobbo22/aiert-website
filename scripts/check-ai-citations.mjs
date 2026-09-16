// Tracks whether Perplexity and ChatGPT cite mailbroom.app (vs competitors)
// when asked the kind of question a prospect actually types. Both APIs are
// the same retrieval/answer engine as their consumer products, so this is a
// real proxy for AEO visibility — not a generic web-search check.
//
// Perplexity: as of 2026-09, Perplexity retired the old Sonar
// /chat/completions API (the "sonar" model can't even be selected directly
// anymore) in favour of an Agent API (POST /v1/agent, {preset, input}) that
// does its own live web search + citations via a "fast"/"quality" preset
// rather than a single named model. See docs.perplexity.ai/docs/agent-api.
//
// ChatGPT: uses OpenAI's Responses API (POST /v1/responses) with the
// web_search tool. The model decides per-prompt whether to search at all —
// some prompts get answered from parametric knowledge with zero citations,
// which is itself a meaningful (bad) result worth recording, not an error.
//
// Requires PERPLEXITY_API_KEY and OPENAI_API_KEY in .env.local.
// Run: npm run check:ai-citations
// Writes a dated Markdown report to reports/ai-citations/.

import { config } from "dotenv";
import { writeFile, mkdir } from "fs/promises";

config({ path: ".env.local" });

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!PERPLEXITY_KEY) {
  console.error("Missing PERPLEXITY_API_KEY in .env.local");
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY in .env.local");
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
      Authorization: `Bearer ${PERPLEXITY_KEY}`,
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
  return { content, citations, searched: true };
}

async function askChatGPT(prompt) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.1",
      tools: [{ type: "web_search" }],
      input: prompt,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const output = data.output ?? [];
  const searched = output.some((item) => item.type === "web_search_call");
  const message = output.find((item) => item.type === "message");
  const content = (message?.content ?? []).map((c) => c.text ?? "").join("\n");
  const citations = (message?.content ?? [])
    .flatMap((c) => c.annotations ?? [])
    .filter((a) => a.type === "url_citation")
    .map((a) => a.url)
    .filter(Boolean);
  return { content, citations, searched };
}

const ENGINES = [
  { key: "perplexity", label: "Perplexity (Agent API, preset: fast)", ask: askPerplexity },
  { key: "chatgpt", label: "ChatGPT (Responses API, gpt-5.1 + web_search)", ask: askChatGPT },
];

function analyse(content, citations) {
  const haystack = `${content}\n${citations.join("\n")}`.toLowerCase();
  const citedMailbroom = haystack.includes("mailbroom");
  const citedCompetitors = COMPETITORS.filter((c) => haystack.includes(c.toLowerCase()));
  return { citedMailbroom, citedCompetitors };
}

async function runEngine(engine) {
  console.log(`\nRunning ${PROMPTS.length} prompts against ${engine.label}...`);
  const results = [];

  for (const [i, { bucket, text }] of PROMPTS.entries()) {
    process.stdout.write(`[${i + 1}/${PROMPTS.length}] ${text.slice(0, 60)}... `);
    try {
      const { content, citations, searched } = await engine.ask(text);
      const { citedMailbroom, citedCompetitors } = analyse(content, citations);
      const searchNote = searched ? "" : " (answered without searching)";
      console.log(
        citedMailbroom
          ? `✅ cited${searchNote}`
          : citedCompetitors.length
            ? `❌ (competitors: ${citedCompetitors.join(", ")})${searchNote}`
            : `❌ not cited${searchNote}`
      );
      results.push({ bucket, prompt: text, citedMailbroom, citedCompetitors, citations, content, searched });
    } catch (err) {
      console.log(`⚠️ error: ${err.message}`);
      results.push({ bucket, prompt: text, error: err.message });
    }
    // Rate limits — small delay between calls
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

function buildReport(engineResults, date) {
  let md = `# AI citation check — ${date}\n\n`;

  md += `| Engine | MailBroom cited |\n|---|---|\n`;
  for (const { engine, results } of engineResults) {
    const citedCount = results.filter((r) => r.citedMailbroom).length;
    md += `| ${engine.label} | **${citedCount}/${results.length}** |\n`;
  }
  md += `\n---\n\n`;

  for (const { engine, results } of engineResults) {
    const citedCount = results.filter((r) => r.citedMailbroom).length;
    md += `## ${engine.label} — ${citedCount}/${results.length}\n\n`;
    md += `| # | Bucket | Prompt | MailBroom cited? | Competitors mentioned | Searched? |\n`;
    md += `|---|--------|--------|-------------------|------------------------|-----------|\n`;
    results.forEach((r, i) => {
      md += `| ${i + 1} | ${r.bucket} | ${r.prompt} | ${r.error ? `error: ${r.error}` : r.citedMailbroom ? "✅" : "❌"} | ${r.citedCompetitors?.join(", ") || "—"} | ${r.error ? "—" : r.searched ? "yes" : "no"} |\n`;
    });
    md += `\n### Full responses\n\n`;
    results.forEach((r, i) => {
      md += `#### ${i + 1}. ${r.prompt}\n\n`;
      if (r.error) {
        md += `Error: ${r.error}\n\n`;
        return;
      }
      md += `${r.content}\n\n**Citations:**\n${(r.citations || []).map((c) => `- ${c}`).join("\n") || "(none returned)"}\n\n`;
    });
    md += `\n---\n\n`;
  }

  return md;
}

async function main() {
  const engineResults = [];
  for (const engine of ENGINES) {
    const results = await runEngine(engine);
    engineResults.push({ engine, results });
  }

  const date = new Date().toISOString().slice(0, 10);
  const md = buildReport(engineResults, date);

  const dir = "reports/ai-citations";
  await mkdir(dir, { recursive: true });
  const outPath = `${dir}/${date}.md`;
  await writeFile(outPath, md, "utf-8");

  console.log(`\nReport written to ${outPath}`);
  for (const { engine, results } of engineResults) {
    const citedCount = results.filter((r) => r.citedMailbroom).length;
    console.log(`${engine.label}: MailBroom cited in ${citedCount}/${results.length} prompts.`);
  }
}

main();
