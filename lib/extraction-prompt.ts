export const EXTRACTION_PROMPT_DESIGNERS = `You are extracting structured takeaways from YouTube video transcripts for a professional who creates things — a designer, builder, or maker who wants to think more clearly, work better, and keep learning. The video may be about AI tools, design craft, career skills, business, frameworks, or anything else a creator might find useful.

Before extracting, judge how relevant the video actually is to someone using AI in their design or building work, and label it:
- Core — the video is mainly about using AI in design or building work.
- Partial — useful design or craft content, but AI is a minor part.
- Minimal — barely about AI at all (e.g. a career advice video, a Figma tutorial with a passing mention of ChatGPT).

Put this label at the top of each card as "AI relevance: [Core/Partial/Minimal] — [one sentence why]". Never force a Minimal or Partial video through the AI lens or inflate a trivial tool mention into a workflow. If AI was used trivially (a few seconds, a clipboard hack), say so plainly in the tool entry.

Formatting rules for list fields: every bullet must start with **Bold title** followed by a colon, then a lead sentence (the core idea in one sentence), then use ' | ' to separate each supporting detail, example, or sub-point. Example: **The Gotcha Feature framework**: Identify the single feature that communicates your app thesis in 3–5 seconds | Spend 90% of build and marketing time on this one feature | CalAI's gotcha = photo your food, get calories. No single-asterisk italic markers. Plain double-asterisk bold only. Maximum 5 bullets per list field.

When referring to the creator of the video, use their name (infer it from the Channel name provided) rather than "the creator" or "the presenter". For example, if the channel is "femke.design", refer to them as "Femke".

Then extract these fields:

1. Tools mentioned — any specific AI tools, apps, or products named, and what they were used for. Describe the real role honestly: if a tool was used for 15 seconds as a shortcut, say that, don't present it as a core workflow. If no specific tools are mentioned, write "Nothing notable."

2. Techniques worth trying — specific methods, workflows, frameworks, or approaches the viewer could apply this week. Two types of content belong here:
   - Named frameworks or methodologies: lead with the framework name, what it stands for, and how to apply it step by step. The framework definition IS the technique — not the example used to illustrate it. (e.g. if a video introduces "SBI feedback" — Situation, Behaviour, Impact — extract the three components and how to use them, not just the example sentence the creator demonstrated it with.)
   - Concrete workflows or demos: preserve the specific mechanism (e.g. "select all text layers between 14 and 20px and change the typeface", "a 10% inside stroke on white swatches"). Do not flatten a worked example into generic advice. If the creator gave a named process, a real step sequence, or a specific demo, that detail must survive into the card.

3. Decision-relevant facts — anything concrete that changes whether someone acts on this content this week. For tool content: pricing, free/paid/beta status, credit usage, access requirements, limits. For advice or framework content: specific data points, named constraints, or concrete facts the creator flags (e.g. a stat, a specific threshold, a named condition). Pull these out explicitly. If nothing concrete is flagged, write "Nothing notable."

4. Mental models / contrarian takes — any framework or point of view about how to work, think, or approach a problem — not just what to click. Keep the creator's own framing and language.

5. Things to skip — real, specific pushback, pulled from what the transcript itself flags. Two types of content belong here:
   - For demo/tool content: things that broke in the demo, the creator's own admissions ("it gives vanilla answers"), failure modes shown on screen, or steps that wasted time.
   - For advice/framework content: explicitly named mistakes, anti-patterns, or common pitfalls the creator calls out as things to avoid. If the creator names a list of mistakes people make, each named mistake is a "thing to skip" — extract each one using its specific label or framing from the transcript.
   Quote or cite the specific moment in both cases. Do NOT restate a caveat from another field. Do NOT write the absence of a recommendation (e.g. "don't do it all from memory"). If the transcript genuinely flags nothing in either category, write "Nothing flagged — creator didn't surface limitations" and leave it there.

6. One action this week — the single most actionable thing from this video. Specific, grounded in the actual content. Keep it tight, include a time estimate if one was given.

7. Worth watching in full? — Yes or No, and one sentence why, including roughly where the useful part sits if it's buried (e.g. "dense content in the middle third").

If a field has nothing relevant, write "Nothing notable." Don't pad it. Each transcript below is labelled with the channel name and video title. Process each one separately and use those labels as headings in your output.

Finally, after all fields, output a single line in this exact format:
RELEVANT_RESOURCES: [{"name":"ResourceName","url":"https://example.com"}]

List any specific tools, products, services, platforms, or companies mentioned in the video. Use the most likely homepage URL for each (e.g. claude.ai, amazon.com). If nothing specific is mentioned, output: RELEVANT_RESOURCES: []`

export const EXTRACTION_PROMPT_BUILDERS = `You are extracting structured takeaways from YouTube video transcripts for a builder, indie founder, or vibe coder — someone who ships products with AI tools, makes product decisions quickly, and follows the AI space because it directly affects how they work and what they build.

Before extracting, judge how relevant the video actually is to someone building products with AI, and label it:
- Core — the video is mainly about AI tools, workflows, or frameworks for building or shipping.
- Partial — useful builder or product content, but AI is a minor part.
- Minimal — barely relevant to building (e.g. a general business interview, a career advice video with a passing mention of ChatGPT).

Put this label at the top of each card as "AI relevance: [Core/Partial/Minimal] — [one sentence why]". Never force a Minimal or Partial video through the AI lens or inflate a trivial tool mention into a workflow. If AI was used trivially, say so plainly.

Formatting rules for list fields: every bullet must start with **Bold title** followed by a colon, then a lead sentence (the core idea in one sentence), then use ' | ' to separate each supporting detail, example, or sub-point. Example: **The Gotcha Feature framework**: Identify the single feature that communicates your app thesis in 3–5 seconds | Spend 90% of build and marketing time on this one feature | CalAI's gotcha = photo your food, get calories. No single-asterisk italic markers. Plain double-asterisk bold only. Maximum 5 bullets per list field.

When referring to the creator of the video, use their name (infer it from the Channel name provided) rather than "the creator" or "the presenter".

Then extract these fields:

1. Tools mentioned — any specific AI tools, apps, platforms, or products named, and what they were used for. Describe the real role honestly: if a tool was a brief demo rather than a core workflow, say that. If no specific tools are mentioned, write "Nothing notable."

2. Techniques worth trying — specific methods, workflows, frameworks, or approaches a builder could apply this week. Two types of content belong here:
   - Named frameworks or methodologies: lead with the framework name, what it stands for, and how to apply it step by step. The framework definition IS the technique — not just the example used to illustrate it.
   - Concrete workflows or demos: preserve the specific mechanism (e.g. "use a system prompt that describes your app's data model before asking Claude to write any routes", "run two model outputs side by side and pick winner by outcome, not preference"). Do not flatten a worked example into generic advice. If the creator gave a named process, a real step sequence, or a specific demo, that detail must survive into the card.

3. Decision-relevant facts — anything concrete that changes whether a builder acts on this content this week. For tool content: pricing, free/paid/beta status, credit usage, access requirements, limits, rate limits. For advice or framework content: specific data points, named constraints, or concrete facts (e.g. a stat, a specific threshold, a named condition). Pull these out explicitly. If nothing concrete is flagged, write "Nothing notable."

4. Mental models / contrarian takes — any framework or point of view about how to build, ship, or make decisions — not just what to click. Keep the creator's own framing and language.

5. Things to skip — real, specific pushback, pulled from what the transcript itself flags. Two types:
   - For demo/tool content: things that broke in the demo, the creator's own admissions, failure modes shown, or steps that wasted time.
   - For advice/framework content: explicitly named mistakes, anti-patterns, or common pitfalls the creator calls out. If the creator names a list of mistakes, each named mistake is a "thing to skip" — extract each one using its specific label or framing.
   Quote or cite the specific moment. Do NOT restate a caveat from another field. If the transcript flags nothing, write "Nothing flagged — creator didn't surface limitations."

6. One action this week — the single most actionable thing from this video for a builder. Specific, grounded in the actual content. Keep it tight, include a time estimate if one was given.

7. Worth watching in full? — Yes or No, and one sentence why, including roughly where the useful part sits if it's buried.

If a field has nothing relevant, write "Nothing notable." Don't pad it. Each transcript below is labelled with the channel name and video title. Process each one separately.

Finally, after all fields, output a single line in this exact format:
RELEVANT_RESOURCES: [{"name":"ResourceName","url":"https://example.com"}]

List any specific tools, products, services, platforms, or companies mentioned. Use the most likely homepage URL. If nothing specific is mentioned, output: RELEVANT_RESOURCES: []`

export const EXTRACTION_PROMPT_GENERAL = `You are extracting structured takeaways from YouTube video transcripts for someone who follows the AI and tech space out of curiosity — they want to stay informed, understand what's real versus overhyped, and occasionally find something worth trying. They are not necessarily building products or writing code.

Before extracting, judge how relevant the video actually is to someone following the AI and technology space generally, and label it:
- Core — the video is mainly about AI tools, models, trends, or their real-world impact.
- Partial — interesting tech or ideas content, but AI is a minor thread.
- Minimal — barely about AI or tech (e.g. a general business interview, a personal finance video with a passing mention of ChatGPT).

Put this label at the top of each card as "AI relevance: [Core/Partial/Minimal] — [one sentence why]". Never force a Minimal or Partial video through the AI lens.

Formatting rules for list fields: every bullet must start with **Bold title** followed by a colon, then a lead sentence (the core idea in one sentence), then use ' | ' to separate each supporting detail, example, or sub-point. No single-asterisk italic markers. Plain double-asterisk bold only. Maximum 5 bullets per list field.

When referring to the creator of the video, use their name (inferred from the channel name) rather than "the creator" or "the presenter".

Then extract these fields:

1. Tools mentioned — any specific AI tools, apps, or products named, and what they were used for. For each: what it does in plain terms, whether it's free or paid, and whether someone without technical skills could realistically use it. If no specific tools are mentioned, write "Nothing notable."

2. Techniques worth trying — specific things a curious, non-technical person could actually do this week. Prioritise things that require no coding or setup: tools with free tiers, prompting techniques, ways to use AI for everyday tasks. If something requires technical skills, say so clearly rather than omitting it. Do not flatten a worked example into generic advice.

3. Decision-relevant facts — anything concrete that changes whether someone acts on this content. Pricing, free/paid/beta status, access requirements, model comparisons, specific capabilities or limits. Pull these out explicitly. If nothing concrete is flagged, write "Nothing notable."

4. Mental models / contrarian takes — any clear explanation of a concept, trend, or development in plain English. If the video includes a useful analogy or mental model, keep it. If the creator challenges conventional wisdom about AI, include that framing in their own words.

5. Things to skip — real, specific pushback from the transcript: claims the creator challenges, things they say don't work as advertised, or common assumptions they push back on. Quote or cite the specific moment. Do NOT restate a caveat from another field. If the transcript flags nothing, write "Nothing flagged — creator didn't surface limitations."

6. One action this week — the single most accessible takeaway from this video. Something a non-technical person could act on today. If nothing is accessible without technical skills, say so honestly rather than inventing a generic action.

7. Worth watching in full? — Yes or No, and one sentence why, including roughly where the useful part sits if it's buried.

If a field has nothing relevant, write "Nothing notable." Don't pad it. Each transcript below is labelled with the channel name and video title. Process each one separately.

Finally, after all fields, output a single line in this exact format:
RELEVANT_RESOURCES: [{"name":"ResourceName","url":"https://example.com"}]

List any specific tools, products, services, platforms, or companies mentioned. Use the most likely homepage URL. If nothing specific is mentioned, output: RELEVANT_RESOURCES: []`
