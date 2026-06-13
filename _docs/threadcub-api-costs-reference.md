# ThreadCub API Costs & Setup Reference

## Overview

ThreadCub uses **three APIs** for its RAG (Retrieval-Augmented Generation) system, each with its own billing and dashboard.

---

## The Two APIs

### 1. OpenAI — Embeddings
Used to convert conversation text into vector embeddings for search.

- **Model:** `text-embedding-3-small`
- **Purpose:** Indexing conversations (chunking + embedding)
- **Cost:** ~$0.02 per million tokens
- **Typical cost per conversation:** Fractions of a cent — essentially free
- **Where to check spend:** [platform.openai.com/usage](https://platform.openai.com/usage)

> **Example from testing:** After all development testing (multiple re-indexes, resets, different models), total spend was ~28,700 tokens = less than $0.001. Negligible.

---

### 2. Anthropic (Claude) — RAG Answers
Used to generate answers from the retrieved conversation chunks.

- **Models used:** `claude-haiku` (cheaper) and `claude-sonnet` (more capable)
- **Purpose:** Answering user questions in the RAG chat panel
- **Cost per RAG query:** ~$0.01 (roughly 2,000–2,500 input tokens + ~100 output tokens at Sonnet pricing of ~$3/million input tokens)
- **Where to check spend:** [console.anthropic.com](https://console.anthropic.com) → Usage → Cost

> **Example from testing:** ~$0.39 for the entire month of February 2026, covering all development testing and RAG queries. Credit grant of $12 (expires Nov 2026) was being drawn from.

---

### 3. Cohere — Rerank (Search Quality Layer)
Used inside `hybridSearchChunks` to re-order vector + keyword results by true semantic relevance before passing them to Claude.

- **Model:** `rerank-english-v3.0` (or `rerank-v3.5`)
- **Purpose:** Re-ranking the merged vector + keyword search results so only the most relevant chunks reach Claude
- **Pricing:** **$2.00 per 1,000 searches** (1 search = 1 query with up to 100 documents)
- **Cost per rerank call:** ~$0.002 (assuming <100 chunks per query)
- **Where to check spend:** [dashboard.cohere.com](https://dashboard.cohere.com) → Usage

> **Trial key note:** Cohere Trial API keys are **free** but rate-limited and **not permitted for commercial/production use**. If ThreadCub is live with real users, you need a Production key (requires billing setup at dashboard.cohere.com).

> **Important:** The AI Insights feature (`/api/insights/generate`) runs **5 rerank calls per generation** (one per insight type — Friction, AI Mistakes, Rework Sessions, Breakthroughs, Recurring Problems). At $0.002 each that's ~$0.01 per full insights generation. Very cheap, but worth noting it's 5x the cost of a single RAG query rerank.

---

## Cost Per User Query (Business Context)

| Action | API Used | Approx. Cost |
|---|---|---|
| Index a conversation (embed) | OpenAI | ~$0.0001 or less |
| Ask 1 RAG question (rerank) | Cohere | ~$0.002 |
| Ask 1 RAG question (AI answer) | Anthropic | ~$0.01 |
| Full RAG question end-to-end | Both | ~$0.012 |
| Generate AI Insights (5 insight types) | Cohere + Anthropic | ~$0.01 + $0.05 = ~$0.06 |
| Full session (index + 5 questions) | All three | ~$0.07 |

**Implication for credit pricing:** If you charge users 1 credit per RAG query and price credits at a reasonable margin, the underlying API cost per query (~$0.01) gives you healthy room to operate.

---

## Where to Monitor Spend

| What | Where |
|---|---|
| Embedding costs (indexing) | [platform.openai.com/usage](https://platform.openai.com/usage) — breakdown by model and date |
| Rerank costs (search quality) | [dashboard.cohere.com](https://dashboard.cohere.com) → Usage |
| RAG query costs (AI answers) | [console.anthropic.com](https://console.anthropic.com) → Usage → Cost tab |

Both dashboards show per-model breakdowns and daily usage graphs. The Anthropic dashboard distinguishes between Haiku and Sonnet so you can see which model is driving cost.

---

## Key Technical Notes

- **Older embedding model:** Early testing used `text-embedding-ada-002` (legacy OpenAI model). Current pipeline uses `text-embedding-3-small` which is cheaper and better.
- **Similarity threshold:** Set to `0.35` in `lib/rag-types.ts` (`DEFAULT_SIMILARITY_THRESHOLD`). This filters out low-relevance chunks — lower values let more through, higher values are stricter.
- **Re-indexing cost:** Resetting and re-indexing all conversations costs almost nothing due to the cheap embedding model. Safe to do whenever the chunking pipeline changes.

---

## Summary

The RAG system is **very cheap to run**. Embeddings (OpenAI) are nearly free, Claude API queries cost about a penny each, and Cohere reranking adds ~$0.002 per query. A full end-to-end RAG question costs roughly $0.012. At current testing volumes, total monthly spend across all three APIs sits well under $1. As ThreadCub scales to real users, costs will grow linearly but remain low per query.

> **Production checklist:** If you go live, make sure you have a **Cohere Production API key** — Trial keys are free but prohibited for commercial use. Get one at [dashboard.cohere.com](https://dashboard.cohere.com) → Billing.