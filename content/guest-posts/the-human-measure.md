---
title: 'The Human Measure: AI Needs Personalization Beyond "One-Size-Fits-All"'
date: 2026-05-17
author: "CongJie Pan"
authorUrl: "https://congjie-pan.github.io/"
coverImage: "/static/guest-posts/the-human-measure/hero.png"
guestOffset: 1.275
tags:
  - "CongJie Pan"
---

![Hero illustration](/static/guest-posts/the-human-measure/hero.png)

> As the ancient Greek philosopher Protagoras once stated, "Man is the measure of all things." In today's era of rapid AI advancement, this quote reminds us that the true value of technology needs to be measured by how well it connects with real human needs and everyday situations.

Have you ever thought about this question: Why do modern Large Language Models (LLMs) often sound the same, and why do their answers usually stay within a similar "safe zone"?

One key reason is that, before they are released, these models go through strict safety training called "alignment." As shown in foundational reports from top AI labs like Anthropic, models are usually trained to follow the HHH rules: being Helpful, Honest, and Harmless ([Askell et al., 2021](https://arxiv.org/abs/2112.00861)). But this "one-size-fits-all" method has also created a new problem: many models now sound almost identical.

Therefore, this raises an important question: Do these heavily filtered answers really match our diverse and complex needs? When AI lacks personalization and cannot adapt to different users' backgrounds, it unintentionally flattens the many viewpoints and values that exist in the real world.

Based on this "one-size-fits-all" problem, AI product design can focus on Personalization. This is not just about making users happy; it is about helping AI genuinely support human thinking to achieve true "Augmentation" — using technology to complement and enhance human capabilities, rather than simply automating tasks away ([Shao et al., 2025](https://arxiv.org/abs/2506.06576)).

## 1. Style-level Personalization is the First Step

This is the basic level. AI systems need to be flexible in how they talk. They need to adjust their tone, length, and format based on the user's habits. This makes communication much smoother and stops the AI from always giving long lectures.

For example, imagine a business manager and a creative designer both ask an AI, "How should we promote this new product?" The AI can answer them differently. For the manager, it gives a short, data-focused summary, such as:

> Strategy overview:
>
> 1. Target audience: ages 25-40.
> 2. Budget: allocate 70% to social media ads.
> 3. Goal: a 15% increase in Q3 sales.

But for the designer, the AI switches to an inspiring, storytelling style to spark new ideas, responding with:

> Imagine a campaign centered around the feeling of freedom. We can tell a visual story of a traveler using our product to connect with nature at sunset, paired with the tagline: 'Unleash your journey.'

![Style-level personalization](/static/guest-posts/the-human-measure/style-personalization.png)

While this kind of stylistic adaptation makes daily communication much more pleasant, adjusting the outer packaging of an answer is only the first step. To genuinely help a user think and work, the AI needs to overcome what researchers call the "inversion problem". Often, algorithms merely predict surface-level behavior — like how a user prefers to be spoken to — but fail to infer the deeper mental states, such as what the user actually knows, values, and needs. Bridging this gap requires moving beyond interaction style and building true User Modeling ([Kleinberg et al., 2024](https://doi.org/10.1177/17456916231212138)).

## 2. True Augmentation Requires Deep User Modeling

As discussed in [[ep01|Episode 01]] of The Augmented Mind podcast with Omar Shaikh, real personalization goes much deeper than just changing the tone. In the podcast, Omar pointed out how tiring it is that we constantly have to give the AI background information every time we ask for help. He noted: _"It's really impossible to take all of your rich context and turn it into a single text prompt."_

To fix this issue (the "grounding gap"), a General User Model slowly builds a deep understanding of a user's goals, background, and work habits. It does this by observing everyday actions, like the files a person works on or the meetings they attend. Instead of starting from zero every time, the AI becomes a partner that already understands you.

For example, imagine an AI tutor for a literature class reading _To Kill a Mockingbird_. The AI guides students based on their reading levels. If a beginner sees old 1930s slang, the AI knows they might struggle and quickly explains the words. But for advanced literature students, the AI won't just give a basic plot summary. Instead, it explores the deeper meanings of the book and helps the student debate difficult moral questions.

![Deep user modeling](/static/guest-posts/the-human-measure/user-modeling.png)

At the same time, building such a deep model of a person is not only a technical challenge; it also raises humanity questions about privacy, comfort, and control. In education, for example, students and teachers need to agree on simple but important rules:

- How much of a learner's on-screen behavior is the system allowed to watch?
- Are these "AI guesses" about the student only for the system, or can teachers and parents see them too?
- Can the student say, "This is wrong, please change or delete it"?

User Modeling can only work in the long run if people feel that the system is clearly on their side, and that they can see, question, and adjust what the system learns about them. And these expectations are not the same everywhere — different cultures, schools, and communities will draw these lines very differently. That naturally leads to a group-level question: whose values should the AI respect?

## 3. Pluralistic Alignment: Respecting Diverse Cultural Values

![Pluralistic alignment](/static/guest-posts/the-human-measure/pluralistic-alignment.png)

Finally, AI needs to handle not just different people, but also different cultures and communities. Right now, the safety rules and alignment of most AI models are heavily shaped by Western viewpoints, which often leads to cultural bias and the flattening of non-Western norms ([Tao et al., 2024](https://arxiv.org/abs/2311.14096)). Future models can develop Pluralistic Sensitivity so they can include and respect different voices.

But how does an AI acquire this sensitivity? By extending User Modeling from the individual to the group level. If an AI observes how a specific team communicates — such as noticing who speaks in meetings and how disagreements are resolved — it can infer the community's underlying values.

For example, consider a workplace situation where a team is deciding whether to challenge a manager's decision. In many Western, individualistic cultures, it is often seen as a positive sign when an employee openly shares a different opinion, as long as it is done respectfully.

In many East Asian, more collectivist cultures, however, people may prefer to raise concerns in private or through indirect channels, in order to protect group harmony and avoid putting a manager on the spot in public. An AI without pluralistic sensitivity might always encourage "speaking up directly" as the default "best practice," based purely on Western norms.

An AI with pluralistic sensitivity would recognize these different norms and offer options that fit the local culture — for example, suggesting either a direct 1:1 conversation or a more gradual, relationship-based approach. Instead of pushing a single "correct" answer, it provides multiple paths that align with the values of the community using it.

## Conclusion

Protagoras stated that _"Man is the measure of all things."_ I believe this philosophy serves as the North Star for AI development.

Now that we are in the era of language models and autonomous Agents, it is easy to get lost in massive parameters and cold benchmarks, or to grow accustomed to safe, cookie-cutter answers that lack a soul. Yet, the ultimate purpose of technology has never been to force humanity to adapt to the rigid logic of a machine. On the contrary, technology needs to learn to look closely at every specific, real human being.

From personalizing the surface of our interactions, to building deep "User Models" that understand our context and struggles, to achieving "Pluralistic Alignment" that respects cultural boundaries — all these efforts share one goal: to make AI not just a fast tool, but a companion that knows how to listen. It needs to understand that in some cultures, indirectness is a way to preserve harmony; and in some classrooms, a gentle hint is far more valuable than a complete answer.

If we want these powerful models to be not only intelligent but also trusted, we need to leave room for humanity in every step of their design. When an AI system learns to measure the world by our contexts, our vulnerabilities, and our values, it truly puts the "human" back at the center of technology. In doing so, it no longer threatens our independence, but becomes a vessel that expands our minds — making humanity the true measure of artificial intelligence.

---

## Related episode

- [[ep01|EP01: Bridging Human-AI Grounding Gaps with Omar Shaikh]]

## References

- Askell, A., et al. (2021). [A General Language Assistant as a Laboratory for Alignment](https://arxiv.org/abs/2112.00861). arXiv.
- Kleinberg, J., Ludwig, J., Mullainathan, S., & Raghavan, M. (2024). [The inversion problem: Why algorithms should infer mental state and not just predict behavior](https://doi.org/10.1177/17456916231212138). Perspectives on Psychological Science.
- Shao, Y., et al. (2025). [Future of Work with AI Agents](https://arxiv.org/abs/2506.06576). arXiv.
- Tao, Y., Viberg, O., Baker, R. S., & Kizilcec, R. F. (2024). [Cultural bias and cultural alignment of large language models](https://doi.org/10.1093/pnasnexus/pgae346). PNAS Nexus, 3(9), pgae346.

---

_This guest post was contributed by [CongJie Pan](https://congjie-pan.github.io/) and originally shared in our [GitHub Discussions](https://github.com/orgs/augmented-mind/discussions/46)._
