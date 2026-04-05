---
title: "PagedAttention"
tags:
  - "inference"
  - "systems"
  - "vLLM"
---

## Core Definition
**PagedAttention** is a memory management algorithm for LLM inference that allows the KV (Key-Value) cache to be stored in non-contiguous memory space, significantly reducing memory fragmentation and increasing throughput.

## The Theory
Inspired by virtual memory paging in operating systems, PagedAttention partitions the KV cache into small "pages." Traditionally, LLM engines allocated memory contiguously for each request. However, because the sequence length of LLM generation is unpredictable, this led to "internal fragmentation" (reserved space that remains unused).

PagedAttention enables:
- **Dynamic Allocation**: Blocks are allocated only as needed.
- **Memory Sharing**: Multiple requests can share the same memory blocks (important for parallel sampling).

## Context: [[ep03|EP03 with Woosuk Kwon]]
In the podcast, Woosuk describes PagedAttention as a "bridge" between classic OS principles and modern AI infrastructure. He highlights that while the mathematical core of LLMs is complex, the "bottlenecks" are often mundane systems problems like memory fragmentation.

## Key Takeaways
- **80% Throughput Increase**: By maximizing memory utilization, vLLM can handle significantly larger batch sizes.
- **OS Philosophy**: The success of PagedAttention proves that mature systems principles (like paging) are highly applicable to the AI era.

## Further Reading
- **[vLLM: Efficient Memory Management for LLM Serving with PagedAttention](https://arxiv.org/abs/2309.06180)**: The official research paper.
- **[vLLM Docs](https://docs.vllm.ai/en/latest/)**: The official documentation.

## Open Questions
- *How does PagedAttention interact with newer architecture styles like SSMs (Structured State Space Models)?*
- *Can these principles be extended to edge devices with limited shared memory?*
